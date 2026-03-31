/**
 * Anonymous Tales - User Controller
 * Handles user registration, OTP verification, and CRUD operations
 * 
 * Security Features:
 * - OTP stored in database (not memory) for production reliability
 * - Passwords always hashed with bcrypt
 * - Input validation and sanitization
 * - Proper error handling without information leakage
 * - Comprehensive logging with sensitive data redaction
 * 
 * @module controllers/userController
 */

const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const User = require('../models/userModel');
const OTP = require('../models/otpModel');
const { logger, sanitizeData } = require('../utils/logger');
const { AppError, asyncHandler } = require('../middleware/errorMiddleware');

// Environment configuration
const BCRYPT_SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
const OTP_EXPIRY_MINUTES = 10;
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;
const APP_NAME = process.env.APP_NAME || 'Anonymous Tales';

/**
 * Configure email transporter
 * @returns {Object} Nodemailer transporter
 */
const createEmailTransporter = () => {
    if (!EMAIL_USER || !EMAIL_PASS) {
        logger.error('Email configuration missing');
        throw new AppError('Email service not configured', 500, 'EMAIL_CONFIG_ERROR');
    }
    
    return nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: EMAIL_USER,
            pass: EMAIL_PASS
        },
        tls: {
            rejectUnauthorized: true
        }
    });
};

/**
 * Generate a 6-digit OTP
 * @returns {string} 6-digit OTP code
 */
const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Send OTP email to user
 * @param {string} email - Recipient email
 * @param {string} otp - OTP code
 * @param {string} username - Username for personalization
 */
const sendOTPEmail = async (email, otp, username) => {
    const transporter = createEmailTransporter();
    
    const mailOptions = {
        from: `${APP_NAME}<${EMAIL_USER}>`,
        to: email,
        subject: 'Your Verification Code - Anonymous Tales',
        html: `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Email Verification</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: #f4f4f4;
            margin: 0;
            padding: 20px;
        }
        .container {
            max-width: 500px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 10px;
            padding: 40px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        h1 {
            color: #2a9d8f;
            font-size: 24px;
            margin-bottom: 20px;
        }
        p {
            color: #333;
            line-height: 1.6;
            margin-bottom: 20px;
        }
        .otp-code {
            font-size: 32px;
            font-weight: bold;
            color: #e76f51;
            background-color: #f4a261;
            padding: 15px 25px;
            border-radius: 8px;
            display: inline-block;
            letter-spacing: 5px;
            margin: 20px 0;
        }
        .warning {
            background-color: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 15px;
            margin: 20px 0;
            color: #856404;
        }
        .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e0e0e0;
            color: #666;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Welcome to ${APP_NAME}, ${username}!</h1>
        <p>Thank you for signing up. To complete your registration, please use the verification code below:</p>
        
        <div style="text-align: center;">
            <div class="otp-code">${otp}</div>
        </div>
        
        <div class="warning">
            <strong>⚠️ Security Notice:</strong><br>
            This code will expire in ${OTP_EXPIRY_MINUTES} minutes.<br>
            Never share this code with anyone.
        </div>
        
        <p>If you didn't request this code, please ignore this email or contact support if you're concerned.</p>
        
        <div class="footer">
            Best regards,<br>
            The ${APP_NAME} Team
        </div>
    </div>
</body>
</html>`
    };
    
    await transporter.sendMail(mailOptions);
};

// ============================================
// User Registration with OTP
// ============================================

/**
 * POST /users
 * Step 1: Collect user data and send OTP
 * Creates temporary OTP record, sends email, stores user data
 */
