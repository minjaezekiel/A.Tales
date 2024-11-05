//routes/userRoute.js
const express = require("express");
const router = express.Router();
const {createUser,/*loginUser,*/ otp_verification,findAllUsers, findUser, updateUser, deleteUser} = require("./../controllers/userController");

//router -> create user route
router.route('/').post(createUser);

router.route('/verify').post(otp_verification);
// Route to handle login
//router.route('/login').post(loginUser);

//router -> find all user route
router.route('/').get(findAllUsers);

//router -> find single user by :id
router.route('/:id').get(findUser);

//router -> updating a user
router.route('/').post(updateUser);

//router -> delete user
router.route('/').post(deleteUser);

module.exports = router;