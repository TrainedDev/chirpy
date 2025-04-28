require("dotenv").config();
const mongoose = require("mongoose")

const uri = process.env.MONGO_URL;

const connectDb = async () => {
    try {
        await mongoose.connect(uri);
        console.log("successfully connected to the mongo database");
    } catch (error) {
        console.log("failed to connect mongo db", error);
    }
};

module.exports = connectDb;