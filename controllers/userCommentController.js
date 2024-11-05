// controllers/commentController.js
const User = require("./../models/userModel");
const Comment = require('../models/userCommentModel');
const UserPost = require('../models/post');

const createComment = async (req, res) => {
    const { postId } = req.params; // Get the post ID from the request parameters
    const { userId,content } = req.body; // Get the comment content from the request body
     

    try {
        // Validate the input
        if (!content) {
            return res.status(400).json({ message: 'Comment content is required' });
        }
        console.log('I am post id:',postId)
        // Create the new comment
        const newComment = await Comment.create({
            userPostId:postId,
            userId:userId,
            content:content, // Associate the comment with the user
            like: false, // Default like status
            report: false // Default report status
        });

        return res.status(201).json({
            message: 'Comment created successfully',
            comment: newComment,
        });
    } catch (error) {
        console.error('Error creating comment:', error);
        return res.status(500).json({ message: 'Server error' });
    }
};

// Like or report a comment
const updateCommentStatus = async (req, res) => {
    try {
        const { commentId } = req.params;
        const { like, report } = req.body;

        // Find the comment by ID
        const comment = await Comment.findByPk(commentId);
        if (!comment) {
            return res.status(404).json({ message: 'Comment not found' });
        }

        // Update like or report status if provided
        if (like !== undefined) {
            comment.like = like;
        }
        if (report !== undefined) {
            comment.report = report;
        }

        await comment.save();

        return res.status(200).json({
            message: 'Comment status updated',
            comment,
        });
    } catch (error) {
        console.error('Error updating comment status:', error);
        return res.status(500).json({ message: 'Server error' });
    }
};

const getCommentsByPostId = async (req, res) => {
    const { postId } = req.params;
    console.log('i am the post id:',postId)
    try {
      const comments = await Comment.findAll({
        where: { userPostId:postId },
        include: {
          model: User,
          attributes: ['username'], // Return the username
        },
        attributes: ['id', 'content', 'createdAt'],
      });
  
      return res.status(200).json(comments);
    } catch (error) {
      console.error('Error fetching comments:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  };
  

module.exports = {
    createComment,
    getCommentsByPostId,
    updateCommentStatus, // Export the new controller function
};
