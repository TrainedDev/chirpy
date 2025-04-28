const { Router } = require("express");
const { auth } = require("../middleware/auth");
const upload = require("../middleware/multer");
const { fetchUsersChat, uploadFile } = require("../controller/chatController");
const multer = require("multer");


const route = Router();

async function checkUpload(req, res, next) {
    upload(req, res, err => {
        if (err instanceof multer.MulterError) {
           return  res.status(400).json({ error: { description: err.message, field: err.field } })
        } else if (err) {
            return res.status(500).json({ msg: "failed to upload file", error: err.message });
        }
        next();
    });
};

route.get("/messages/:id", auth, fetchUsersChat);
route.post("/upload/files", auth, checkUpload, uploadFile);

module.exports = { route }