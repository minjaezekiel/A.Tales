const express = require('express');
const {
    getUserProfile,
    createUserProfile,
    updateUserProfile
} = require('./../controllers/userProfileController');

const router = express.Router();

// Get a user's profile by userId
router.route('/:userId').get(getUserProfile);

// Create a new profile with bio
router.route('/').post(createUserProfile);

// Update the user's profile bio
router.route('/').put(updateUserProfile);

module.exports = router;
