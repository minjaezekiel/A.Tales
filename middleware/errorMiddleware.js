/**
 * Anonymous Tales - Error Handling Middleware
 * Centralized error handling with sanitized responses
 * Prevents information leakage and provides consistent error responses
 */

const { logger, sanitizeData } = require('../utils/logger');

/**
 * Custom error class for application-specific errors
 */
class AppError extends Error {
    constructor(message, statusCode, errorCode = null) {
        super(message);
        this.statusCode = statusCode;
        this.errorCode = errorCode;
        this.isOperational = true; // Indicates if this is a known operational error
        
        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * Async handler wrapper - eliminates need for try-catch in controllers
 * @param {Function} fn - Async function to wrap
 * @returns {Function} Express middleware function
 */
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

/**
 * Global error handling middleware
 * Processes all errors and returns sanitized responses
 */
const globalErrorHandler = (err, req, res, next) => {
    // Default error values
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';
    
    // Log error details (sanitized)
    const logData = {
        statusCode: err.statusCode,
        message: err.message,
        stack: err.stack,
        path: req.originalUrl,
        method: req.method,
        ip: req.ip,
        body: sanitizeData(req.body)
    };
    
    if (err.statusCode >= 500) {
        logger.error('Server error occurred', logData);
    } else {
        logger.warn('Client error occurred', logData);
    }
    
    // Determine response based on environment
    if (process.env.NODE_ENV === 'development') {
        // Send detailed error in development
        return res.status(err.statusCode).json({
            success: false,
            status: err.status,
            message: err.message,
            errorCode: err.errorCode,
            stack: err.stack,
            ...(err.errors && { errors: err.errors })
        });
    }
    
    // Production: Send sanitized response
    if (err.isOperational) {
        // Known operational errors - safe to send message
        return res.status(err.statusCode).json({
            success: false,
            message: err.message,
            ...(err.errorCode && { errorCode: err.errorCode }),
            ...(err.errors && { errors: err.errors })
        });
    }
    
    // Unknown errors - generic message
    logger.error('UNKNOWN ERROR:', err);
    return res.status(500).json({
        success: false,
        message: 'An unexpected error occurred. Please try again later.'
    });
};

/**
 * Handle specific error types
 */
const handleSequelizeError = (err) => {
    if (err.name === 'SequelizeValidationError') {
        const messages = err.errors.map(e => ({
            field: e.path,
            message: e.message
        }));
        return new AppError('Validation failed', 400, 'VALIDATION_ERROR');
    }
    
    if (err.name === 'SequelizeUniqueConstraintError') {
        const field = err.errors[0]?.path || 'field';
        return new AppError(`${field} already exists`, 409, 'DUPLICATE_ERROR');
    }
    
    if (err.name === 'SequelizeForeignKeyConstraintError') {
        return new AppError('Referenced resource does not exist', 400, 'FOREIGN_KEY_ERROR');
    }
    
    if (err.name === 'SequelizeDatabaseError') {
        return new AppError('Database error occurred', 500, 'DATABASE_ERROR');
    }
    
    return err;
};

/**
 * Handle JWT errors
 */
const handleJWTError = () => {
    return new AppError('Invalid token. Please log in again.', 401, 'INVALID_TOKEN');
};

const handleJWTExpiredError = () => {
    return new AppError('Your session has expired. Please log in again.', 401, 'TOKEN_EXPIRED');
};

/**
 * Middleware to handle 404 routes
 */
const notFoundHandler = (req, res, next) => {
    const error = new AppError(
        `Cannot find ${req.originalUrl} on this server`,
        404,
        'NOT_FOUND'
    );
    next(error);
};

module.exports = {
    AppError,
    asyncHandler,
    globalErrorHandler,
    notFoundHandler,
    handleSequelizeError,
    handleJWTError,
    handleJWTExpiredError
};