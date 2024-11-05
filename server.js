  
const express = require("express");
const commentRouter = require("./routes/commentRoute")
const loginRouter = require("./routes/loginRoute");
const likesRoute = require("./routes/likesRoute");
const adminRouter = require("./routes/adminRoute.js");
const userRouter = require("./routes/userRoute.js");
const apiRouter = require("./routes/apiRoute.js");
const profileRouter = require("./routes/userProfileRoute");
const postRouter = require("./routes/userPostRoute");
const sequelize = require("./config/dbConf");
const bodyParser = require("body-parser");
const sendMail = require("./mailer/mailBroker");
const Router= require("splannes_routerjs/router.js");
const http = require("http"); // Import the HTTP module
const setupSocket = require("./controllers/socketHandler"); // Import the socket handler

// Requiring dotenv for environment variables
require("dotenv").config();
const port = process.env.PORT || 3000;
const app = express();
const server = http.createServer(app); // Create an HTTP server with Express app
const Comment  = require("./models/userCommentModel");
const Report = require("./models/postReport");
const Reply = require("./models/userReplyModel")
const User = require("./models/userModel");
const Like = require("./models/postLikes");
const UserProfile = require("./models/userProfileModel");
const UserPost = require("./models/post");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

// Testing the database connection
sequelize.authenticate()
  .then(() => {
    console.log("Connection has been established successfully!");
  })
  .catch((error) => {
    console.log("Unable to connect to the database", error);
  });

// Sync sequelize models
async function syncDatabase() {
    await User.sync();           // Create User table
    await UserPost.sync();       // Create UserPost table
    await UserProfile.sync({force:true});    // Create UserProfile table
    await Report.sync(); 
    await Comment.sync();
    await Reply.sync(); 
    await Like.sync();      // Create Report table
}

syncDatabase().then(() => {
    console.log("Database synced successfully");
}).catch(err => {
    console.error("Failed to sync database:", err);
});

// Set view engine
app.set("view engine", "ejs");

// Middleware
app.use(bodyParser.json());
app.use(express.static("views"));
app.use(express.json());

// Routes
app.use('/login', loginRouter);
app.use('/admin', adminRouter);
app.use('/users', userRouter);
app.use('/api', apiRouter);
app.use('/profile', profileRouter);
app.use('/posts', postRouter);
app.use('/comments', commentRouter);
app.use('/likes',likesRoute);


app.get('/', (req, res) => {
  res.redirect('views/login.html');
});



// Setup Socket.io
setupSocket(server);

// Starting the server
server.listen(port, () => {
  console.log(`Server running on 127.0.0.1:${port}`);
});

/*
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const users = []; // Store users for demonstration purposes, use a database in production
const chatHistory = {}; // To store private chat history between users (in-memory storage)

// Middleware
app.use(bodyParser.json());
app.use(cors());
app.use(express.static("assey")); // Serve static files from the 'public' directory

// Register Route
app.post("/register", (req, res) => {
    const { username, password } = req.body;
    const existingUser = users.find((user) => user.username === username);

    if (existingUser) {
        return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    users.push({ username, password: hashedPassword });
    res.status(201).json({ message: "User registered successfully" });
});

// Login Route
app.post("/login", (req, res) => {
    const { username, password } = req.body;
    const user = users.find((user) => user.username === username);

    if (!user || !bcrypt.compareSync(password, user.password)) {
        return res.status(401).json({ message: "Invalid credentials" });
    }

    // Generate JWT token
    const token = jwt.sign({ username }, "SECRET_KEY", { expiresIn: "1h" });
    res.json({ token });
});

// Middleware to authenticate WebSocket connections
io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    try {
        const decoded = jwt.verify(token, "SECRET_KEY");
        socket.username = decoded.username;
        next();
    } catch (error) {
        next(new Error("Authentication error"));
    }
});

// Socket.io connection
io.on("connection", (socket) => {
    console.log(`${socket.username} connected`);

    // Emit the list of logged-in users to the newly connected client
    const connectedUsers = Array.from(io.sockets.sockets.values()).map((s) => ({
        username: s.username,
    }));
    io.emit("users", connectedUsers);

    // Private chat initiation
    socket.on("startPrivateChat", ({ recipient }) => {
        const recipientSocket = Array.from(io.sockets.sockets.values()).find(
            (s) => s.username === recipient
        );

        if (recipientSocket) {
            const chatKey = [socket.username, recipient].sort().join("-");
            const messages = chatHistory[chatKey] || [];
            socket.emit("privateChatHistory", { recipient, messages });
        }
    });

    // Private message handling
    socket.on("privateMessage", ({ recipient, message }) => {
        const chatKey = [socket.username, recipient].sort().join("-");
        const newMessage = { sender: socket.username, message };

        // Save message to chat history
        if (!chatHistory[chatKey]) {
            chatHistory[chatKey] = [];
        }
        chatHistory[chatKey].push(newMessage);

        // Send message to recipient if they are online
        const recipientSocket = Array.from(io.sockets.sockets.values()).find(
            (s) => s.username === recipient
        );

        if (recipientSocket) {
            recipientSocket.emit("privateMessage", newMessage);
        }
        socket.emit("privateMessage", newMessage);
    });

    // Handle disconnect
    socket.on("disconnect", () => {
        console.log(`${socket.username} disconnected`);
        // Update the list of logged-in users when a user disconnects
        const connectedUsers = Array.from(io.sockets.sockets.values()).map((s) => ({
            username: s.username,
        }));
        io.emit("users", connectedUsers);
    });
});

// Start the server
const PORT = process.env.PORT || 9000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
*/