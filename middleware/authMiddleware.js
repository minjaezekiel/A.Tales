const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const app = express();
const server = http.createServer(app);
const io = new Server(server);


const ioAuthMiddleware = (socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
        return next(new Error("No token provided"));
    }

    try {
        const decoded = jwt.verify(token, "JWT_SECRET"); // Keep the secret consistent
        socket.username = decoded.username;
        next();
    } catch (error) {
        next(new Error("Authentication error"));
    }
}


module.exports = {ioAuthMiddleware}