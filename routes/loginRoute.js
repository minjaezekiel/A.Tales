/**
 * Anonymous Tales - Login Route
 * Handles user authentication with secure JWT token generation
 * 
 * Security Features:
 * - Rate limiting to prevent brute force attacks
 * - Input validation and sanitization
 * - Proper password comparison with bcrypt
 * - Secure JWT token with environment-based secret
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/userModel');
const { logger } = require('../utils/logger');
const { AppError, asyncHandler } = require('../middleware/errorMiddleware');
const { authLimiter } = require('../middleware/rateLimitMiddleware');
const { validateLogin } = require('../middleware/validationMiddleware');
const { generateToken } = require('../middleware/authMiddleware');

/**
 * POST /login
 * Authenticate user and return JWT token
 * Protected with rate limiting to prevent brute force
 */
router.post(
    '/',
    authLimiter,           // Rate limiting: 5 attempts per 15 minutes
    validateLogin,         // Input validation
    asyncHandler(async (req, res) => {
        const { email, password } = req.body;
        
        logger.info('Login attempt', { email: '[REDACTED]' });
        
        // Find user by email (including password for comparison)
        const user = await User.scope('withSensitive').findOne({
            where: { email }
        });
        
        // Generic error message to prevent user enumeration
        if (!user) {
            logger.warn('Login failed: User not found', { email: '[REDACTED]' });
            throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
        }
        
        // Check if account is active
        if (!user.isActive) {
            logger.warn('Login failed: Account deactivated', { 
                userId: user.id,
                email: '[REDACTED]'
            });
            throw new AppError('Account has been deactivated. Please contact support.', 403, 'ACCOUNT_INACTIVE');
        }
        
        // Check if email is verified
        if (!user.isVerified) {
            logger.warn('Login failed: Email not verified', { 
                userId: user.id,
                email: '[REDACTED]'
            });
            throw new AppError('Please verify your email before logging in.', 403, 'EMAIL_NOT_VERIFIED');
        }
        
        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        
        if (!isPasswordValid) {
            logger.warn('Login failed: Invalid password', { 
                userId: user.id,
                email: '[REDACTED]'
            });
            throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
        }
        
        // Update last login timestamp
        user.lastLoginAt = new Date();
        await user.save();
        
        // Generate JWT token
        const token = generateToken({
            id: user.id,
            email: user.email,
            username: user.username,
            gender: user.gender,
            isAdmin: user.isAdmin,
            isStaff: user.isStaff
        });
        
        logger.info('Login successful', { 
            userId: user.id,
            username: user.username
        });
        
        // Return success response
        res.status(200).json({
            success: true,
            message: 'Login successful',
            data: {
                token,
                user: {
                    id: user.id,
                    username: user.username,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    email: user.email,
                    gender: user.gender,
                    isAdmin: user.isAdmin,
                    isStaff: user.isStaff,
                    isVerified: user.isVerified,
                    lastLoginAt: user.lastLoginAt
                }
            }
        });
    })
);

module.exports = router;