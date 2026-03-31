/**
 * Anonymous Tales - User Post Controller
 * Handles post creation, retrieval, and management
 * 
 * Security Note: All database queries use Sequelize's parameterized queries
 * to prevent SQL injection attacks. Raw SQL is avoided.
 */

const { Op } = require('sequelize');
const UserPost = require('../models/post');
const User = require('../models/userModel');
const Report = require('../models/postReport');
const Like = require('../models/postLikes');
const { logger } = require('../utils/logger');
const { AppError, asyncHandler } = require('../middleware/errorMiddleware');

// ============================================
// Create Post
// ============================================

/**
 * POST /posts
 * Create a new post with content validation
 */
const createPost = asyncHandler(async (req, res) => {
    const { userId, content } = req.body;

    logger.info('Creating new post', { userId });

    // Validate content
    if (!content || content.trim().length === 0) {
        throw new AppError('Post content cannot be empty', 400, 'EMPTY_CONTENT');
    }

    if (content.length > 5000) {
        throw new AppError('Post content cannot exceed 5000 characters', 400, 'CONTENT_TOO_LONG');
    }

    // Check if user exists
    const user = await User.findByPk(userId);
    if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    // Create post
    const post = await UserPost.create({
        userId: user.id,
        content: content.trim(),
        like: false
    });

    // Fetch created post with user data
    const postWithUser = await UserPost.findByPk(post.id, {
        include: {
            model: User,
            attributes: ['id', 'username', 'gender']
        }
    });

    logger.info('Post created successfully', { postId: post.id, userId });

    res.status(201).json({
        success: true,
        message: 'Post created successfully',
        data: postWithUser
    });
});

// ============================================
// Get All Posts (with pagination)
// ============================================

/**
 * GET /posts
 * Get all posts with pagination and optional filtering
 */
const getAllPosts = asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    logger.debug('Fetching posts', { page, limit });

    const { count, rows: posts } = await UserPost.findAndCountAll({
        include: {
            model: User,
            attributes: ['id', 'username', 'gender']
        },
        order: [['createdAt', 'DESC']],
        limit,
        offset
    });

    res.status(200).json({
        success: true,
        data: posts,
        pagination: {
            total: count,
            page,
            limit,
            totalPages: Math.ceil(count / limit)
        }
    });
});

// ============================================
// Get Single Post by ID
// ============================================

/**
 * GET /posts/:postId
 * Get a single post with report count and like count
 * Uses Sequelize associations instead of raw SQL to prevent injection
 */
const getPostById = asyncHandler(async (req, res) => {
    const { postId } = req.params;

    logger.debug('Fetching post by ID', { postId });

    // Find the post by ID
    const post = await UserPost.findByPk(postId, {
        include: [
            {
                model: User,
                attributes: ['id', 'username', 'gender']
            },
            {
                model: Report,
                attributes: ['id'] // Only fetch IDs to count
            },
            {
                model: Like,
                attributes: ['id'] // Only fetch IDs to count
            }
        ]
    });

    if (!post) {
        throw new AppError('Post not found', 404, 'POST_NOT_FOUND');
    }

    // Format response with counts
    const response = {
        id: post.id,
        content: post.content,
        createdAt: post.createdAt,
        updatedAt: post.updatedAt,
        user: post.User,
        reportCount: post.Reports ? post.Reports.length : 0,
        likeCount: post.Likes ? post.Likes.length : 0
    };

    res.status(200).json({
        success: true,
        data: response
    });
});

// ============================================
// Get Posts by User ID
// ============================================

/**
 * GET /posts/user/:userId
 * Get all posts by a specific user
 */
const getPostsByUserId = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    logger.debug('Fetching posts by user ID', { userId, page, limit });

    // Check if user exists
    const user = await User.findByPk(userId);
    if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    // Fetch paginated posts created by the user
    const { count, rows: posts } = await UserPost.findAndCountAll({
        where: { userId },
        include: {
            model: User,
            attributes: ['id', 'username', 'gender']
        },
        order: [['createdAt', 'DESC']],
        limit,
        offset
    });

    res.status(200).json({
        success: true,
        data: posts,
        user: {
            id: user.id,
            username: user.username,
            gender: user.gender
        },
        pagination: {
            total: count,
            page,
            limit,
            totalPages: Math.ceil(count / limit)
        }
    });
});

// ============================================
// Update Post
// ============================================

/**
 * PUT /posts/:postId
 * Update post content
 */
const updatePost = asyncHandler(async (req, res) => {
    const { postId } = req.params;
    const { content } = req.body;
    const userId = req.user.id; // From auth middleware

    logger.info('Updating post', { postId, userId });

    // Validate content
    if (!content || content.trim().length === 0) {
        throw new AppError('Post content cannot be empty', 400, 'EMPTY_CONTENT');
    }

    if (content.length > 5000) {
        throw new AppError('Post content cannot exceed 5000 characters', 400, 'CONTENT_TOO_LONG');
    }

    const post = await UserPost.findByPk(postId);

    if (!post) {
        throw new AppError('Post not found', 404, 'POST_NOT_FOUND');
    }

    // Check ownership or admin status
    if (post.userId !== userId && !req.user.isAdmin) {
        throw new AppError('You do not have permission to update this post', 403, 'FORBIDDEN');
    }

    post.content = content.trim();
    await post.save();

    // Fetch updated post with user data
    const updatedPost = await UserPost.findByPk(postId, {
        include: {
            model: User,
            attributes: ['id', 'username', 'gender']
        }
    });

    logger.info('Post updated successfully', { postId });

    res.status(200).json({
        success: true,
        message: 'Post updated successfully',
        data: updatedPost
    });
});

// ============================================
// Delete Post
// ============================================

/**
 * DELETE /posts/:postId
 * Delete a post (soft delete)
 */
const deletePost = asyncHandler(async (req, res) => {
    const { postId } = req.params;
    const userId = req.user.id; // From auth middleware

    logger.info('Deleting post', { postId, userId });

    const post = await UserPost.findByPk(postId);

    if (!post) {
        throw new AppError('Post not found', 404, 'POST_NOT_FOUND');
    }

    // Check ownership or admin status
    if (post.userId !== userId && !req.user.isAdmin) {
        throw new AppError('You do not have permission to delete this post', 403, 'FORBIDDEN');
    }

    await post.destroy(); // Soft delete

    logger.info('Post deleted successfully', { postId });

    res.status(200).json({
        success: true,
        message: 'Post deleted successfully'
    });
});

// ============================================
// Search Posts
// ============================================

/**
 * GET /posts/search?q=query
 * Search posts by content
 */
const searchPosts = asyncHandler(async (req, res) => {
    const { q } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    if (!q || q.trim().length === 0) {
        throw new AppError('Search query is required', 400, 'EMPTY_QUERY');
    }

    logger.debug('Searching posts', { query: q, page, limit });

    const { count, rows: posts } = await UserPost.findAndCountAll({
        where: {
            content: {
                [Op.iLike]: `%${q}%` // Case-insensitive search
            }
        },
        include: {
            model: User,
            attributes: ['id', 'username', 'gender']
        },
        order: [['createdAt', 'DESC']],
        limit,
        offset
    });

    res.status(200).json({
        success: true,
        data: posts,
        pagination: {
            total: count,
            page,
            limit,
            totalPages: Math.ceil(count / limit)
        }
    });
});

module.exports = {
    createPost,
    getAllPosts,
    getPostById,
    getPostsByUserId,
    updatePost,
    deletePost,
    searchPosts
};
