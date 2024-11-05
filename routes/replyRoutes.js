// routes/replyRoutes.js

const express = require('express');
const router = express.Router();
const { createReply, getRepliesForComment } = require('../controllers/userReplyController');

// Create a new reply
router.post('/replies', createReply);

// Get all replies for a specific comment
router.get('/comments/:commentId/replies', getRepliesForComment);

module.exports = router;
