// routes/userPostRoutes.js
const express = require('express');
const { reportPost } = require('../controllers/postReport');
const {
    createPost,
    getAllPosts,
    getPostById,
    getPostsByUserId,
    updatePost,
    deletePost,
} = require('../controllers/userPostController');

const router = express.Router();

// Route for updating a post
router.route('/update/:postId').put(updatePost);

// Route for creating a post
router.route('/').post(createPost);

// Route for fetching all posts
router.route('/').get(getAllPosts);

// Get a single post by ID
//router.route('/posts/:postId').get(getPostById);

router.route('/:postId').get((req, res, next) => {
    console.log('GET request for post ID:', req.params.postId); // Log the request
    next();
}, getPostById);

//get posts with a particular userId
router.route('/user/:userId').get(getPostsByUserId);

// Route for deleting a post
router.route('/delete/:postId').delete(deletePost);


// Route for reporting a post
router.post('/report', reportPost);

module.exports = router;
