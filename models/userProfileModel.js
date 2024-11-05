// models/Profile.js
const { Sequelize,DataTypes } = require('sequelize');
const sequelize = require("./../config/dbConf");
const User = require('./../models/userModel');


 // Define the UserProfile model
const UserProfile = sequelize.define('UserProfile', {
    id: {
        type: DataTypes.UUID,
        defaultValue: Sequelize.UUIDV4,   
        primaryKey: true
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: User, // References the User model
            key: 'id'
        }
    },
    bio: {
        type: DataTypes.TEXT,          
        allowNull: true                   
    },
   //timestamps enables auto addition of createdAt and UpdatedAt fields
}, {
    tableName: 'user_profiles',
    timestamps: true                     
});



User.hasOne(UserProfile, {
    foreignKey: 'userId',
    onDelete: 'CASCADE', // Delete profile when user is deleted
    onUpdate: 'CASCADE' // Update profile if user is updated
});
UserProfile.belongsTo(User, { foreignKey: 'userId' });

// Sync the UserProfile model with the database
/*
UserProfile.sync({ force: false })
    .then(() => {
        console.log('UserProfile table has been created or altered.');
    })
    .catch((error) => {
        console.error('Failed to create UserProfile table:', error);
    });
*/
module.exports = UserProfile;
