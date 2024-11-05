// models/comment.js

const { DataTypes } = require('sequelize');
const sequelize = require('./../config/dbConf');
const UserPost = require('./post');
const User = require('./userModel'); // Make sure you import the User model

// Define the Comment model
const Comment = sequelize.define('Comment', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    userPostId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: UserPost,
            key: 'id',
        },
        onDelete: 'CASCADE',
    },
    userId: { // Add userId field to relate comments to users
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: User,
            key: 'id',
        },
    },
    content: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    like: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
    report: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
}, {
    timestamps: true,
});

// Setting up associations
UserPost.hasMany(Comment, {
    foreignKey: 'userPostId',
    onDelete: 'CASCADE',
});
Comment.belongsTo(UserPost, {
    foreignKey: 'userPostId',
});

User.hasMany(Comment, {
    foreignKey: 'userId',
});
Comment.belongsTo(User, {
    foreignKey: 'userId',
});

module.exports = Comment;
