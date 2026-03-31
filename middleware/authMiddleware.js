/**
 * Anonymous Tales - Authentication Middleware
 * Handles JWT verification for HTTP routes and Socket.io connections
 * Uses environment variables for secrets (no hardcoded values)
 */

const jwt = require('jsonwebtoken');
const { logger } = require('../utils/logger');

// Load JWT secret from environment variables
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';

/**
 * Verify that JWT_SECRET is configured on module load
 * This prevents runtime errors due to missing configuration
 */
if (!JWT_SECRET) {
    logger.error('FATAL ERROR: JWT_SECRET is not defined in environment variables');
    if (process.env.NODE_ENV === 'production') {
        process.exit(1);
    }
}

/**
 * Generate a JWT token for a user
 * @param {Object} payload - User data to encode in token
 * @returns {string} JWT token
 */
const generateToken = (payload) => {
    return jwt.sign(
        payload,
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
    );
};

/**
 * Verify a JWT token
 * @param {string} token - JWT token to verify
 * @returns {Object} Decoded token payload
 * @throws {Error} If token is invalid or expired
 */
const verifyToken = (token) => {
    return jwt.verify(token, JWT_SECRET);
};

/**
 * HTTP Authentication Middleware
 * Verifies JWT token from Authorization header
 * Adds decoded user data to req.user
 */
const authenticateToken = (req, res, next) => {
    try {
        // Get token from Authorization header
        const authHeader = req.headers.authorization;
        
        if (!authHeader) {
            logger.warn('Authentication failed: No authorization header', {
                path: req.originalUrl,
                ip: req.ip
            });
            return res.status(401).json({
                success: false,
                message: 'Access denied. No token provided.',
                errorCode: 'NO_TOKEN'
            });
        }

        // Check for Bearer token format
        const parts = authHeader.split(' ');
        if (parts.length !== 2 || parts[0] !== 'Bearer') {
            logger.warn('Authentication failed: Invalid token format', {
                path: req.originalUrl,
                ip: req.ip
            });
            return res.status(401).json({
                success: false,
                message: 'Access denied. Invalid token format.',
                errorCode: 'INVALID_TOKEN_FORMAT'
            });
        }

        const token = parts[1];

        // Verify token
        const decoded = verifyToken(token);
        
        // Add user data to request
        req.user = decoded;
        
        logger.debug('User authenticated successfully', {
            userId: decoded.id,
            path: req.originalUrl
        });
        
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            logger.warn('Authentication failed: Token expired', {
                path: req.originalUrl,
                ip: req.ip
            });
            return res.status(401).json({
                success: false,
                message: 'Your session has expired. Please log in again.',
                errorCode: 'TOKEN_EXPIRED'
            });
        }
        
        if (error.name === 'JsonWebTokenError') {
            logger.warn('Authentication failed: Invalid token', {
                path: req.originalUrl,
                ip: req.ip
            });
            return res.status(401).json({
                success: false,
                message: 'Invalid token. Please log in again.',
                errorCode: 'INVALID_TOKEN'
            });
        }
        
        logger.error('Authentication error', {
            error: error.message,
            path: req.originalUrl,
            ip: req.ip
        });
        
        return res.status(500).json({
            success: false,
            message: 'Authentication error occurred.',
            errorCode: 'AUTH_ERROR'
        });
    }
};

/**
 * Socket.io Authentication Middleware
 * Verifies JWT token from socket handshake auth
 */
const ioAuthMiddleware = (socket, next) => {
    try {
        const token = socket.handshake.auth.token;
        
        if (!token) {
            logger.warn('Socket authentication failed: No token provided', {
                socketId: socket.id
            });
            return next(new Error('Authentication error: No token provided'));
        }

        // Verify token
        const decoded = verifyToken(token);
        
        // Attach user data to socket
        socket.userId = decoded.id;
        socket.username = decoded.username;
        socket.email = decoded.email;
        
        logger.debug('Socket user authenticated', {
            socketId: socket.id,
            username: decoded.username
        });
        
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            logger.warn('Socket authentication failed: Token expired', {
                socketId: socket.id
            });
            return next(new Error('Authentication error: Token expired'));
        }
        
        logger.warn('Socket authentication failed: Invalid token', {
            socketId: socket.id,
            error: error.message
        });
        
        next(new Error('Authentication error: Invalid token'));
    }
};

/**
 * Optional Authentication Middleware
 * Tries to authenticate but allows unauthenticated requests
 * Useful for public routes that can show personalized content when logged in
 */
const optionalAuth = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader) {
            return next(); // Continue without authentication
        }

        const parts = authHeader.split(' ');
        if (parts.length !== 2 || parts[0] !== 'Bearer') {
            return next(); // Continue without authentication
        }

        const token = parts[1];
        const decoded = verifyToken(token);
        req.user = decoded;
        
        next();
    } catch (error) {
        // Continue without authentication on error
        next();
    }
};

/**
 * Role-based authorization middleware
 * @param {...string} allowedRoles - Roles that are allowed to access the route
 */
const authorize = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Access denied. Please log in.',
                errorCode: 'NOT_AUTHENTICATED'
            });
        }

        const userRoles = [];
        if (req.user.isAdmin) userRoles.push('admin');
        if (req.user.isStaff) userRoles.push('staff');
        userRoles.push('user'); // Everyone is at least a user

        const hasRole = allowedRoles.some(role => userRoles.includes(role));

        if (!hasRole) {
            logger.warn('Authorization failed: Insufficient permissions', {
                userId: req.user.id,
                requiredRoles: allowedRoles,
                userRoles,
                path: req.originalUrl
            });
            
            return res.status(403).json({
                success: false,
                message: 'Access denied. Insufficient permissions.',
                errorCode: 'FORBIDDEN'
            });
        }

        next();
    };
};

module.exports = {
    authenticateToken,
    ioAuthMiddleware,
    optionalAuth,
    authorize,
    generateToken,
    verifyToken,
    JWT_SECRET,
    JWT_EXPIRES_IN
};