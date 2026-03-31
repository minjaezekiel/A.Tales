/**
 * Anonymous Tales - Logger Utility
 * Provides centralized logging with Winston for consistent error tracking
 * and application monitoring across all modules.
 */

const winston = require('winston');
const path = require('path');

/**
 * Custom format for console output with colors
 */
const consoleFormat = winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(({ level, message, timestamp, ...metadata }) => {
        let msg = `${timestamp} [${level}]:  ${message}`;
        if (Object.keys(metadata).length > 0) {
            msg += ` ${JSON.stringify(metadata)}`;
        }
        return msg;
    })
);

/**
 * Custom format for file output (JSON)
 */
const fileFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
);

/**
 * Winston logger instance configured for both console and file outputs.
 * - Console: Colored output for development
 * - error.log: Error level logs only
 * - combined.log: All logs
 */
const logger = winston.createLogger({
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    defaultMeta: { service: 'anonymoustales' },
    transports: [
        // Error log file
        new winston.transports.File({
            filename: path.join('logs', 'error.log'),
            level: 'error',
            format: fileFormat
        }),
        // Combined log file
        new winston.transports.File({
            filename: path.join('logs', 'combined.log'),
            format: fileFormat
        })
    ],
    // Handle uncaught exceptions
    exceptionHandlers: [
        new winston.transports.File({
            filename: path.join('logs', 'exceptions.log'),
            format: fileFormat
        })
    ],
    // Handle unhandled promise rejections
    rejectionHandlers: [
        new winston.transports.File({
            filename: path.join('logs', 'rejections.log'),
            format: fileFormat
        })
    ]
});

/**
 * Add console transport in non-production environments
 * or if explicitly enabled
 */
if (process.env.NODE_ENV !== 'production' || process.env.ENABLE_CONSOLE_LOGS === 'true') {
    logger.add(new winston.transports.Console({
        format: consoleFormat
    }));
}

/**
 * Helper function to create a request-specific logger with context
 * @param {Object} req - Express request object
 * @returns {Object} Logger with request context
 */
const createRequestLogger = (req) => {
    return logger.child({
        requestId: req.id || 'unknown',
        method: req.method,
        url: req.originalUrl,
        ip: req.ip,
        userAgent: req.get('user-agent')
    });
};

/**
 * Sanitize sensitive data from objects before logging
 * @param {Object} obj - Object to sanitize
 * @returns {Object} Sanitized object
 */
const sanitizeData = (obj) => {
    const sensitiveFields = ['password', 'token', 'secret', 'otp', 'authorization', 'cookie'];
    const sanitized = { ...obj };
    
    for (const key of Object.keys(sanitized)) {
        if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
            sanitized[key] = '[REDACTED]';
        } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
            sanitized[key] = sanitizeData(sanitized[key]);
        }
    }
    
    return sanitized;
};

module.exports = {
    logger,
    createRequestLogger,
    sanitizeData
};