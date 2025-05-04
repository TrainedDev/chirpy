require("dotenv").config();
const { Users: userModel } = require("../models");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { cloudinaryUpload, checkOauthUser, userCookies } = require("../services");
const axios = require("axios");

const jwt_Secret = process.env.JWT_SECRET;

const register = async (req, res) => {
    try {
        const { username, email, password } = req.body;
        const filePath = req.file.path;

        console.log(req.body, req.file)

        if (!filePath || !username || !email || !password) return res.status(400).json("required details not found");

        const response = await cloudinaryUpload(filePath);

        const existUser = await userModel.findOne({ where: { email } });

        if (existUser) return res.status(400).json("user already exist");

        const profileImg = response.secure_url;

        const saltPassword = await bcrypt.genSalt(10);

        const hashPassword = await bcrypt.hash(password, saltPassword);

        const newUser = await userModel.create({ ...req.body, profileImg, password: hashPassword });

        const token = jwt.sign({ user_id: newUser.id }, jwt_Secret, { expiresIn: "2h" });

        userCookies(res, token);

        const { password: _, ...data } = newUser.get({ plain: true })
        res.status(201).json({ msg: "user successfully registered", user: data });

    } catch (error) {
        console.log(error.message)
        res.status(500).json({ msg: "failed to register user", error: error.message })
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json("required details not found");

        const existUser = await userModel.findOne({ where: { email } });

        if (!existUser) return res.status(400).json("invalid credentials");

        const checkPassword = await bcrypt.compare(password, existUser.password);

        if (!checkPassword) return res.status(400).json("invalid credentials");

        const token = jwt.sign({ user_id: existUser.id }, jwt_Secret, { expiresIn: "2h" });

        userCookies(res, token);

        res.status(200).json({ msg: "user successfully logged in" });
    } catch (error) {
        res.status(500).json({ msg: "failed to logged in user", error: error.message })
    }
};

const googleLogin = async (req, res) => {
    try {
        const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${process.env.CLIENT_ID}&redirect_uri=${process.env.BACKEND_URL}/auth/google/callback&response_type=code&scope=email profile`;

        res.redirect(url);
    } catch (error) {
        res.status(500).json({ msg: "failed to logged with google", error: error.message })
    }
};


const fetchGoogleAccessToken = async (req, res) => {
    try {
        const { code } = req.query;

        if (!code) return res.status(400).json("required code missing!");

        const tokenResponse = await axios.post("https://oauth2.googleapis.com/token",
            {
                client_id: process.env.CLIENT_ID,
                client_secret: process.env.CLIENT_SECRET,
                code,
                grant_type: "authorization_code",
                redirect_uri: `${process.env.BACKEND_URL}/auth/google/callback`
            },
            {
                headers: { "Content-Type": "application/x-www-form-urlencoded" }
            }
        );

        const access_token = tokenResponse.data.access_token;

        const data = await checkOauthUser(access_token);

        if (!data) return res.status(400).json("failed to create oauth user");

        const token = jwt.sign({ user_id: data.id }, jwt_Secret, { expiresIn: "2h" });

        userCookies(res, token);

        res.redirect(`${process.env.FRONTEND_URL}/dashboard`);

    } catch (error) {
        res.status(500).json({ msg: "failed to user access token from google", error: error.message });
    }
};

const fetchUserProfile = async (req, res) => {
    try {
        const id = req.userId;
        if (!id) return res.status(400).json("required details not found");

        const userProfile = await userModel.findOne({ where: { id } });

        const { password: _, ...userData } = userProfile.get({ plain: true });

        res.status(200).json({ msg: "user profile successfully fetched", user: userData });
    } catch (error) {
        console.log(error.message)
        res.status(500).json({ msg: "failed to fetch user profile", error: error.message })
    }
};

const fetchAllUsers = async (req, res) => {
    try {

        const getUser = await userModel.findAll();

        if (getUser.length === 0) return res.status(404).json("no user found");

        const usersData = getUser.map(user => ({
            id: user.id,
            username: user.username,
            profileImg: user.profileImg,
            oauth_id: user.oauth_id
        }));


        res.status(200).json({ msg: "users successfully fetched", data: usersData });

    } catch (error) {
        console.log(error.message);
        res.status(500).json({ msg: "failed to fetch all users", error: error.message })
    }
};

const fetchToken = async (req, res) => {
    try {
        const token = req.cookies.token;

        if (!token) res.status(400).json("required token not found");

        res.status(200).json(token);
    } catch (error) {
        res.status(500).json({ msg: "failed to fetch token", error: error.message })
    }
};

const logout = (req, res) => {
    try {

        res.clearCookie("token", {
            domain:".vercel.app",
            httpOnly: true,
            secure: true,
            sameSite: "lax",
            // maxAge: 0

        });

        res.status(200).json({ msg: "logged Out" })
    } catch (error) {
        res.status(500).json({ msg: "failed to logout", error: error.message })
    }
}
module.exports = { register, login, googleLogin, fetchGoogleAccessToken, fetchUserProfile, fetchAllUsers, fetchToken, logout };