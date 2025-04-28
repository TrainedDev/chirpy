const uploadToCloudinary = require("../config/cloudinaryConfig");
const axios = require("axios");
const path = require("path");
const { Users: userModel } = require("../models");
const fs = require("fs");

const cloudinaryUpload = async (filepath) => {
    try {
        if (!filepath) return false;

        const response = await uploadToCloudinary(filepath);

        fs.unlink(filepath, err => {
            if (err) return console.error(err);
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
        httpOnly: true,
        secure: true,
        maxAge: 1000*60*60*24
    });
};
module.exports = { cloudinaryUpload, fileValidation, userCookies, checkOauthUser };