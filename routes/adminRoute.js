// routes/adminRoutes.js
const express = require('express');
const {
    createUser,
    getAllUsers,
    updateUser,
    deleteUser,
    createOrUpdateProfile,
    getUserProfile,
    deleteUserProfile,
    getUserPosts,
    createPostForUser,
    updateUserPost,
    deleteUserPost,
} = require('../controllers/adminController');

const router = express.Router();

// User routes
router.route('/users').post(createUser);
router.route('/users').get(getAllUsers);
router.route('/users/:userId').put(updateUser);
router.route('/users/:userId',).delete(deleteUser);

// Profile routes
router.route('/users/:userId/profile').post(createOrUpdateProfile);
router.route('/users/:userId/profile').get(getUserProfile);
router.route('/users/:userId/profile').delete(deleteUserProfile);

// Post routes
router.route('/users/:userId/posts').get(getUserPosts);
router.route('/users/:userId/posts').post(createPostForUser);
router.route('/posts/:postId').put(updateUserPost);
router.route('/posts/:postId', ).delete(deleteUserPost);

module.exports = router;
