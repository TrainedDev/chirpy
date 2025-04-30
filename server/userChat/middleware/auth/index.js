require("dotenv").config();
const jwt = require("jsonwebtoken");

module.exports.socketAuth = (socket, next) => {
    try {
        const response = socket.handshake.headers;
console.log(response)
        let token;

        if (response.authorization) {
            token = response.authorization?.split(" ")[1];
        } else {
            token = response.cookie?.split(";").find(c => c.trim().startsWith("token=")).split("=")[1];
        }

        if (!token) return next(new Error("token missing! Access Denied"));
        
        const decode = jwt.verify(token, process.env.JWT_SECRET);

        socket.userId = decode.user_id;

        next();

    } catch (error) {
        next(new Error("User Authorization Failed"));
    }
};

module.exports.auth = (req, res, next) => {
    try {
        const token = req.cookies?.token || req.headers?.authorization.split(" ")[1];

        if(!token) return res.status(401).json(" token missing!, access denied");

        const decode = jwt.verify(token, process.env.JWT_SECRET);

        req.userId = decode.user_id;

        next();
    } catch (error) {
        res.status(500).json({ msg: "failed to authorize user", error: error.message })
    }
}

