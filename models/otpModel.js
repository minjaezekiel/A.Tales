/**
 * Anonymous Tales - OTP Model
 * Stores one-time passwords in the database for secure verification
 * instead of using in-memory storage which doesn't work in production
 * with multiple server instances.
 * 
 * OTPs are automatically expired after a configurable time period.
 */

const { DataTypes } = require('sequelize');
const sequelize = require('../config/dbConf');
const User = require('./userModel');

/**
 * OTP Model Definition
 * Stores temporary OTP codes linked to user emails for email verification
 */
const OTP = sequelize.define('OTP', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            isEmail: true
        },
        comment: 'Email address for which OTP is generated'
    },
    otp: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'The actual OTP code (hashed for security)'
    },
    userData: {
        type: DataTypes.JSONB,
        allowNull: true,
        comment: 'Temporary storage of user registration data during verification'
    },
    expiresAt: {
        type: DataTypes.DATE,
        allowNull: false,
        comment: 'Timestamp when OTP expires'
    },
    attempts: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: 'Number of verification attempts (max 3)'
    },
    isUsed: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'Whether this OTP has been successfully used'
    }
}, {
    tableName: 'otps',
    timestamps: true,
    indexes: [
        {
            fields: ['email'],
            name: 'idx_otp_email'
        },
        {
            fields: ['expiresAt'],
            name: 'idx_otp_expires'
        }
    ],
    hooks: {
        // Automatically clean up expired OTPs when creating new ones
        beforeCreate: async (otp) => {
            await OTP.destroy({
                where: {
                    email: otp.email,
                    expiresAt: { [require('sequelize').Op.lt]: new Date() }
                }
            });
        }
    }
});

/**
 * Class method to clean up all expired OTPs
 * Should be called periodically via a scheduled job
 */
OTP.cleanupExpired = async function() {
    const { Op } = require('sequelize');
    const deleted = await OTP.destroy({
        where: {
            [Op.or]: [
                { expiresAt: { [Op.lt]: new Date() } },
                { isUsed: true }
            ]
        }
    });
    return deleted;
};

/**
 * Instance method to check if OTP is expired
 * @returns {boolean}
 */
OTP.prototype.isExpired = function() {
    return new Date() > this.expiresAt;
};

/**
 * Instance method to check if max attempts reached
 * @returns {boolean}
 */
OTP.prototype.hasMaxAttempts = function() {
    return this.attempts >= 3;
};

module.exports = OTP;