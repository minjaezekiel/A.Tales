const nodemailer = require("nodemailer");
const crypto = require("crypto"); // To generate OTP

const Mailer = async (recipient,subject,html)=>{
    try{
        const  transporter= await nodemailer.createTransport({
            service:"gmail",
            auth:{
                user:"ezekielminja@gmail.com",
                pass: "gdfy oawq kgtv jcvg"
            }
        })
        const mailOptions ={
            from: process.env.EMAIL_USER,
            to:recipient,
            subject: subject,
            html: html
        };
        //send email
        let info = await transporter.sendMail(mailOptions);
        console.log('Email sent:', info.response);
    } catch (error){
        console.error('Error sending email:',error);
    }
}

const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000); // Generates a 6-digit OTP
};
const otp = generateOTP(); // Generate OTP

// Define the email content using your custom HTML
var html = `
<!DOCTYPE HTML>
<html>
<head>
<style>
p {
    background-color:red;
}
</style>
</head>
<body>
<div>
<h1>Email Verification</h1>
<p>Your OTP for verifying your email is: <strong>${otp}</strong></p>
</div>
</body>
</html>`;


module.exports = {Mailer,html,otp}