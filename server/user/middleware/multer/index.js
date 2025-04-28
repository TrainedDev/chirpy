const multer = require("multer");
const path = require("path");
const UNEXPECTED_IMAGE_TYPE = require("../../constants");
const { fileValidation } = require("../../services");

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "uploads");
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        const filterFileType = fileValidation(file);
        if(filterFileType) return cb(null, true);

        cb(new multer.MulterError(UNEXPECTED_IMAGE_TYPE.code, UNEXPECTED_IMAGE_TYPE.message));
    }
}).single("file")

module.exports = upload;