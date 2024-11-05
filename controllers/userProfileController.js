const UserProfile = require('./../models/userProfileModel');
const User = require('./../models/userModel');

// Get user profile
const getUserProfile = async (req, res) => {
    try {
        const { userId } = req.params;

        // Find the profile associated with the userId
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

// Add user profile bio
const createUserProfile = async (req, res) => {
    try {
        const { userId, bio } = req.body;

        // Ensure the user exists before creating the profile
        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Create the user profile
        const newProfile = await UserProfile.create({
            userId: user.id,
            bio,
        });

        return res.status(201).json(newProfile);
    } catch (error) {
        console.error('Error creating profile:', error);
        return res.status(500).json({ message: 'Server error' });
    }
};

// Update user profile bio
const updateUserProfile = async (req, res) => {
    try {
        const { userId,bio  } =  req.body;
        console.log('i was used id:', userId)

        // Find the profile associated with the userId
        const profile = await UserProfile.findOne({ where: { userId } });

        if (!profile) {
            return res.status(404).json({ message: 'Profile not found' });
        }

        // Update the profile bio
        profile.bio = bio;
        await profile.save();

        return res.status(200).json({ message: 'Profile updated', profile });
    } catch (error) {
        console.error('Error updating profile:', error);
        return res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    getUserProfile,
    createUserProfile,
    updateUserProfile
};
