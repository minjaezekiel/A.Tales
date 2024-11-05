//models/userModel.js
const {DataTypes} = require("sequelize");
const sequelize = require("./../config/dbConf");

//User model
const User = sequelize.define('User',{
    id:{
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    username:{
        type: DataTypes.STRING,
        allowNull: false
    },
    firstName:{
        type: DataTypes.STRING,
        allowNull: true
    },
    lastName:{
        type: DataTypes.STRING,
        allowNull: true
    },
    email:{
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate:{
            isEmail: true
        }
    },
    password:{
        type: DataTypes.STRING,
        allowNull: false
    },
    isAdmin:{
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    },
    isStaff:{
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    },
    otp:{
        type: DataTypes.INTEGER,
        allowNull: true,
    
    },
    isVerified:{
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    },
},{
    tableName: "users",
    timestamps: true,
});

/*
User.sync({ force: false })
    .then(() => {
        console.log('User table has been created or altered.');
    })
    .catch((error) => {
        console.error('Failed to create User table:', error);
    });
*/
module.exports = User;