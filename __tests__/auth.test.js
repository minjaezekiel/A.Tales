/**
 * Anonymous Tales - Authentication Tests
 * Tests for JWT token generation, verification, and authentication middleware
 */

const request = require('supertest');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const app = require('../server').app;
const User = require('../models/userModel');
const { generateToken, verifyToken } = require('../middleware/authMiddleware');

describe('Authentication', () => {
    describe('JWT Token Generation', () => {
        it('should generate a valid JWT token', () => {
            const payload = {
                id: '123e4567-e89b-12d3-a456-426614174000',
                email: 'test@example.com',
                username: 'testuser'
            };

            const token = generateToken(payload);
            expect(token).toBeTruthy();
            expect(typeof token).toBe('string');

            // Verify the token can be decoded
            const decoded = jwt.decode(token);
            expect(decoded.id).toBe(payload.id);
            expect(decoded.email).toBe(payload.email);
            expect(decoded.username).toBe(payload.username);
        });

        it('should generate token with expiration', () => {
            const payload = { id: 'test-id', email: 'test@example.com' };
            const token = generateToken(payload);
            const decoded = jwt.decode(token);

            expect(decoded.exp).toBeDefined();
            expect(decoded.iat).toBeDefined();
        });
    });

    describe('JWT Token Verification', () => {
        it('should verify a valid token', () => {
            const payload = { id: 'test-id', email: 'test@example.com' };
            const token = generateToken(payload);
            
            const decoded = verifyToken(token);
            expect(decoded.id).toBe(payload.id);
            expect(decoded.email).toBe(payload.email);
        });

        it('should throw error for invalid token', () => {
            expect(() => {
                verifyToken('invalid-token');
            }).toThrow();
        });

        it('should throw error for tampered token', () => {
            const payload = { id: 'test-id', email: 'test@example.com' };
            const token = generateToken(payload);
            const tamperedToken = token.slice(0, -5) + 'XXXXX';

            expect(() => {
                verifyToken(tamperedToken);
            }).toThrow();
        });
    });

    describe('Login Endpoint', () => {
        beforeEach(async () => {
            await User.destroy({ where: {}, force: true });
        });

        it('should login with valid credentials', async () => {
            // Create verified user
            const hashedPassword = await bcrypt.hash('Test@123456', 10);
            await User.create({
                username: 'logintest',
                email: 'login@example.com',
                password: hashedPassword,
                gender: 'male',
                isVerified: true,
                isActive: true
            });

            const response = await request(app)
                .post('/login')
                .send({
                    email: 'login@example.com',
                    password: 'Test@123456'
                })
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.token).toBeTruthy();
            expect(response.body.data.user).toBeDefined();
            expect(response.body.data.user.email).toBe('login@example.com');
            expect(response.body.data.user.password).toBeUndefined();
        });

        it('should reject login with invalid password', async () => {
            // Create verified user
            const hashedPassword = await bcrypt.hash('Test@123456', 10);
            await User.create({
                username: 'logintest',
                email: 'login@example.com',
                password: hashedPassword,
                gender: 'male',
                isVerified: true,
                isActive: true
            });

            const response = await request(app)
                .post('/login')
                .send({
                    email: 'login@example.com',
                    password: 'WrongPassword123'
                })
                .expect(401);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('Invalid');
        });

        it('should reject login for non-existent user', async () => {
            const response = await request(app)
                .post('/login')
                .send({
                    email: 'nonexistent@example.com',
                    password: 'Test@123456'
                })
                .expect(401);

            expect(response.body.success).toBe(false);
        });

        it('should reject login for unverified email', async () => {
            const hashedPassword = await bcrypt.hash('Test@123456', 10);
            await User.create({
                username: 'unverified',
                email: 'unverified@example.com',
                password: hashedPassword,
                gender: 'female',
                isVerified: false,
                isActive: true
            });

            const response = await request(app)
                .post('/login')
                .send({
                    email: 'unverified@example.com',
                    password: 'Test@123456'
                })
                .expect(403);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('verify your email');
        });

        it('should reject login for deactivated account', async () => {
            const hashedPassword = await bcrypt.hash('Test@123456', 10);
            await User.create({
                username: 'deactivated',
                email: 'deactivated@example.com',
                password: hashedPassword,
                gender: 'other',
                isVerified: true,
                isActive: false
            });

            const response = await request(app)
                .post('/login')
                .send({
                    email: 'deactivated@example.com',
                    password: 'Test@123456'
                })
                .expect(403);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('deactivated');
        });

        it('should update lastLoginAt on successful login', async () => {
            const hashedPassword = await bcrypt.hash('Test@123456', 10);
            const user = await User.create({
                username: 'lastlogin',
                email: 'lastlogin@example.com',
                password: hashedPassword,
                gender: 'male',
                isVerified: true,
                isActive: true
            });

            expect(user.lastLoginAt).toBeNull();

            await request(app)
                .post('/login')
                .send({
                    email: 'lastlogin@example.com',
                    password: 'Test@123456'
                })
                .expect(200);

            const updatedUser = await User.findByPk(user.id);
            expect(updatedUser.lastLoginAt).toBeTruthy();
        });
    });

    describe('Protected Routes', () => {
        let authToken;

        beforeEach(async () => {
            await User.destroy({ where: {}, force: true });
            
            const hashedPassword = await bcrypt.hash('Test@123456', 10);
            await User.create({
                username: 'protected',
                email: 'protected@example.com',
                password: hashedPassword,
                gender: 'female',
                isVerified: true,
                isActive: true
            });

            const loginResponse = await request(app)
                .post('/login')
                .send({
                    email: 'protected@example.com',
                    password: 'Test@123456'
                });

            authToken = loginResponse.body.data.token;
        });

        it('should access protected route with valid token', async () => {
            const response = await request(app)
                .get('/users')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
        });

        it('should reject access without token', async () => {
            const response = await request(app)
                .get('/users')
                .expect(401);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('No token provided');
        });

        it('should reject access with invalid token format', async () => {
            const response = await request(app)
                .get('/users')
                .set('Authorization', 'InvalidFormat')
                .expect(401);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('Invalid token format');
        });

        it('should reject access with expired token', async () => {
            // Create an expired token
            const expiredToken = jwt.sign(
                { id: 'test', email: 'test@example.com' },
                process.env.JWT_SECRET || 'test-secret',
                { expiresIn: '-1h' }
            );

            const response = await request(app)
                .get('/users')
                .set('Authorization', `Bearer ${expiredToken}`)
                .expect(401);

            expect(response.body.success).toBe(false);
            expect(response.body.errorCode).toBe('TOKEN_EXPIRED');
        });
    });

    describe('Rate Limiting', () => {
        it('should limit login attempts', async () => {
            // Make 6 failed login attempts (limit is 5)
            for (let i = 0; i < 6; i++) {
                const response = await request(app)
                    .post('/login')
                    .send({
                        email: 'test@example.com',
                        password: 'wrongpassword'
                    });

                if (i < 5) {
                    expect(response.status).toBe(401);
                } else {
                    expect(response.status).toBe(429);
                    expect(response.body.message).toContain('Too many');
                }
            }
        });
    });
});