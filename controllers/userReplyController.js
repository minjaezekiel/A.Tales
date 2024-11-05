// controllers/replyController.js

const Reply = require('../models/reply');
const Comment = require('../models/comment');

// Create a new reply
const createReply = async (req, res) => {
    try {
        const { commentId, content } = req.body;

        // Validate content
        if (!content || content.trim() === '') {
            return res.status(400).json({ message: 'Reply content cannot be empty' });
        }

        // Check if the comment exists
        const comment = await Comment.findByPk(commentId);
        if (!comment) {
            return res.status(404).json({ message: 'Comment not found' });
        }

        // Create a reply
        const reply = await Reply.create({
            commentId: comment.id,
            content: content,
        });

        return res.status(201).json({
            message: 'Reply created successfully',
            reply,
        });
    } catch (error) {
        console.error('Error creating reply:', error);
        return res.status(500).json({ message: 'Server error' });
    }
};

// Get all replies for a specific comment
const getRepliesForComment = async (req, res) => {
    try {
        const { commentId } = req.params;

        const replies = await Reply.findAll({
            where: { commentId: commentId },
            attributes: ['content', 'createdAt', 'like', 'report'],
        });

        if (!replies) {
            return res.status(404).json({ message: 'No replies found' });
        }

        return res.status(200).json(replies);
    } catch (error) {
        console.error('Error fetching replies:', error);
        return res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    createReply,
    getRepliesForComment,
};
