/**
 * Anonymous Tales - User Model
 * Defines the User entity with fields for authentication, profile info,
 * and gender for anonymous chat identification.
 * 
 * @module models/userModel
 */

const { DataTypes } = require('sequelize');
const sequelize = require('../config/dbConf');

/**
 * User Model Definition
 * Represents a user in the Anonymous Tales platform
 * 
 * Key Features:
 * - UUID primary key for security (not sequential)
 * - Gender field for anonymous chat identification
 * - Email verification support
 * - Admin/Staff role support
 * - Password stored as bcrypt hash
 */
const User = sequelize.define('User', {
    /**
     * Unique identifier for the user (UUID v4)
     */
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        comment: 'Unique user identifier (UUID v4)'
    },
    
    /**
     * Username - displayed in anonymous chats and posts
     */
    username: {
        type: DataTypes.STRING(30),
        allowNull: false,
        validate: {
            notEmpty: true,
            len: [3, 30],
            is: /^[a-zA-Z0-9_]+$/ // Only alphanumeric and underscores
        },
        comment: 'Public display name for anonymous interactions'
    },
    
    /**
     * First name - optional real name
     */
    firstName: {
        type: DataTypes.STRING(50),
        allowNull: true,
        validate: {
            len: [0, 50]
        },
        comment: 'Optional real first name'
    },
    
    /**
     * Last name - optional real name
     */
    lastName: {
        type: DataTypes.STRING(50),
        allowNull: true,
        validate: {
            len: [0, 50]
        },
        comment: 'Optional real last name'
    },
    
    /**
     * User gender - used for anonymous chat identification
     * Allows users to know gender context during conversations
     */
    gender: {
        type: DataTypes.ENUM('male', 'female', 'other', 'prefer_not_to_say'),
        allowNull: false,
        defaultValue: 'prefer_not_to_say',
        comment: 'Gender for anonymous chat context identification'
    },
    
    /**
     * Email address - used for authentication and verification
     */
    email: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: {
            args: true,
            msg: 'Email address already in use'
        },
        validate: {
            isEmail: {
                msg: 'Please provide a valid email address'
            },
            notEmpty: true
        },
        comment: 'Unique email for account identification'
    },
    
    /**
     * Password hash - stored as bcrypt hash
     */
    password: {
        type: DataTypes.STRING(255),
        allowNull: false,
        validate: {
            notEmpty: true
        },
        comment: 'Bcrypt hashed password (never store plaintext)'
    },
    
    /**
     * Admin flag - grants administrative privileges
     */
    isAdmin: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Whether user has admin privileges'
    },
    
    /**
     * Staff flag - grants staff/moderator privileges
     */
    isStaff: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Whether user has staff/moderator privileges'
    },
    
    /**
     * OTP code - temporary storage during verification
     * Stored as hash for security
     */
    otp: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Hashed OTP for email verification'
    },
    
    /**
     * Email verification status
     */
    isVerified: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Whether email has been verified'
    },
    
    /**
     * Account status - for soft delete/disable
     */
    isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Whether account is active (soft delete)'
    },
    
    /**
     * Last login timestamp
     */
    lastLoginAt: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Timestamp of last successful login'
    }
}, {
    tableName: 'users',
    timestamps: true, // Adds createdAt and updatedAt
    paranoid: true, // Soft delete support (adds deletedAt)
    indexes: [
        {
            unique: true,
            fields: ['email'],
            name: 'idx_user_email'
        },
        {
            fields: ['username'],
            name: 'idx_user_username'
        },
        {
            fields: ['gender'],
            name: 'idx_user_gender'
        },
        {
            fields: ['isVerified'],
            name: 'idx_user_verified'
        }
    ],
    hooks: {
        /**
         * Before validation - trim string fields
         */
        beforeValidate: (user) => {
            if (user.username) user.username = user.username.trim().toLowerCase();
            if (user.email) user.email = user.email.trim().toLowerCase();
            if (user.firstName) user.firstName = user.firstName.trim();
            if (user.lastName) user.lastName = user.lastName.trim();
        }
    },
    defaultScope: {
        attributes: { exclude: ['password', 'otp'] }
    },
    scopes: {
        /**
         * Include sensitive fields (use with caution)
         */
        withSensitive: {
            attributes: { include: ['password', 'otp'] }
        },
        /**
         * Only active users
         */
        active: {
            where: { isActive: true }
        },
        /**
         * Only verified users
         */
        verified: {
            where: { isVerified: true }
        }
    }
});

/**
 * Instance method to get display name with gender indicator
 * Used in anonymous chat to show gender context
 * @returns {string} Formatted display name with gender indicator
 */
User.prototype.getAnonymousDisplayName = function() {
    const genderIndicators = {
        male: '♂',
        female: '♀',
        other: '○',
        prefer_not_to_say: '?'
    };
    
    return `${this.username} ${genderIndicators[this.gender] || '?'}`;
};

/**
 * Instance method to get public profile data
 * Returns safe data for public display
 * @returns {Object} Public user data
 */
User.prototype.getPublicProfile = function() {
    return {
        id: this.id,
        username: this.username,
        gender: this.gender,
        createdAt: this.createdAt,
        // Never expose email, real names, or sensitive data in anonymous context
    };
};

/**
 * Class method to find active user by email
 * @param {string} email - User email
 * @returns {Promise<User|null>}
 */
User.findActiveByEmail = async function(email) {
    return this.findOne({
        where: {
            email: email.toLowerCase().trim(),
            isActive: true
        }
    });
};

/**
 * Class method to check if username is available
 * @param {string} username - Username to check
 * @returns {Promise<boolean>}
 */
User.isUsernameAvailable = async function(username) {
    const count = await this.count({
        where: {
            username: username.toLowerCase().trim()
        }
    });
    return count === 0;
};

module.exports = User;