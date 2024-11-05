const { Sequelize, DataTypes } = require('sequelize');
const sequelize = require("./../config/dbConf"); 
const User = require('./../models/userModel');

// Define the UserPost model
const UserPost = sequelize.define('UserPost', {
   // Define the foreign key as UUID
   id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4, // Automatically generate UUIDs
    primaryKey: true,
},
    userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: User, 
            key: 'id',  // Assuming 'id' is UUID in the User model
        },
        onDelete: 'CASCADE',
    },
    content: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    like: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        default: false,
    },
    createdAt: {
        type: DataTypes.DATE,
        defaultValue: Sequelize.NOW,
    },
}, {
    timestamps: true,
});

// Setting up associations
User.hasMany(UserPost, {
    foreignKey: 'userId',
    onDelete: 'CASCADE',
});
UserPost.belongsTo(User, {
    foreignKey: 'userId',
});

// Sync the model
/*
UserPost.sync({ force: false })
    .then(() => {
        console.log('UserPost table has been created or altered.');
    })
    .catch((error) => {
        console.error('Failed to create UserPost table:', error);
    });
*/
module.exports = UserPost;
