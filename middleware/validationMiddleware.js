/**
 * Anonymous Tales - Validation Middleware
 * Centralized input validation and sanitization using express-validator
 * Protects against XSS, injection attacks, and malformed data
 */

const { body, param, query, validationResult } = require('express-validator');
const { logger } = require('../utils/logger');

/**
 * Handle validation errors and return standardized response
 */
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        logger.warn('Validation failed', { 
            errors: errors.array(),
            path: req.originalUrl,
            method: req.method
        });
        
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors.array().map(err => ({
                field: err.path,
                message: err.msg,
                value: err.value ? '[REDACTED]' : undefined // Don't expose values
            }))
        });
    }
    next();
};

// ============================================
// User Validation Rules
// ============================================

/**
 * Validation rules for user registration (step 1 - OTP request)
 */
const validateUserRegistration = [
    body('username')
        .trim()
        .notEmpty().withMessage('Username is required')
        .isLength({ min: 3, max: 30 }).withMessage('Username must be between 3 and 30 characters')
        .matches(/^[a-zA-Z0-9_]+$/).withMessage('Username can only contain letters, numbers, and underscores')
        .escape(),
    
    body('firstName')
        .optional()
        .trim()
        .isLength({ max: 50 }).withMessage('First name cannot exceed 50 characters')
        .matches(/^[a-zA-Z\s'-]+$/).withMessage('First name contains invalid characters')
        .escape(),
    
    body('lastName')
        .optional()
        .trim()
        .isLength({ max: 50 }).withMessage('Last name cannot exceed 50 characters')
        .matches(/^[a-zA-Z\s'-]+$/).withMessage('Last name contains invalid characters')
        .escape(),
    
    body('email')
        .trim()
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Please provide a valid email address')
        .normalizeEmail()
        .isLength({ max: 255 }).withMessage('Email cannot exceed 255 characters'),
    
    body('password')
        .notEmpty().withMessage('Password is required')
        .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long')
        .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
        .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter')
        .matches(/[0-9]/).withMessage('Password must contain at least one number')
        .matches(/[^A-Za-z0-9]/).withMessage('Password must contain at least one special character'),
    
    body('gender')
        .optional()
        .trim()
        .isIn(['male', 'female', 'other', 'prefer_not_to_say']).withMessage('Invalid gender value'),
    
    body('isAdmin')
        .optional()
        .isBoolean().withMessage('isAdmin must be a boolean'),
    
    body('isStaff')
        .optional()
        .isBoolean().withMessage('isStaff must be a boolean'),
    
    handleValidationErrors
];

/**
 * Validation rules for OTP verification (step 2 - user creation)
 */
const validateOTPVerification = [
    body('email')
        .trim()
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Please provide a valid email address')
        .normalizeEmail(),
    
    body('otp')
        .notEmpty().withMessage('OTP is required')
        .isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits')
        .isNumeric().withMessage('OTP must contain only numbers'),
    
    handleValidationErrors
];

/**
 * Validation rules for user login
 */
const validateLogin = [
    body('email')
        .trim()
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Please provide a valid email address')
        .normalizeEmail(),
    
    body('password')
        .notEmpty().withMessage('Password is required'),
    
    handleValidationErrors
];

/**
 * Validation rules for user update
 */
const validateUserUpdate = [
    param('id')
        .isUUID().withMessage('Invalid user ID format'),
    
    body('firstName')
        .optional()
        .trim()
        .isLength({ max: 50 }).withMessage('First name cannot exceed 50 characters')
        .matches(/^[a-zA-Z\s'-]+$/).withMessage('First name contains invalid characters')
        .escape(),
    
    body('lastName')
        .optional()
        .trim()
        .isLength({ max: 50 }).withMessage('Last name cannot exceed 50 characters')
        .matches(/^[a-zA-Z\s'-]+$/).withMessage('Last name contains invalid characters')
        .escape(),
    
    body('email')
        .optional()
        .trim()
        .isEmail().withMessage('Please provide a valid email address')
        .normalizeEmail()
        .isLength({ max: 255 }).withMessage('Email cannot exceed 255 characters'),
    
    body('password')
        .optional()
        .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long')
        .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
        .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter')
        .matches(/[0-9]/).withMessage('Password must contain at least one number')
        .matches(/[^A-Za-z0-9]/).withMessage('Password must contain at least one special character'),
    
    body('gender')
        .optional()
        .trim()
        .isIn(['male', 'female', 'other', 'prefer_not_to_say']).withMessage('Invalid gender value'),
    
    handleValidationErrors
];

/**
 * Validation rules for user ID parameter
 */
const validateUserId = [
    param('id')
        .isUUID().withMessage('Invalid user ID format'),
    handleValidationErrors
];

// ============================================
// Post Validation Rules
// ============================================

/**
 * Validation rules for creating a post
 */
const validateCreatePost = [
    body('userId')
        .notEmpty().withMessage('User ID is required')
        .isUUID().withMessage('Invalid user ID format'),
    
    body('content')
        .trim()
        .notEmpty().withMessage('Post content is required')
        .isLength({ min: 1, max: 5000 }).withMessage('Post must be between 1 and 5000 characters')
        .escape(),
    
    handleValidationErrors
];

/**
 * Validation rules for updating a post
 */
const validateUpdatePost = [
    param('postId')
        .isUUID().withMessage('Invalid post ID format'),
    
    body('content')
        .trim()
        .notEmpty().withMessage('Post content is required')
        .isLength({ min: 1, max: 5000 }).withMessage('Post must be between 1 and 5000 characters')
        .escape(),
    
    handleValidationErrors
];

/**
 * Validation rules for post ID parameter
 */
const validatePostId = [
    param('postId')
        .isUUID().withMessage('Invalid post ID format'),
    handleValidationErrors
];

// ============================================
// Comment Validation Rules
// ============================================

/**
 * Validation rules for creating a comment
 */
const validateCreateComment = [
    body('userPostId')
        .notEmpty().withMessage('Post ID is required')
        .isUUID().withMessage('Invalid post ID format'),
    
    body('userId')
        .notEmpty().withMessage('User ID is required')
        .isUUID().withMessage('Invalid user ID format'),
    
    body('content')
        .trim()
        .notEmpty().withMessage('Comment content is required')
        .isLength({ min: 1, max: 2000 }).withMessage('Comment must be between 1 and 2000 characters')
        .escape(),
    
    handleValidationErrors
];

// ============================================
// Reply Validation Rules
// ============================================

/**
 * Validation rules for creating a reply
 */
const validateCreateReply = [
    body('commentId')
        .notEmpty().withMessage('Comment ID is required')
        .isUUID().withMessage('Invalid comment ID format'),
    
    body('content')
        .trim()
        .notEmpty().withMessage('Reply content is required')
        .isLength({ min: 1, max: 2000 }).withMessage('Reply must be between 1 and 2000 characters')
        .escape(),
    
    handleValidationErrors
];

// ============================================
// Pagination Validation Rules
// ============================================

/**
 * Validation rules for pagination parameters
 */
const validatePagination = [
    query('page')
        .optional()
        .isInt({ min: 1 }).withMessage('Page must be a positive integer')
        .toInt(),
    
    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
        .toInt(),
    
    handleValidationErrors
];

// ============================================
// Report Validation Rules
// ============================================

/**
 * Validation rules for reporting content
 */
const validateReport = [
    body('postId')
        .notEmpty().withMessage('Post ID is required')
        .isUUID().withMessage('Invalid post ID format'),
    
    body('reason')
        .optional()
        .trim()
        .isLength({ max: 500 }).withMessage('Reason cannot exceed 500 characters')
        .escape(),
    
    handleValidationErrors
];

module.exports = {
    // User validations
    validateUserRegistration,
    validateOTPVerification,
    validateLogin,
    validateUserUpdate,
    validateUserId,
    
    // Post validations
    validateCreatePost,
    validateUpdatePost,
    validatePostId,
    
    // Comment validations
    validateCreateComment,
    
    // Reply validations
    validateCreateReply,
    
    // Pagination
    validatePagination,
    
    // Report validations
    validateReport,
    
    // Error handler
    handleValidationErrors
};