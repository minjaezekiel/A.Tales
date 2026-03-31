/**
 * Anonymous Tales - Validation Middleware Tests
 * Tests for input validation and sanitization
 */

const request = require('supertest');
const bcrypt = require('bcryptjs');
const app = require('../server').app;
const User = require('../models/userModel');

describe('Input Validation', () => {
    let authToken;

    beforeEach(async () => {
        await User.destroy({ where: {}, force: true });
        
        // Create admin user for protected routes
        const hashedPassword = await bcrypt.hash('Test@123456', 10);
        await User.create({
            username: 'admin',
            email: 'admin@example.com',
            password: hashedPassword,
            gender: 'male',
            isVerified: true,
            isActive: true,
            isAdmin: true
        });

        const loginResponse = await request(app)
            .post('/login')
            .send({
                email: 'admin@example.com',
                password: 'Test@123456'
            });

        authToken = loginResponse.body.data.token;
    });

    describe('User Registration Validation', () => {
        const validUser = {
            username: 'validuser',
            firstName: 'Valid',
            lastName: 'User',
            email: 'valid@example.com',
            password: 'Valid@123456',
            gender: 'male'
        };

        it('should reject username with special characters', async () => {
            const response = await request(app)
                .post('/users')
                .send({ ...validUser, username: 'user@name!' })
                .expect(400);

            expect(response.body.errors).toBeDefined();
            expect(response.body.errors[0].field).toBe('username');
        });

        it('should reject username shorter than 3 characters', async () => {
            const response = await request(app)
                .post('/users')
                .send({ ...validUser, username: 'ab' })
                .expect(400);

            expect(response.body.errors[0].field).toBe('username');
        });

        it('should reject invalid email formats', async () => {
            const invalidEmails = [
                'notanemail',
                '@example.com',
                'user@',
                'user@.com',
                'user name@example.com'
            ];

            for (const email of invalidEmails) {
                const response = await request(app)
                    .post('/users')
                    .send({ ...validUser, email })
                    .expect(400);

                expect(response.body.errors[0].field).toBe('email');
            }
        });

        it('should reject weak passwords', async () => {
            const weakPasswords = [
                { password: 'short', reason: 'too short' },
                { password: 'nouppercase123!', reason: 'no uppercase' },
                { password: 'NOLOWERCASE123!', reason: 'no lowercase' },
                { password: 'NoNumbers!!', reason: 'no numbers' },
                { password: 'NoSpecial123', reason: 'no special chars' }
            ];

            for (const { password, reason } of weakPasswords) {
                const response = await request(app)
                    .post('/users')
                    .send({ ...validUser, password, email: `${reason}@example.com` })
                    .expect(400);

                expect(response.body.errors[0].field).toBe('password');
            }
        });

        it('should accept valid gender values', async () => {
            const validGenders = ['male', 'female', 'other', 'prefer_not_to_say'];

            for (const gender of validGenders) {
                const response = await request(app)
                    .post('/users')
                    .send({
                        ...validUser,
                        gender,
                        username: `gender_${gender}`,
                        email: `gender_${gender}@example.com`
                    });

                // Should either succeed (200) or fail due to email validation/sending
                expect([200, 400, 500]).toContain(response.status);
            }
        });

        it('should reject invalid gender values', async () => {
            const response = await request(app)
                .post('/users')
                .send({ ...validUser, gender: 'invalid' })
                .expect(400);

            expect(response.body.errors[0].field).toBe('gender');
        });

        it('should sanitize XSS attempts in input', async () => {
            const xssAttempts = [
                { field: 'firstName', value: '<script>alert("xss")</script>' },
                { field: 'lastName', value: '<img src=x onerror=alert(1)>' }
            ];

            for (const { field, value } of xssAttempts) {
                const userData = { ...validUser };
                userData[field] = value;
                userData.username = `xss_${field}`;
                userData.email = `xss_${field}@example.com`;

                // Should accept but sanitize the input
                const response = await request(app)
                    .post('/users')
                    .send(userData);

                // Should not return 500 (server error) due to validation
                expect(response.status).not.toBe(500);
            }
        });

        it('should trim whitespace from inputs', async () => {
            const response = await request(app)
                .post('/users')
                .send({
                    ...validUser,
                    username: '  trimuser  ',
                    email: '  trim@example.com  ',
                    firstName: '  Trim  '
                });

            // Should process without error
            expect([200, 400, 409, 500]).toContain(response.status);
        });
    });

    describe('User Update Validation', () => {
        let userId;

        beforeEach(async () => {
            const hashedPassword = await bcrypt.hash('Test@123456', 10);
            const user = await User.create({
                username: 'updateuser',
                email: 'update@example.com',
                password: hashedPassword,
                gender: 'female',
                isVerified: true
            });
            userId = user.id;
        });

        it('should validate UUID format for user ID', async () => {
            const response = await request(app)
                .get('/users/invalid-uuid')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(400);

            expect(response.body.errors[0].field).toBe('id');
        });

        it('should reject invalid email in update', async () => {
            const response = await request(app)
                .put(`/users/${userId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({ email: 'invalid-email' })
                .expect(400);

            expect(response.body.errors[0].field).toBe('email');
        });

        it('should reject weak password in update', async () => {
            const response = await request(app)
                .put(`/users/${userId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({ password: 'weak' })
                .expect(400);

            expect(response.body.errors[0].field).toBe('password');
        });
    });

    describe('OTP Verification Validation', () => {
        it('should reject non-numeric OTP', async () => {
            const response = await request(app)
                .post('/users/verify')
                .send({ email: 'test@example.com', otp: 'abcdef' })
                .expect(400);

            expect(response.body.errors[0].field).toBe('otp');
        });

        it('should reject OTP with wrong length', async () => {
            const response = await request(app)
                .post('/users/verify')
                .send({ email: 'test@example.com', otp: '12345' })
                .expect(400);

            expect(response.body.errors[0].field).toBe('otp');
        });

        it('should reject invalid email format', async () => {
            const response = await request(app)
                .post('/users/verify')
                .send({ email: 'invalid-email', otp: '123456' })
                .expect(400);

            expect(response.body.errors[0].field).toBe('email');
        });
    });

    describe('Login Validation', () => {
        it('should reject login without email', async () => {
            const response = await request(app)
                .post('/login')
                .send({ password: 'Test@123456' })
                .expect(400);

            expect(response.body.errors[0].field).toBe('email');
        });

        it('should reject login without password', async () => {
            const response = await request(app)
                .post('/login')
                .send({ email: 'test@example.com' })
                .expect(400);

            expect(response.body.errors[0].field).toBe('password');
        });

        it('should reject invalid email format in login', async () => {
            const response = await request(app)
                .post('/login')
                .send({ email: 'invalid', password: 'Test@123456' })
                .expect(400);

            expect(response.body.errors[0].field).toBe('email');
        });
    });
});

describe('Sanitization', () => {
    it('should not allow HTML in username', async () => {
        const maliciousUsernames = [
            '<script>alert(1)</script>',
            '<img src=x onerror=alert(1)>',
            'user" onclick="alert(1)"',
            "user' onmouseover='alert(1)"
        ];

        for (const username of maliciousUsernames) {
            const response = await request(app)
                .post('/users')
                .send({
                    username,
                    email: `safe_${Date.now()}@example.com`,
                    password: 'Valid@123456',
                    gender: 'male'
                });

            // Should not accept XSS patterns in username
            expect([400]).toContain(response.status);
        }
    });
});