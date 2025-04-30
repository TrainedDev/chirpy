require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { Server } = require("socket.io");
const http = require("http");
const userModel = require("./models/userChat.model");
const auth = require("./middleware/auth");
const { route: chatRoutes } = require("./routes/userChatRoutes");
const cookiesParser = require("cookie-parser");
const connectDb = require("./DB");
const path = require("path");
const fs = require("fs");
const app = express();

app.use((req, res, next) => {
    console.log("Incoming Origin:", req.headers.origin);
    next();
});


app.use(cors({
    origin: ["https://chirpy-lake.vercel.app"],
    credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ limit: "70mb", extended: true }));
app.use(cookiesParser());
connectDb();

const PORT = process.env.PORT || 3002;
const fileDir = path.resolve(__dirname, "uploads");

if (!fs.existsSync(fileDir)) {
    fs.mkdir(fileDir, err => {
        if (err) return console.log(err)
    })
}

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: ["https://chirpy-lake.vercel.app"],
        credentials: true
    }
});

app.use("/user", chatRoutes);

io.use(auth.socketAuth);

io.on("connection", (socket) => {

    console.log("new client connected", socket.userId);

    socket.on("messages", async (data) => {
        const { receiverId, message } = data
        const senderId = socket.userId;
        console.log(data, senderId)
        if (!senderId || !receiverId) return socket.emit("not-found", "required details not found");
        if (!message) return socket.emit("empty-msg", "empty message cannot be send");

        const newUserChat = new userModel({
            senderId,
            receiverId,
            message
        });

        await newUserChat.save();
        const msgData = { senderId, receiverId, message };
        socket.broadcast.emit("send-message", msgData)
    });


});


app.get("/", (req, res) => res.send("server is live"));

server.listen(PORT, () => console.log("server is ready"));
