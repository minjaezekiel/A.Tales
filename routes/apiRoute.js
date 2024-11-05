//routes/apiRoute.js
const express = require("express");
const router = express.Router();
const {
    apiCreateUser,otpVerification, apiFindAllUsers, apiFindUser, apiUpdateUser, apiDeleteUser,
    apiCreatePost, apiGetAllPosts, apiUpdatePost, apiDeletePost,
    apiGetUserProfile, apiCreateUserProfile, apiUpdateUserProfile
} = require("../controllers/apiController"); // Consolidated import for all API controllers

//-------------API ROUTES FOR USER CRUD--------
// Route -> create user
router.route('/users').post(apiCreateUser);

// Route -> find all users
router.route('/users').get(apiFindAllUsers);

// Route -> find single user by :id
router.route('/users/:id').get(apiFindUser);

// Route -> update a user by :id (use PUT)
router.route('/users/:id').put(apiUpdateUser);

// Route -> delete a user by :id (use DELETE)
router.route('/users/:id').delete(apiDeleteUser);

//--------API ROUTES FOR USER POSTS--------------
// Route -> create a post
router.route('/posts/:userID').post(apiCreatePost);

// Route -> fetch all posts
router.route('/posts').get(apiGetAllPosts);

// Route -> update a post by :postId
router.route('/posts/:postId').put(apiUpdatePost);

// Route -> delete a post by :postId
router.route('/posts/:postId').delete(apiDeletePost);

//-----------USER PROFILE ROUTES-------------------
// Route -> get a user's profile by :userId
router.route('/profiles/:userId').get(apiGetUserProfile);

// Route -> create a new user profile
router.route('/profiles').post(apiCreateUserProfile);

// Route -> update a user's profile by :userId
router.route('/profiles/:userId').put(apiUpdateUserProfile);

module.exports = router;
