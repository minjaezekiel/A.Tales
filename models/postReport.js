// models/report.js
const { DataTypes } = require('sequelize');
const sequelize = require('./../config/dbConf');
const User = require('./userModel');
const UserPost = require('./post'); 

// Define the Report model
const Report = sequelize.define('Report', {
    userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: User,
            key: 'id',
        },
        onDelete: 'CASCADE',
    },
    postId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: UserPost,
            key: 'id',
        },
        onDelete: 'CASCADE',
    },
    reason: {
        type: DataTypes.STRING,
        allowNull: false,
    },
}, {
    timestamps: true,
});

// Setting up associations
User.hasMany(Report, { foreignKey: 'userId', onDelete: 'CASCADE' });
Report.belongsTo(User, { foreignKey: 'userId' });

UserPost.hasMany(Report, { foreignKey: 'postId', onDelete: 'CASCADE' });
Report.belongsTo(UserPost, { foreignKey: 'postId' });

// Sync the model
/*
Report.sync({ force: false })
    .then(() => {
        console.log('Report table has been created or altered.');
    })
    .catch((error) => {
        console.error('Failed to create Report table:', error);
    });
*/
module.exports = Report;
