// routes/commentRoutes.js

const express = require('express');
const router = express.Router();
const { createComment,getCommentsByPostId, updateCommentStatus } = require('../controllers/userCommentController');

// Create a new comment
router.route('/:postId').post(createComment);

// Update like or report status of a comment
router.route('/:commentId/').patch(updateCommentStatus);

// Add this route in your router
router.route('/:postId').get(getCommentsByPostId);

module.exports = router;
