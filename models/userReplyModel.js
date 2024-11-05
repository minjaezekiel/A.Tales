// models/reply.js

const {  DataTypes } = require('sequelize');
const sequelize = require('./../config/dbConf');
const Comment = require('./userCommentModel');

// Define the Reply model
const Reply = sequelize.define('Reply', {
    commentId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: Comment,
            key: 'id', // Assuming Comment's primary key is 'id'
        },
        onDelete: 'CASCADE',
    },
    content: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    like: {
        type: DataTypes.BOOLEAN,
        defaultValue: false, // Default value for the 'like' field
    },
    report: {
        type: DataTypes.BOOLEAN,
        defaultValue: false, // Default value for the 'report' field
    },
}, {
    timestamps: true,
});

// Setting up associations
Comment.hasMany(Reply, {
    foreignKey: 'commentId',
    onDelete: 'CASCADE',
});
Reply.belongsTo(Comment, {
    foreignKey: 'commentId',
});

// Sync the model
/*
Reply.sync({ force: false })
    .then(() => {
        console.log('Reply table has been created or altered.');
    })
    .catch((error) => {
        console.error('Failed to create Reply table:', error);
    });
*/
module.exports = Reply;

