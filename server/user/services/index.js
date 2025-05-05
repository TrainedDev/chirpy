const uploadToCloudinary = require("../config/cloudinaryConfig");
const axios = require("axios");
const path = require("path");
const { Users: userModel } = require("../models");
const fs = require("fs");

const cloudinaryUpload = async (filepath) => {
    try {
        if (!filepath) return false;

        const response = await uploadToCloudinary(filepath);

        const uploadPath = path.dirname(__dirname);
        const folderPath = path.resolve(uploadPath, "uploads");

        fs.readdir(folderPath, (err, files) => {
            if (err) return console.error("upload folder not found", err);

            files.forEach(file => {
                const uploadFilePath = path.resolve(folderPath, file);

                fs.unlink(uploadFilePath, err => {
                    if (err) return console.log("failed to delete upload file", err);
                });
            });
        });

        return response;
    } catch (error) {
        console.log(error);
        return false;
    }
};

const fileValidation = (file) => {
    const type = /jpeg|jpg/;
    const fileExtType = type.test(path.extname(file.originalname.toLowerCase()));
    const fileMimeType = type.test(file.mimetype);

    return fileExtType && fileMimeType;
};

const checkOauthUser = async (access_token) => {
    try {
        if (!access_token) return false;

        const oauthUser = await axios.get(`https://www.googleapis.com/oauth2/v2/userinfo`, {
            headers: {
                Authorization: `Bearer ${access_token}`,
            },
        });

        const { id, picture, email, given_name } = oauthUser.data;
        const existUser = await userModel.findOne({ where: { oauth_id: id } });
        console.log(id)

        if (!existUser) {
            const newOauthUser = await userModel.create({ username: given_name, email, profileImg: picture, oauth_id: id });
            return newOauthUser;
        };

        return existUser;
    } catch (error) {
        console.log(error);
        return false;
    }
};

const userCookies = (res, token) => {
    res.cookie("token", token, {
        domain:".vercel.app",
        httpOnly: true, // javascript won't be able to access cookie
        secure: true, // works only in https
        sameSite:"None", // cross origin can cookies with all request methods if set to none and secure, strict-> only works if subdomain, register domain when cookies can be access ( basically mean both urls should be exact same), lax-> same like strict but can work different register domain and subdomain but with only get method
        maxAge: 1000 * 60 * 60 * 24, //1 day
    });
};
module.exports = { cloudinaryUpload, fileValidation, userCookies, checkOauthUser };