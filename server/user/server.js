const express = require("express");
const cors = require("cors");
const { route: userRoute } = require("./routes/userRoutes");
const fs = require("fs");
const path = require("path");
const cookieParser = require("cookie-parser");
const { sequelize } = require("./models");
require("pg");
require("dotenv").config();

const app = express();

const allowOrigin = ["http://localhost:5173", "https://chirpy-lake.vercel.app"];
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true
}));

app.options("*", cors({
  origin: (origin, callback) => {
    if(origin || allowOrigin.includes(origin)){
      callback(null, true);
    }else{
      callback(new Error("Not Allowed By cors"))
    }
  },
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ limit: "50mb", extended: true }))

const uploadDir = path.resolve(__dirname, "uploads");

if (!fs.existsSync(uploadDir)) {
  fs.mkdir(uploadDir, err => {
    if (err) return console.error(err);
  })
};

app.use("/auth", userRoute);

app.get("/", (req, res) => res.send("server is live"));

sequelize.authenticate().then(() => console.log("successfully connected to the database")).catch((error) => console.log("failed to connect database", error));

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => console.log("server is ready"));