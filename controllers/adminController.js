// controllers/adminController.js
const User = require('../models/userModel');
const UserProfile = require('../models/userProfileModel');
const UserPost = require('./../models/post');

// -------------- User CRUD -----------------
// Create a new user
const createUser = async (req, res) => {
    try {
        const { username, email, password, isAdmin } = req.body;
        const user = await User.create({ username, email, password, isAdmin });
        return res.status(201).json(user);
    } catch (error) {
        console.error('Error creating user:', error);
        return res.status(500).json({ message: 'Server error' });
    }
};

// Get all users
const getAllUsers = async (req, res) => {
    try {
        const users = await User.findAll();
        return res.status(200).json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        return res.status(500).json({ message: 'Server error' });
    }
};

// Update user details
const updateUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const { username, email, isAdmin } = req.body;
        const user = await User.findByPk(userId);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        user.username = username || user.username;
        user.email = email || user.email;
        user.isAdmin = isAdmin !== undefined ? isAdmin : user.isAdmin;

        await user.save();
        return res.status(200).json({ message: 'User updated', user });
    } catch (error) {
        console.error('Error updating user:', error);
        return res.status(500).json({ message: 'Server error' });
    }
};

// Delete a user
const deleteUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        await user.destroy();
        return res.status(200).json({ message: 'User deleted' });
    } catch (error) {
        console.error('Error deleting user:', error);
        return res.status(500).json({ message: 'Server error' });
    }
};

// -------------- UserProfile CRUD -----------------
// Create or update a user profile
const createOrUpdateProfile = async (req, res) => {
    try {
        const { userId } = req.params;
        const { bio } = req.body;

        let userProfile = await UserProfile.findOne({ where: { userId } });

        if (!userProfile) {
            userProfile = await UserProfile.create({ userId, bio });
        } else {
            userProfile.bio = bio;
            await userProfile.save();
        }

        return res.status(200).json({ message: 'Profile saved', userProfile });
    } catch (error) {
        console.error('Error saving profile:', error);
        return res.status(500).json({ message: 'Server error' });
    }
};

// Get a user's profile
const getUserProfile = async (req, res) => {
    try {
        const { userId } = req.params;
        const profile = await UserProfile.findOne({ where: { userId } });

        if (!profile) {
            return res.status(404).json({ message: 'Profile not found' });
        }

        return res.status(200).json(profile);
    } catch (error) {
        console.error('Error fetching profile:', error);
        return res.status(500).json({ message: 'Server error' });
    }
};

// Delete a user profile
const deleteUserProfile = async (req, res) => {
    try {
        const { userId } = req.params;
        const profile = await UserProfile.findOne({ where: { userId } });

        if (!profile) {
            return res.status(404).json({ message: 'Profile not found' });
        }

        await profile.destroy();
        return res.status(200).json({ message: 'Profile deleted' });
    } catch (error) {
        console.error('Error deleting profile:', error);
        return res.status(500).json({ message: 'Server error' });
    }
};

// -------------- UserPost CRUD -----------------
// Get all posts for a specific user
const getUserPosts = async (req, res) => {
    try {
        const { userId } = req.params;
        const posts = await UserPost.findAll({
            where: { userId },
            attributes: ['content', 'createdAt'],
        });

        return res.status(200).json(posts);
    } catch (error) {
        console.error('Error fetching posts:', error);
        return res.status(500).json({ message: 'Server error' });
    }
};

// Create a new post for a user
const createPostForUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const { content } = req.body;

        const post = await UserPost.create({ userId, content });
        return res.status(201).json(post);
    } catch (error) {
        console.error('Error creating post:', error);
        return res.status(500).json({ message: 'Server error' });
    }
};

// Update a user's post
const updateUserPost = async (req, res) => {
    try {
        const { postId } = req.params;
        const { content } = req.body;

        const post = await UserPost.findByPk(postId);

        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }

        post.content = content || post.content;
        await post.save();

        return res.status(200).json({ message: 'Post updated', post });
    } catch (error) {
        console.error('Error updating post:', error);
        return res.status(500).json({ message: 'Server error' });
    }
};

// Delete a user's post
const deleteUserPost = async (req, res) => {
    try {
        const { postId } = req.params;

        const post = await UserPost.findByPk(postId);

        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }

        await post.destroy();
        return res.status(200).json({ message: 'Post deleted' });
    } catch (error) {
        console.error('Error deleting post:', error);
        return res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
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
};
