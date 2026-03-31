/**
 * Anonymous Tales - Rate Limiting Middleware
 * Prevents brute force attacks and abuse by limiting request rates
 * Uses express-rate-limit with different strategies for different endpoints
 */

const rateLimit = require('express-rate-limit');
const { logger } = require('../utils/logger');

/**
 * Standard rate limit configuration
 * 100 requests per 15 minutes per IP
 */
const standardLimiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    message: {
        success: false,
        message: 'Too many requests from this IP, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res, next, options) => {
        logger.warn('Rate limit exceeded', {
            ip: req.ip,
            path: req.originalUrl,
            userAgent: req.get('user-agent')
        });
        res.status(429).json(options.message);
    }
});

/**
 * Strict rate limit for authentication endpoints
 * 5 attempts per 15 minutes per IP
 * Prevents brute force attacks on login/OTP endpoints
 */
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5,
    message: {
        success: false,
        message: 'Too many authentication attempts from this IP. Please try again after 15 minutes.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true, // Don't count successful requests
    handler: (req, res, next, options) => {
        logger.warn('Authentication rate limit exceeded', {
            ip: req.ip,
            path: req.originalUrl,
            email: req.body.email ? '[REDACTED]' : undefined
        });
        res.status(429).json(options.message);
    }
});

/**
 * API rate limit for API endpoints
 * 200 requests per 15 minutes per IP
 */
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200,
    message: {
        success: false,
        message: 'Too many API requests from this IP, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res, next, options) => {
        logger.warn('API rate limit exceeded', {
            ip: req.ip,
            path: req.originalUrl
        });
        res.status(429).json(options.message);
    }
});

/**
 * Post creation rate limit
 * 10 posts per hour per IP
 * Prevents spam posting
 */
const postLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10,
    message: {
        success: false,
        message: 'You have reached the posting limit. Please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res, next, options) => {
        logger.warn('Post rate limit exceeded', {
            ip: req.ip,
            userId: req.body.userId
        });
        res.status(429).json(options.message);
    }
});

/**
 * Comment rate limit
 * 30 comments per hour per IP
 */
const commentLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 30,
    message: {
        success: false,
        message: 'You have reached the comment limit. Please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res, next, options) => {
        logger.warn('Comment rate limit exceeded', {
            ip: req.ip,
            userId: req.body.userId
        });
        res.status(429).json(options.message);
    }
});

module.exports = {
    standardLimiter,
    authLimiter,
    apiLimiter,
    postLimiter,
    commentLimiter
};