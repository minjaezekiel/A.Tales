const bcrypt = require("bcrypt");
const User = require("./../models/userModel");
const UserPost = require('./../models/post');
const UserProfile = require('./../models/userProfileModel');

// POST /users -> Create a new user
const apiCreateUser = async (req, res) => {
    try {
        const { firstName, lastName, email, password, isAdmin, isStaff } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = await User.create({
            firstName,
            lastName,
            email,
            password: hashedPassword, // Assign the hashed password here
            isAdmin,
            isStaff
        });
        res.status(201).json(newUser);
    } catch (error) {
        res.status(500).json({ error: 'Unable to create user', details: error });
    }
};

// GET /users -> Get all users
const apiFindAllUsers = async (req, res) => {
    try {
        const users = await User.findAll();
        if (users) {
            res.status(200).json(users);
        } else {
            res.status(404).send("No users found");
        }
    } catch (error) {
        res.status(500).json({ error: 'Unable to fetch users', details: error });
    }
};

// GET /users/:id -> Get a single user
const apiFindUser = async (req, res) => {
    try {
        const user_id = req.params.id
        const user = await User.findByPk({id:'b74c17c4-8192-4feb-9cd8-338b7c7cac2f'});
        console.log(user)
        if (user) {
            res.status(200).json(user);
        } else {
            res.status(404).json({ error: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Unable to fetch user', details: error });
    }
};

// PUT /users/:id -> Update a user by ID
const apiUpdateUser = async (req, res) => {
    try {
        const { firstName, lastName, email, password, isAdmin, isStaff } = req.body;
        const user = await User.findByPk(req.params.id);
        if (user) {
            user.firstName = firstName;
            user.lastName = lastName;
            user.email = email;
            user.password = await bcrypt.hash(password, 10); // Hash the new password
            user.isAdmin = isAdmin;
            user.isStaff = isStaff;

            await user.save();
            res.status(200).json(user);
        } else {
            res.status(404).json({ error: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Unable to update user', details: error });
    }
};

// DELETE /users/:id -> Delete a user by ID
const apiDeleteUser = async (req, res) => {
    try {
        const user = await User.findByPk(req.params.id);
        if (user) {
            await user.destroy();
            res.status(204).send(); // 204 -> No content on successful deletion
        } else {
            res.status(404).json({ error: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Unable to delete user', details: error });
    }
};

// POST /posts -> Create a post
const apiCreatePost = async (req, res) => {
    try {
        const { userId, content } = req.body;
        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        const post = await UserPost.create({ userId: user.id, content: content });
        return res.status(201).json(post);
    } catch (error) {
        return res.status(500).json({ message: 'Server error', details: error });
    }
};

// GET /posts -> Get all posts
const apiGetAllPosts = async (req, res) => {
    try {
        // Fetch all posts with associated user data
        const posts = await UserPost.findAll({
            include: {
                model: User,   // Include associated user data
                attributes: ['id', 'username'], // Specify the fields you want from the User model
            },
            order: [['createdAt', 'DESC']]  // Sort posts by creation date, newest first
        });

        // Return the posts as a JSON response
        return res.status(200).json(posts);
    } catch (error) {
        console.error('Error fetching posts:', error);
        return res.status(500).json({ message: 'Server error' });
    }
};

// PUT /posts/:postId -> Update a post by ID
const apiUpdatePost = async (req, res) => {
    try {
        const { postId } = req.params;
        const { content } = req.body;
        const post = await UserPost.findByPk(postId);
        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }
        post.content = content;
        await post.save();
        return res.status(200).json({ message: 'Post updated', post });
    } catch (error) {
        return res.status(500).json({ message: 'Server error', details: error });
    }
};

// DELETE /posts/:postId -> Delete a post by ID
const apiDeletePost = async (req, res) => {
    try {
        const { postId } = req.params;
        const post = await UserPost.findByPk(postId);
        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }
        await post.destroy();
        return res.status(200).json({ message: 'Post deleted' });
    } catch (error) {
        return res.status(500).json({ message: 'Server error', details: error });
    }
};

// GET /profiles/:userId -> Get a user's profile
const apiGetUserProfile = async (req, res) => {
    try {
        const { userId } = req.params;
        const profile = await UserProfile.findOne({ where: { userId } });
        if (!profile) {
            return res.status(404).json({ message: 'Profile not found' });
        }
        return res.status(200).json(profile);
    } catch (error) {
        return res.status(500).json({ message: 'Server error', details: error });
    }
};

// POST /profiles -> Create a user's profile
const apiCreateUserProfile = async (req, res) => {
    try {
        const { userId, bio } = req.body;
        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        const profile = await UserProfile.create({ userId: user.id, bio });
        return res.status(201).json(profile);
    } catch (error) {
        return res.status(500).json({ message: 'Server error', details: error });
    }
};

// PUT /profiles/:userId -> Update a user's profile
const apiUpdateUserProfile = async (req, res) => {
    try {
        const { userId } = req.params;
        const { bio } = req.body;
        const profile = await UserProfile.findOne({ where: { userId } });
        if (!profile) {
            return res.status(404).json({ message: 'Profile not found' });
        }
        profile.bio = bio;
        await profile.save();
        return res.status(200).json({ message: 'Profile updated', profile });
    } catch (error) {
        return res.status(500).json({ message: 'Server error', details: error });
    }
};

// Consolidated export for all controllers
module.exports = {
    apiCreateUser, apiFindAllUsers, apiFindUser, apiUpdateUser, apiDeleteUser,
    apiCreatePost, apiGetAllPosts, apiUpdatePost, apiDeletePost,
    apiGetUserProfile, apiCreateUserProfile, apiUpdateUserProfile
};
