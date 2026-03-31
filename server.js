/**
 * Anonymous Tales - Main Server Application
 * 
 * Security & Features:
 * - Helmet.js for security headers
 * - CORS configuration
 * - Express rate limiting
 * - Input validation and sanitization
 * - Centralized error handling
 * - Comprehensive logging with Winston
 * - Proper database synchronization without data loss
 * - Socket.io with authentication
 * 
 * @module server
 */

require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const http = require('http');
const path = require('path');
const fs = require('fs');

// Database
const sequelize = require('./config/dbConf');

// Models
const User = require('./models/userModel');
const UserPost = require('./models/post');
const UserProfile = require('./models/userProfileModel');
const Comment = require('./models/userCommentModel');
const Reply = require('./models/userReplyModel');
const Like = require('./models/postLikes');
const Report = require('./models/postReport');
const OTP = require('./models/otpModel');

// Middleware
const { globalErrorHandler, notFoundHandler } = require('./middleware/errorMiddleware');
const { standardLimiter } = require('./middleware/rateLimitMiddleware');

// Routes
const commentRouter = require('./routes/commentRoute');
const loginRouter = require('./routes/loginRoute');
const likesRoute = require('./routes/likesRoute');
const adminRouter = require('./routes/adminRoute');
const userRouter = require('./routes/userRoute');
const apiRouter = require('./routes/apiRoute');
const profileRouter = require('./routes/userProfileRoute');
const postRouter = require('./routes/userPostRoute');

// Utilities
const { logger } = require('./utils/logger');
const setupSocket = require('./controllers/socketHandler');

// ============================================
// Configuration
// ============================================

const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const APP_URL = process.env.APP_URL || `http://localhost:${PORT}`;

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

// ============================================
// Initialize Express App
// ============================================

const app = express();
const server = http.createServer(app);

// ============================================
// Security Middleware
// ============================================

/**
 * Helmet: Set security headers
 * Protects against common vulnerabilities (XSS, clickjacking, etc.)
 */
// app.use(helmet({
//     contentSecurityPolicy: {
//         directives: {
//             defaultSrc: ["'self'"],
//             styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
//             scriptSrc: ["'self'", "https://cdn.jsdelivr.net", "'unsafe-inline'"],
//             imgSrc: ["'self'", "data:", "https:"],
//             connectSrc: ["'self'", "ws:", "wss:"],
//             fontSrc: ["'self'", "https://cdn.jsdelivr.net"],
//         },
//     },
//     crossOriginEmbedderPolicy: false, // Allow images from different origins
// }));
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
            scriptSrc: ["'self'", "https://cdn.jsdelivr.net", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "ws:", "wss:", "https://cdn.jsdelivr.net"],
            fontSrc: ["'self'", "https://cdn.jsdelivr.net"],
        },
    },
    crossOriginEmbedderPolicy: false,
}));

/**
 * CORS: Configure Cross-Origin Resource Sharing
 * Restricts which domains can access the API
 */
const corsOptions = {
    origin: process.env.CORS_ORIGIN || APP_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    maxAge: 86400 // 24 hours
};
app.use(cors(corsOptions));

/**
 * Rate Limiting: Prevent abuse and brute force
 */
app.use(standardLimiter);

// ============================================
// Body Parsing Middleware
// ============================================

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ============================================
// View Engine & Static Files
// ============================================

app.set('view engine', 'ejs');
app.use(express.static('views'));

// ============================================
// Request Logging
// ============================================

app.use((req, res, next) => {
    logger.debug(`${req.method} ${req.originalUrl}`, {
        ip: req.ip,
        userAgent: req.get('user-agent')
    });
    next();
});

// ============================================
// Routes
// ============================================

app.use('/login', loginRouter);
app.use('/users', userRouter);
app.use('/api', apiRouter);
app.use('/posts', postRouter);
app.use('/comments', commentRouter);
app.use('/likes', likesRoute);
app.use('/profile', profileRouter);
app.use('/admin', adminRouter);

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({
        success: true,
        status: 'healthy',
        timestamp: new Date().toISOString(),
        environment: NODE_ENV,
        version: process.env.npm_package_version || '2.0.0'
    });
});

// Root redirect to login
app.get('/', (req, res) => {
    res.redirect('/views/login.html');
});

// ============================================
// Error Handling
// ============================================

// 404 handler for undefined routes
app.use(notFoundHandler);

// Global error handler
app.use(globalErrorHandler);

// ============================================
// Database Synchronization
// ============================================

/**
 * Sync database models without data loss
 * Uses { alter: true } instead of { force: true } in development
 * Uses migrations in production
 */
async function syncDatabase() {
    try {
        logger.info('Starting database synchronization...');
        
        // Test connection first
        await sequelize.authenticate();
        logger.info('Database connection established successfully');
        
        // Sync all models
        // In development: alter tables to match models
        // In production: use migrations instead
        const syncOptions = NODE_ENV === 'production' 
            ? { alter: false } // Use migrations in production
            : { alter: false };  // Auto-alter in development
        
        await User.sync(syncOptions);
        logger.info('User model synced');
        
        await UserPost.sync(syncOptions);
        logger.info('UserPost model synced');
        
        await UserProfile.sync(syncOptions);
        logger.info('UserProfile model synced');
        
        await Comment.sync(syncOptions);
        logger.info('Comment model synced');
        
        await Reply.sync(syncOptions);
        logger.info('Reply model synced');
        
        await Like.sync(syncOptions);
        logger.info('Like model synced');
        
        await Report.sync(syncOptions);
        logger.info('Report model synced');
        
        await OTP.sync(syncOptions);
        logger.info('OTP model synced');
        
        logger.info('Database synchronization completed successfully');
    } catch (error) {
        logger.error('Database synchronization failed', { error: error.message });
        throw error;
    }
}

// ============================================
// Socket.io Setup
// ============================================

setupSocket(server);

// ============================================
// Server Startup
// ============================================

async function startServer() {
    try {
        // Sync database
        await syncDatabase();
        
        // Start server
        server.listen(PORT, () => {
            logger.info(`🚀 Server running on ${APP_URL}`);
            logger.info(`📊 Environment: ${NODE_ENV}`);
            logger.info(`📁 Logs directory: ${logsDir}`);
        });
    } catch (error) {
        logger.error('Failed to start server', { error: error });
        process.exit(1);
    }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
    logger.error('Unhandled Promise Rejection', { error: err.message, stack: err.stack });
    // Give logger time to write before exiting
    setTimeout(() => {
        process.exit(1);
    }, 1000);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    logger.error('Uncaught Exception', { error: err.message, stack: err.stack });
    // Give logger time to write before exiting
    setTimeout(() => {
        process.exit(1);
    }, 1000);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    logger.info('SIGTERM received. Shutting down gracefully...');
    server.close(async () => {
        logger.info('HTTP server closed');
        await sequelize.close();
        logger.info('Database connection closed');
        process.exit(0);
    });
});

// Start the application
startServer();

module.exports = { app, server };