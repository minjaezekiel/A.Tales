/**
 * Anonymous Tales - User Controller Tests
 * Comprehensive test suite for user registration, OTP verification,
 * and user management functionality.
 */

const request = require('supertest');
const bcrypt = require('bcryptjs');
const app = require('../server').app;
const User = require('../models/userModel');
const OTP = require('../models/otpModel');

// Mock nodemailer to prevent actual emails during tests
jest.mock('nodemailer');
const nodemailer = require('nodemailer');
nodemailer.createTransport.mockReturnValue({
    sendMail: jest.fn().mockResolvedValue({ messageId: 'test-id' })
});

// Test data
const testUser = {
    username: 'testuser',
    firstName: 'Test',
    lastName: 'User',
    email: 'test@example.com',
    password: 'Test@123456',
    gender: 'male'
};

describe('User Controller', () => {
    beforeEach(async () => {
        // Clean up test data before each test
        await OTP.destroy({ where: {}, force: true });
        await User.destroy({ where: {}, force: true });
        jest.clearAllMocks();
    });

    afterAll(async () => {
        // Clean up after all tests
        await OTP.destroy({ where: {}, force: true });
        await User.destroy({ where: {}, force: true });
    });

    // ============================================
    // User Registration Tests
    // ============================================
    describe('POST /users - User Registration', () => {
        it('should send OTP for valid registration data', async () => {
            const response = await request(app)
                .post('/users')
                .send(testUser)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.message).toContain('Verification code sent');
            expect(response.body.data.email).toBe(testUser.email);
            expect(response.body.data.expiresInMinutes).toBe(10);

            // Verify OTP was created in database
            const otpRecord = await OTP.findOne({ where: { email: testUser.email } });
            expect(otpRecord).toBeTruthy();
            expect(otpRecord.isUsed).toBe(false);
        });

        it('should reject registration with invalid email', async () => {
            const invalidUser = { ...testUser, email: 'invalid-email' };
            
            const response = await request(app)
                .post('/users')
                .send(invalidUser)
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.errors).toBeDefined();
        });

        it('should reject registration with weak password', async () => {
            const weakPasswordUser = { ...testUser, password: '123' };
            
            const response = await request(app)
                .post('/users')
                .send(weakPasswordUser)
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.errors).toBeDefined();
        });

        it('should reject registration with duplicate email', async () => {
            // Create a verified user first
            await User.create({
                ...testUser,
                password: await bcrypt.hash(testUser.password, 10),
                isVerified: true
            });

            // Try to register with same email
            const response = await request(app)
                .post('/users')
                .send(testUser)
                .expect(409);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('Email address already registered');
        });

        it('should reject registration with duplicate username', async () => {
            // Create a verified user first
            await User.create({
                ...testUser,
                email: 'other@example.com',
                password: await bcrypt.hash(testUser.password, 10),
                isVerified: true
            });

            // Try to register with same username but different email
            const response = await request(app)
                .post('/users')
                .send({ ...testUser, email: 'new@example.com' })
                .expect(409);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('Username already taken');
        });

        it('should sanitize input data', async () => {
            const userWithXSS = {
                ...testUser,
                email: 'test2@example.com',
                username: 'testuser2',
                firstName: '<script>alert("xss")</script>'
            };

            const response = await request(app)
                .post('/users')
                .send(userWithXSS)
                .expect(200);

            expect(response.body.success).toBe(true);
        });
    });

    // ============================================
    // OTP Verification Tests
    // ============================================
    describe('POST /users/verify - OTP Verification', () => {
        let validOTP;
        let otpRecord;

        beforeEach(async () => {
            // Create a pending OTP record
            validOTP = '123456';
            const hashedOTP = await bcrypt.hash(validOTP, 10);
            
            otpRecord = await OTP.create({
                email: testUser.email,
                otp: hashedOTP,
                userData: testUser,
                expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
                attempts: 0,
                isUsed: false
            });
        });

        it('should create user with valid OTP', async () => {
            const response = await request(app)
                .post('/users/verify')
                .send({ email: testUser.email, otp: validOTP })
                .expect(201);

            expect(response.body.success).toBe(true);
            expect(response.body.message).toContain('Account created successfully');
            expect(response.body.data.username).toBe(testUser.username);
            expect(response.body.data.gender).toBe(testUser.gender);
            expect(response.body.data.email).toBe(testUser.email);

            // Verify user was created in database
            const user = await User.findOne({ where: { email: testUser.email } });
            expect(user).toBeTruthy();
            expect(user.isVerified).toBe(true);
            expect(user.gender).toBe(testUser.gender);

            // Verify OTP was marked as used
            const usedOTP = await OTP.findByPk(otpRecord.id);
            expect(usedOTP.isUsed).toBe(true);
        });

        it('should reject invalid OTP', async () => {
            const response = await request(app)
                .post('/users/verify')
                .send({ email: testUser.email, otp: '000000' })
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('Invalid verification code');
        });

        it('should reject expired OTP', async () => {
            // Update OTP to be expired
            await otpRecord.update({ expiresAt: new Date(Date.now() - 1000) });

            const response = await request(app)
                .post('/users/verify')
                .send({ email: testUser.email, otp: validOTP })
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('expired');
        });

        it('should lock out after 3 failed attempts', async () => {
            // First two failed attempts
            await request(app)
                .post('/users/verify')
                .send({ email: testUser.email, otp: '111111' })
                .expect(400);

            await request(app)
                .post('/users/verify')
                .send({ email: testUser.email, otp: '222222' })
                .expect(400);

            // Third failed attempt should lock out
            const response = await request(app)
                .post('/users/verify')
                .send({ email: testUser.email, otp: '333333' })
                .expect(400);

            expect(response.body.message).toContain('Too many failed attempts');

            // Even correct OTP should fail after lockout
            const finalResponse = await request(app)
                .post('/users/verify')
                .send({ email: testUser.email, otp: validOTP })
                .expect(400);

            expect(finalResponse.body.message).toContain('Too many failed attempts');
        });

        it('should show remaining attempts in error message', async () => {
            const response = await request(app)
                .post('/users/verify')
                .send({ email: testUser.email, otp: '000000' })
                .expect(400);

            expect(response.body.message).toContain('2 attempts remaining');
        });
    });

    // ============================================
    // User CRUD Tests
    // ============================================
    describe('User Management', () => {
        let authToken;
        let userId;

        beforeEach(async () => {
            // Create a verified user and get auth token
            const hashedPassword = await bcrypt.hash('Test@123456', 10);
            const user = await User.create({
                username: 'crudtest',
                email: 'crud@example.com',
                password: hashedPassword,
                gender: 'female',
                isVerified: true,
                isActive: true
            });
            userId = user.id;

            // Login to get token
            const loginResponse = await request(app)
                .post('/login')
                .send({ email: 'crud@example.com', password: 'Test@123456' });
            
            authToken = loginResponse.body.data.token;
        });

        it('should get all users with pagination', async () => {
            const response = await request(app)
                .get('/users')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toBeDefined();
            expect(response.body.pagination).toBeDefined();
            expect(response.body.pagination.totalPages).toBeDefined();
        });

        it('should get single user by ID', async () => {
            const response = await request(app)
                .get(`/users/${userId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.id).toBe(userId);
            expect(response.body.data.password).toBeUndefined();
        });

        it('should update user with password hashing', async () => {
            const newPassword = 'NewPass@123';
            
            const response = await request(app)
                .put(`/users/${userId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({ password: newPassword })
                .expect(200);

            expect(response.body.success).toBe(true);

            // Verify password was hashed (not stored as plaintext)
            const user = await User.scope('withSensitive').findByPk(userId);
            const isMatch = await bcrypt.compare(newPassword, user.password);
            expect(isMatch).toBe(true);
        });

        it('should soft delete user', async () => {
            const response = await request(app)
                .delete(`/users/${userId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.message).toContain('deleted');

            // User should not be findable with default scope
            const user = await User.findByPk(userId);
            expect(user).toBeNull();

            // But should exist with paranoid disabled
            const deletedUser = await User.findByPk(userId, { paranoid: false });
            expect(deletedUser).toBeTruthy();
            expect(deletedUser.deletedAt).toBeTruthy();
        });

        it('should reject access without authentication', async () => {
            await request(app)
                .get('/users')
                .expect(401);
        });
    });

    // ============================================
    // Resend OTP Tests
    // ============================================
    describe('POST /users/resend-otp', () => {
        beforeEach(async () => {
            // Create a pending OTP
            const hashedOTP = await bcrypt.hash('123456', 10);
            await OTP.create({
                email: testUser.email,
                otp: hashedOTP,
                userData: testUser,
                expiresAt: new Date(Date.now() + 10 * 60 * 1000),
                attempts: 2,
                isUsed: false
            });
        });

        it('should resend OTP successfully', async () => {
            const response = await request(app)
                .post('/users/resend-otp')
                .send({ email: testUser.email })
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.message).toContain('New verification code sent');

            // Verify attempts were reset
            const otpRecord = await OTP.findOne({ where: { email: testUser.email } });
            expect(otpRecord.attempts).toBe(0);
        });

        it('should reject resend for non-existent pending OTP', async () => {
            const response = await request(app)
                .post('/users/resend-otp')
                .send({ email: 'nonexistent@example.com' })
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('No pending verification');
        });
    });
});

describe('Gender Feature', () => {
    it('should store and retrieve gender in user model', async () => {
        const genders = ['male', 'female', 'other', 'prefer_not_to_say'];
        
        for (const gender of genders) {
            const user = await User.create({
                username: `gender_${gender}`,
                email: `${gender}@example.com`,
                password: 'hashedpassword',
                gender: gender,
                isVerified: true
            });

            expect(user.gender).toBe(gender);
            
            // Test getAnonymousDisplayName method
            const displayName = user.getAnonymousDisplayName();
            expect(displayName).toContain(user.username);
        }
    });

    it('should provide correct gender indicator symbols', async () => {
        const indicators = {
            male: '♂',
            female: '♀',
            other: '○',
            prefer_not_to_say: '?'
        };

        for (const [gender, symbol] of Object.entries(indicators)) {
            const user = await User.create({
                username: `indicator_${gender}`,
                email: `ind_${gender}@example.com`,
                password: 'hashedpassword',
                gender: gender,
                isVerified: true
            });

            const displayName = user.getAnonymousDisplayName();
            expect(displayName).toContain(symbol);
        }
    });
});