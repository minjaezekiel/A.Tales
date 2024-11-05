//loginRoute.js
const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const User = require("./../models/userModel");
const jwt = require("jsonwebtoken");



router.route('/').post( async (req,res)=>{
    try {
            const { email, password } = req.body; // Use email and password
        console.log(email)
            // Find the user by email
            const user = await User.findOne({ where: { email } });
            console.log('User found:', user); // Log the found user
    
            if (!user) {
                return res.status(401).json({ error: 'Invalid email or password' });
            }
    
            // Check if password matches
            const isPasswordValid = await bcrypt.compare(password, user.password);
            if (!isPasswordValid) {
                return res.status(401).json({ error: 'Invalid email or password' });
            }
    
            // Create JWT token
            const token = jwt.sign({ id: user.id, email: user.email, username: user.username }, "JWT_SECRET", { expiresIn: '1h' });
            
    
            // Return token and user info
            res.status(200).json({
                message: 'Login successful',
                token,
                user: {
                    username: user.username,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    email: user.email,
                    isAdmin: user.isAdmin,
                    isStaff: user.isStaff,
                }
            });
            
        } catch (error) {
            console.error('Login error:', error); // Log the error details
            res.status(500).json({ error:  error.message, details: error.message }); // Send the error message
        }
    
})




module.exports = router