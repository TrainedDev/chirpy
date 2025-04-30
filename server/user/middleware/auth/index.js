require("dotenv").config();
const jwt = require("jsonwebtoken");

const auth = (req, res, next) => {
    try {
        
        const token = req.cookies.token || req.headers.authorization.split(" ")[1];
console.log(token)
        if(!token) return res.status(401).json("required token missing! Unauthorize");

        const decode = jwt.verify(token, process.env.JWT_SECRET);

        req.userId = decode.user_id;

        next();
    } catch (error) {
        res.status(500).json({ msg: "failed to verify user", error: error.message });
    }
};

module.exports = auth;