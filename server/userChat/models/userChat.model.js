const mongoose = require("mongoose");

const chat = new mongoose.Schema({
    senderId: {
        type: String,
        required: true, 
    },
    receiverId: {
        type: String,
        required: true,
    },
    message: {
        type: String,
    },

    uploadFile: {
        type: [String]
    }
}, 
{ timestamps: true });

module.exports = mongoose.model("user_msg", chat);

