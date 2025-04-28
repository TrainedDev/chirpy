require("dotenv").config();
const { v2: cloudinary } = require("cloudinary");

const cloudinaryConfig = () => {
    cloudinary.config();
};

const uploadToCloudinary = async (filepath) => {
    try {

        cloudinaryConfig();

        if(!filepath) return false;

        const response = cloudinary.uploader.upload(filepath);

        return response;
        
    } catch (error) {
        console.log(error);
        return false;
    }
};

module.exports = uploadToCloudinary;