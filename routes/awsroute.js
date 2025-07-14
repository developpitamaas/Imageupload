const express = require("express");
const AWS = express.Router();
const multer = require("multer");
const postController = require("../controllers/AWS");

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 500 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png|gif|webp|mp4|mov|avi|mkv/;
        const extname = filetypes.test((file.originalname).toLowerCase());
        const mimetype = filetypes.test(file.mimetype);
        
        if (extname && mimetype) {
            return cb(null, true);
        } else {
            cb('Error: Only images (JPEG, JPG, PNG, GIF, WEBP) and videos (MP4, MOV, AVI, MKV) are allowed!');
        }
    }
}).single("file");

AWS.post(
    "/aws-file",
    upload,
    postController.createPost
);

module.exports = AWS;