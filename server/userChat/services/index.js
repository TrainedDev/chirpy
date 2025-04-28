const uploadToCloudinary = require("../config/cloudinaryConfig");
const fs = require("fs");
const path = require("path");

const cloudinaryUpload = async (filepath) => {
    try {
        const response = await uploadToCloudinary(filepath);

        const getDefaultPath = path.dirname(__dirname);
        const getUploadPath = path.resolve(getDefaultPath, "uploads");

        fs.readdir(getUploadPath, (err, files) => {
            if (err) return console.error("upload folder not found", err);

            files.forEach(file => {
                const filepath = path.join(getUploadPath, file);
                fs.unlink(filepath, err => {
                    if (err) return console.error(err)
                })
            })
        });
        return response;
    } catch (error) {
        console.log(error);
    }
};

module.exports = cloudinaryUpload;