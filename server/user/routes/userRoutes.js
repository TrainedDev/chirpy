const { Router } = require("express");
const multer = require("multer");
const upload = require("../middleware/multer");
const UNEXPECT_FILE_TYPE = require("../constants");
const { register, login, googleLogin, fetchGoogleAccessToken, fetchUserProfile, fetchAllUsers, logout } = require("../controller/userController");
const auth = require("../middleware/auth");

const route = Router();

function uploadUserProfilePic(req, res, next) {
    upload(req, res, (err) => {
        if(!req.file) return res.status(400).json("required file not found")
        if (err instanceof multer.MulterError) {
            if (err === UNEXPECT_FILE_TYPE.code) return res.status(400).json({ error: { description: err.field } });
        } else if(err) {
            res.status(500).json({ msg: "failed to upload profile pic", error: err });
        };
        next();
    });
};

route.post("/register", uploadUserProfilePic, register);
route.post("/login", login);
route.get("/google", googleLogin);
route.get("/google/callback", fetchGoogleAccessToken);
route.get("/user/profile", auth, fetchUserProfile);
route.get("/fetch/users", fetchAllUsers);
route.get("/logout", logout);

module.exports = { route };