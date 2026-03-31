/**
 * Anonymous Tales - User Routes
 * Defines routes for user registration, verification, and management
 * 
 * All routes include:
 * - Input validation and sanitization
 * - Rate limiting where appropriate
 * - Proper error handling
 */

const express = require('express');
const router = express.Router();

// Import controller functions
const {
    createUser,
    otpVerification,
    findAllUsers,
    findUser,
    updateUser,
    deleteUser,
    resendOTP
} = require('../controllers/userController');

// Import validation middleware
const {
    validateUserRegistration,
    validateOTPVerification,
    validateUserUpdate,
    validateUserId
} = require('../middleware/validationMiddleware');

// Import rate limiting
const { authLimiter, apiLimiter } = require('../middleware/rateLimitMiddleware');

// Import authentication
const { authenticateToken, authorize } = require('../middleware/authMiddleware');

/**
 * POST /users
 * Step 1: Register new user - send OTP
 * Rate limited to prevent abuse
 */
router.post(
    '/',
    authLimiter,
    validateUserRegistration,
    createUser
);

/**
 * POST /users/verify
 * Step 2: Verify OTP and complete registration
 */
router.post(
    '/verify',
    authLimiter,
    validateOTPVerification,
    otpVerification
);

/**
 * POST /users/resend-otp
 * Resend OTP to email
 */
router.post(
    '/resend-otp',
    authLimiter,
    resendOTP
);

/**
 * GET /users
 * Get all users with pagination
 * Requires authentication and admin/staff role
 */
router.get(
    '/',
    authenticateToken,
    authorize('admin', 'staff'),
    apiLimiter,
    findAllUsers
);

/**
 * GET /users/:id
 * Get single user by ID
 * Users can view their own profile, admins can view any
 */
router.get(
    '/:id',
    authenticateToken,
    validateUserId,
    findUser
);

/**
 * PUT /users/:id
 * Update user information
 * Users can update their own profile, admins can update any
 */
router.put(
    '/:id',
    authenticateToken,
    validateUserId,
    validateUserUpdate,
    updateUser
);

/**
 * DELETE /users/:id
 * Soft delete user
 * Users can delete their own account, admins can delete any
 */
router.delete(
    '/:id',
    authenticateToken,
    validateUserId,
    deleteUser
);

module.exports = router;