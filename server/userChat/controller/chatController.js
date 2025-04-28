const userChatModel = require("../models/userChat.model");
const cloudinaryUpload = require("../services");

const fetchUsersChat = async (req, res) => {
    try {
        const senderId = req.userId;
        const { id: receiverId } = req.params
        console.log(senderId, receiverId)

        if (!senderId || !receiverId) return res.status(400).json("required details not found");

        const fetchMessages = await userChatModel.find({
            $or: [
                { senderId, receiverId }, { senderId: receiverId, receiverId: senderId }
            ]
        }).sort({ createdAt: 1 });

        res.status(200).json({ msg: "messages successfully fetched", chats: fetchMessages });
    } catch (error) {
        console.log(error)
        res.status(500).json({ msg: "failed to fetch users chats", error: error.message })
    }
};

const uploadFile = async (req, res) => {
    try {
        const files = req.files;
        const senderId = req.userId;
        const { receiverId } = req.body

        // console.log(receiverId, senderId, files)

        if (!senderId || !receiverId) return res.status(400).json("required details not found");
        if (files.length === 0) return res.status(400).json("file not found");

        await Promise.all(files.map(async (file) => {

            const uploadFile = await cloudinaryUpload(file.path);


            await userChatModel.create({ senderId, receiverId, uploadFile: uploadFile.secure_url })
        }));

        res.status(200).json({ msg: "files successfully updated" });
    } catch (error) {
        res.status(500).json({ msg: "failed to upload user files", error: error.message })
    }
};

module.exports = { fetchUsersChat, uploadFile };



