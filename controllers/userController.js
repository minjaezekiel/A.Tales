const User = require("./../models/userModel");
const bcrypt = require("bcrypt");
const nodemailer=require("nodemailer");
const jwt = require('jsonwebtoken');
require('dotenv').config()
//POST /users -> Create a new user

var temporaryUserData = {}; // Temporary storage for user data (could use Redis or session for larger apps)
let verified = { "otp": null }; // Store the generated OTP for verification

// Function to generate OTP
const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000); // Generates a 6-digit OTP
};

/*const loginUser = async (req,res)=>{
    const {email, password} = req.body;
    console.log (email,password)
}*/

/*const loginUser = async (req, res) => {
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
        const token = jwt.sign({ id: user.id, email: user.email }, "JWT_SECRET", { expiresIn: '1h' });

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
};*/

// POST /users -> Step 1: Collect user data and send OTP to email
const createUser = async (req, res) => {
    try {
        const { username, firstName, lastName, email, password, isAdmin, isStaff } = req.body;

        // Store user data temporarily (using the email as a key for simplicity)
         temporaryUserData= {
            username: username,
            firstName: firstName,
            lastName: lastName,
            email: email,
            password: password,
            isAdmin: isAdmin,
            isStaff: isStaff
        };
        

        // Generate OTP
        const otp = generateOTP();
        verified.otp = otp;
   //transporter object
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,  // Hardcoded email user
        pass: process.env.EMAIL_PASS       // Hardcoded email password
    }
});

        // Send OTP email
        const mailOptions = {
            from: "Anonymous Tales<ezekielminja@gmail.com>",
            to: email,
            subject: "Your OTP for verification",
            html:`<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Email Verification</title>
    <style>
      body {
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        background-color: #eef2f7;
        margin: 0;
        padding: 20px;
        display: flex;
        justify-content: center;
        align-items: center;
        height: 100vh;
      }
      .email-container {
        max-width: 500px;
        background-color: #ffffff;
        padding: 30px;
        border-radius: 12px;
        box-shadow: 0 6px 18px rgba(0, 0, 0, 0.1);
        text-align: center;
      }
      h1 {
        color: #2a9d8f;
        font-size: 26px;
        margin-bottom: 15px;
        font-weight: 600;
      }
      p {
        font-size: 16px;
        color: #6c757d;
        margin-bottom: 20px;
        line-height: 1.6;
      }
      .otp {
        font-size: 22px;
        font-weight: bold;
        color: #e76f51;
        background-color: #f4a261;
        padding: 12px 18px;
        border-radius: 8px;
        display: inline-block;
        margin-bottom: 20px;
      }
      .copy-btn {
        background-color: #264653;
        color: #ffffff;
        border: none;
        padding: 10px 16px;
        font-size: 14px;
        border-radius: 6px;
        cursor: pointer;
        transition: background-color 0.3s;
      }
      .copy-btn:hover {
        background-color: #2a9d8f;
      }
      .footer {
        margin-top: 30px;
        font-size: 14px;
        color: #495057;
      }
    </style>
  </head>
  <body>
    <div class="email-container">
      <h1>Email Verification</h1>
      <p>
        Welcome to our community! To complete your registration, please use the One-Time Password (OTP) provided below. 
        <strong>Do not share this code</strong> with anyone for your security.
      </p>
      <div class="otp" id="otp">${otp}</div>
      <button class="copy-btn" onclick="copyToClipboard()">Copy OTP</button>
      <p class="footer">
        Best regards,<br>
        Minja Ezekiel<br>
        CEO & Developer at ATales
      </p>
    </div>
    <script>
      function copyToClipboard() {
        const otp = document.getElementById("otp").innerText;
        navigator.clipboard.writeText(otp).then(
          function () {
            alert("OTP copied to clipboard!");
          },
          function () {
            alert("Failed to copy OTP. Please try again.");
          }
        );
      }
    </script>
  </body>
</html>
`
            
        };

        await transporter.sendMail(mailOptions);
        console.log(`OTP ${otp} sent to ${email}`);

        
    } catch (error) {
        res.status(500).json({ error: "Error while sending OTP", details: error });
    }
};


  




// POST /verify-otp -> Step 2: Verify OTP and create user
const otp_verification = async (req, res) => {
    try {
        const { otp } = req.body;
      
        // Check if OTP is correct
   
        //console.log("im live")
        // Retrieve user data from temporary storage
        const userData = {...temporaryUserData};
        //console.log(userData.username)
        if (!userData) {
            console.log(userData)
            return res.status(400).json({ error: "User data not found" });
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(userData.password, 10);
//console.log(userData.email)
        // Create the user
        const newUser = await User.create({
            username: userData.username,
            firstName: userData.firstName,
            lastName: userData.lastName,
            email:  userData.email,
            password: hashedPassword,
            isAdmin: userData.isAdmin,
            isStaff: userData.isStaff,
            isVerified: true,
        });

        console.log("New user created: ", newUser);

        // Clear the temporary storage after successful user creation
        delete temporaryUserData;

        res.status(201).json(newUser);
    } catch (error) {
        res.status(500).json({ error: "Unable to verify OTP or create user", details: error });
    }
};


//GET /users -> get all users
const findAllUsers = async (req,res)=>{
    try{
        const users = await User.findAll({});
        if(users){
console.log(users)
            res.status(200).json(users);
        } else{
            res.send("There no current users");
        }
        
    } catch(error){
        res.status(500).json({error:'Unable to fetch users', details: error})
    }
}

//get single user
const findUser = async (req,res)=>{
    try{
        const user = await User.findByPk(req.params.id);
        if(user){
            res.status(200).json(user);
        } else{
            res.status(404).json({error:'Unable to fetch user' })
        } 
    } catch (error){
        res.status(500).json({error:'Unable to fetch user', details: error});
    }
}

const updateUser = async (req,res)=>{
    try{
        const {firstName, lastName, email, password, isAdmin, isStaff} = req.body;
        const user = await User.findByPk(req.params.id);
        if(user){
            user.firstName = firstName;
            user.lastName = lastName;
            user.email = email;
            user.password = password;
            user.isAdmin = isAdmin;
            user.isStaff = isStaff;
            
            await user.save(); //save changes to the database
            res.status(200).json(user);
        } else {
            res.status(404).json({error:'User not found'})
        }
    } catch(error){
                res.status(500).json({error:'Unable to update user', details: error});
    }
}

//delete /users/:id -> Delete a user by id 
const deleteUser = async (req,res)=>{
    try{
        const user = await User.findByPk(req.params.id);
        if(user){
            await user.destroy();
            res.status(204).send(); //204 -> No content on successful deletion
        } else {
            res.status(404).json({error:'User not found'});
        }
    } catch (error){
        res.status(500).json({error:'Unable to delete user', details: error});
    }
}



module.exports = {/*loginUser ,*/otp_verification,createUser, findAllUsers, findUser, updateUser, deleteUser}

