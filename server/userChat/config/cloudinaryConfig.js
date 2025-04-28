require("dotenv").config();
const { v2: cloudinary } = require("cloudinary");

const cloudinaryConfig =() => {
    cloudinary.config();
};

const uploadToCloudinary = async (filePath) => {
    try {
        cloudinaryConfig();

        const response = cloudinary.uploader.upload(filePath, {

            folder: "userChatFiles"
        })

        return response;
    } catch (error) {
        console.log(error)
    }
};

module.exports = uploadToCloudinary;