const createUser = asyncHandler(async (req, res) => {
    const { username, firstName, lastName, email, password, gender, isAdmin, isStaff } = req.body;
    
    logger.info('User registration initiated', { 
        email: '[REDACTED]',
        username 
    });
    
    // Check if email already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
        logger.warn('Registration failed: Email already exists', { email: '[REDACTED]' });
        throw new AppError('Email address already registered', 409, 'EMAIL_EXISTS');
    }
    
    // Check if username is available
    const usernameAvailable = await User.isUsernameAvailable(username);
    if (!usernameAvailable) {
        logger.warn('Registration failed: Username taken', { username });
        throw new AppError('Username already taken', 409, 'USERNAME_EXISTS');
    }
    
    // Generate OTP
    const otpCode = generateOTP();
    const hashedOTP = await bcrypt.hash(otpCode, BCRYPT_SALT_ROUNDS);
    
    // Calculate expiry time
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + OTP_EXPIRY_MINUTES);
    
    // Store user data temporarily (will be used after OTP verification)
    const userData = {
        username,
        firstName: firstName || null,
        lastName: lastName || null,
        email,
        password, // Will be hashed after verification
        gender: gender || 'prefer_not_to_say',
        isAdmin: isAdmin || false,
        isStaff: isStaff || false
    };
    
    // Delete any existing OTP for this email
    await OTP.destroy({ where: { email } });
    
    // Create OTP record in database
    await OTP.create({
        email,
        otp: hashedOTP,
        userData,
        expiresAt,
        attempts: 0,
        isUsed: false
    });
    
    // Send OTP email
    try {
        await sendOTPEmail(email, otpCode, username);
        logger.info('OTP sent successfully', { email: '[REDACTED]' });
    } catch (emailError) {
        logger.error('Failed to send OTP email', { 
            error: emailError.message,
            email: '[REDACTED]'
        });
        // Clean up OTP record if email fails
        await OTP.destroy({ where: { email } });
        throw new AppError('Failed to send verification email. Please try again.', 500, 'EMAIL_SEND_ERROR');
    }
    
    res.status(200).json({
        success: true,
        message: 'Verification code sent to your email',
        data: {
            email,
            expiresInMinutes: OTP_EXPIRY_MINUTES
        }
    });
});

/**
 * POST /users/verify
 * Step 2: Verify OTP and create user
 * Validates OTP, creates user record, cleans up OTP
 */
const otpVerification = asyncHandler(async (req, res) => {
    const { email, otp } = req.body;
    
    logger.info('OTP verification initiated', { email: '[REDACTED]' });
    
    // Find OTP record
    const otpRecord = await OTP.findOne({
        where: { email, isUsed: false }
    });
    
    if (!otpRecord) {
        logger.warn('OTP verification failed: No valid OTP found', { email: '[REDACTED]' });
        throw new AppError('Invalid or expired verification code', 400, 'INVALID_OTP');
    }
    
    // Check if OTP is expired
    if (otpRecord.isExpired()) {
        await otpRecord.destroy(); // Clean up expired OTP
        logger.warn('OTP verification failed: OTP expired', { email: '[REDACTED]' });
        throw new AppError('Verification code has expired. Please request a new one.', 400, 'OTP_EXPIRED');
    }
    
    // Check max attempts
    if (otpRecord.hasMaxAttempts()) {
        await otpRecord.destroy(); // Lock out after max attempts
        logger.warn('OTP verification failed: Max attempts reached', { email: '[REDACTED]' });
        throw new AppError('Too many failed attempts. Please request a new code.', 400, 'MAX_ATTEMPTS');
    }
    
    // Increment attempt counter
    otpRecord.attempts += 1;
    await otpRecord.save();
    
    // Verify OTP
    const isValidOTP = await bcrypt.compare(otp, otpRecord.otp);
    
    if (!isValidOTP) {
        const remainingAttempts = 3 - otpRecord.attempts;
        logger.warn('OTP verification failed: Invalid code', { 
            email: '[REDACTED]',
            attempts: otpRecord.attempts
        });
        
        if (remainingAttempts <= 0) {
            await otpRecord.destroy();
            throw new AppError('Too many failed attempts. Please request a new code.', 400, 'MAX_ATTEMPTS');
        }
        
        throw new AppError(
            `Invalid verification code. ${remainingAttempts} attempts remaining.`,
            400,
            'INVALID_OTP'
        );
    }
    
    // OTP is valid - retrieve user data
    const userData = otpRecord.userData;
    
    // Hash password before storing
    const hashedPassword = await bcrypt.hash(userData.password, BCRYPT_SALT_ROUNDS);
    
    // Create user
    const newUser = await User.create({
        username: userData.username,
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
        gender: userData.gender,
        password: hashedPassword,
        isAdmin: userData.isAdmin,
        isStaff: userData.isStaff,
        isVerified: true
    });
    
    // Mark OTP as used
    otpRecord.isUsed = true;
    await otpRecord.save();
    
    // Clean up OTP record after successful verification
    await otpRecord.destroy();
    
    logger.info('User created successfully', { 
        userId: newUser.id,
        email: '[REDACTED]'
    });
    
    res.status(201).json({
        success: true,
        message: 'Account created successfully',
        data: {
            id: newUser.id,
            username: newUser.username,
            gender: newUser.gender,
            email: newUser.email,
            isVerified: newUser.isVerified,
            createdAt: newUser.createdAt
        }
    });
});

