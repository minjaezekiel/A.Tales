const UserPost = require('./../models/post');
const User = require('./../models/userModel');
const Like = require('../models/postLikes');

// Function to like a post
const likePost = async (req, res) => {
    const { userId, postId } = req.body;

    // Validate input
    if (!userId || !postId) {
        return res.status(400).json({ message: "User ID and Post ID are required." });
    }

    try {
        // Check if the post exists
        const post = await UserPost.findByPk(postId);
        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }

        // Check if the user has already liked the post
        const existingLike = await Like.findOne({ where: { userId, postId } });
        if (existingLike) {
            return res.status(400).json({ message: 'You have already liked this post' });
        }

        // Create a new like
        await Like.create({ userId, postId });
        console.log("New Like Created for Post ID:", postId);

        // Increment the like count for the post
        await Like.increment('likeCount', { where: { postId } }); // Incrementing likeCount in Like model
        console.log("Incremented likeCount for Post ID:", postId);

        // Fetch the updated like count for the post
        const updatedLike = await Like.findOne({ where: { postId } });
        const likeCount = updatedLike ? updatedLike.likeCount : 1; // Set likeCount to 1 if no previous likes

        res.json({ message: "Post liked successfully.", likeCount });
    } catch (err) {
        console.error("Error while liking the post:", err.message || err);
        res.status(500).json({ message: "An error occurred while liking the post.", error: err.message });
    }
};

// Function to unlike a post
const unlikePost = async (req, res) => {
    const userId = req.user.id; // Assuming you have middleware that sets req.user
    const postId = req.params.postId;

    try {
        // Check if the like exists
        const existingLike = await Like.findOne({ where: { userId, postId } });
        if (!existingLike) {
            return res.status(400).json({ message: "You have not liked this post yet." });
        }

        // Remove the like
        await Like.destroy({ where: { userId, postId } });
        console.log("Like Removed for Post ID:", postId);

        // Decrement the like count for the post
        await Like.decrement('likeCount', { where: { postId } });
        console.log("Decremented likeCount for Post ID:", postId);

        // Fetch the updated like count for the post
        const updatedLike = await Like.findOne({ where: { postId } });
        const likeCount = updatedLike ? updatedLike.likeCount : 0; // Set to 0 if no likes left

        res.json({ message: "Post unliked successfully.", likeCount });
    } catch (err) {
        console.error("Error while unliking the post:", err.message || err);
        res.status(500).json({ message: "An error occurred while unliking the post.", error: err.message });
    }
};

// Function to get the like count for a post
const getPostLikes = async (req, res) => {
    const postId = req.params.postId;
    console.log(`${postId} from getPostLikes`)
    try {
        // Fetch the total likes count for the post
        const totalLikes = await Like.sum('likeCount', { where: { postId } });

        console.log("Fetched Likes for Post ID:", postId, "Total Likes Count:", totalLikes);

        res.json({ likeCount: totalLikes || 0 });
    } catch (err) {
        console.error("Error occurred while fetching likes:", err.message || err);
        res.status(500).json({ message: "An error occurred while fetching likes.", error: err.message });
    }
};

module.exports = { likePost, unlikePost, getPostLikes};