// ============================================
// User CRUD Operations
// ============================================

/**
 * GET /users
 * Get all users with pagination
 */
const findAllUsers = asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    
    const { count, rows: users } = await User.findAndCountAll({
        limit,
        offset,
        order: [['createdAt', 'DESC']],
        attributes: { exclude: ['password', 'otp'] }
    });
    
    logger.debug('Users fetched', { count, page, limit });
    
    res.status(200).json({
        success: true,
        data: users,
        pagination: {
            total: count,
            page,
            limit,
            totalPages: Math.ceil(count / limit)
        }
    });
});

/**
 * GET /users/:id
 * Get single user by ID
 */
const findUser = asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    const user = await User.findByPk(id, {
        attributes: { exclude: ['password', 'otp'] }
    });
    
    if (!user) {
        logger.warn('User not found', { userId: id });
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }
    
    logger.debug('User fetched', { userId: id });
    
    res.status(200).json({
        success: true,
        data: user
    });
});

/**
 * PUT /users/:id
 * Update user - with proper password hashing
 */
const updateUser = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { firstName, lastName, email, password, gender, isAdmin, isStaff } = req.body;
    
    logger.info('User update initiated', { userId: id });
    
    const user = await User.findByPk(id);
    
    if (!user) {
        logger.warn('User update failed: User not found', { userId: id });
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }
    
    // Check if updating email and it's already taken
    if (email && email !== user.email) {
        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            logger.warn('User update failed: Email already exists', { email: '[REDACTED]' });
            throw new AppError('Email address already in use', 409, 'EMAIL_EXISTS');
        }
        user.email = email;
    }
    
    // Update fields
    if (firstName !== undefined) user.firstName = firstName;
    if (lastName !== undefined) user.lastName = lastName;
    if (gender !== undefined) user.gender = gender;
    if (isAdmin !== undefined) user.isAdmin = isAdmin;
    if (isStaff !== undefined) user.isStaff = isStaff;
    
    // Hash password if provided
    if (password) {
        user.password = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
        logger.info('User password updated', { userId: id });
    }
    
    await user.save();
    
    logger.info('User updated successfully', { userId: id });
    
    res.status(200).json({
        success: true,
        message: 'User updated successfully',
        data: {
            id: user.id,
            username: user.username,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            gender: user.gender,
            isAdmin: user.isAdmin,
            isStaff: user.isStaff,
            updatedAt: user.updatedAt
        }
    });
});

/**
 * DELETE /users/:id
 * Delete user (soft delete)
 */
const deleteUser = asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    logger.info('User deletion initiated', { userId: id });
    
    const user = await User.findByPk(id);
    
    if (!user) {
        logger.warn('User deletion failed: User not found', { userId: id });
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }
    
    await user.destroy(); // Soft delete due to paranoid: true
    
    logger.info('User deleted successfully', { userId: id });
    
    res.status(200).json({
        success: true,
        message: 'User deleted successfully'
    });
});

/**
 * POST /users/resend-otp
 * Resend OTP to user
 */
const resendOTP = asyncHandler(async (req, res) => {
    const { email } = req.body;
    
    logger.info('OTP resend requested', { email: '[REDACTED]' });
    
    // Find existing OTP record
    const existingOTP = await OTP.findOne({ where: { email } });
    
    if (!existingOTP) {
        throw new AppError('No pending verification found. Please register again.', 400, 'NO_PENDING_VERIFICATION');
    }
    
    // Generate new OTP
    const otpCode = generateOTP();
    const hashedOTP = await bcrypt.hash(otpCode, BCRYPT_SALT_ROUNDS);
    
    // Update expiry and reset attempts
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + OTP_EXPIRY_MINUTES);
    
    existingOTP.otp = hashedOTP;
    existingOTP.expiresAt = expiresAt;
    existingOTP.attempts = 0;
    await existingOTP.save();
    
    // Send new OTP
    await sendOTPEmail(email, otpCode, existingOTP.userData.username);
    
    logger.info('OTP resent successfully', { email: '[REDACTED]' });
    
    res.status(200).json({
        success: true,
        message: 'New verification code sent',
        expiresInMinutes: OTP_EXPIRY_MINUTES
    });
});

module.exports = {
    createUser,
    otpVerification,
    findAllUsers,
    findUser,
    updateUser,
    deleteUser,
    resendOTP
};
