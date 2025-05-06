require("dotenv").config();
const jwt = require("jsonwebtoken");

module.exports.socketAuth = (socket, next) => {
    try {
        const headers = socket.handshake.headers;
        
        let token;
        if (headers.authorization) {

            token = headers.authorization.replace('Bearer ', '').trim();

        } else if (headers.cookie) {
            const cookieToken = headers.cookie
                .split(';')
                .find(c => c.trim().startsWith('token='));

            if (cookieToken) {
                token = cookieToken.split('=')[1];
            }
        }

        if (!token) return next(new Error("token missing! Access Denied"));

        const decode = jwt.verify(token, process.env.JWT_SECRET);

        socket.userId = decode.user_id;

        next();

    } catch (error) {
        console.error('JWT Error:', error.message);
        next(new Error("User Authorization Failed", + error.message));
    }
};

module.exports.auth = (req, res, next) => {
    try {

        const token = req.cookies?.token || req.headers?.authorization.split(" ")[1];

        if (!token) return res.status(401).json(" token missing!, access denied");

        const decode = jwt.verify(token, process.env.JWT_SECRET);

        req.userId = decode.user_id;

        next();
    } catch (error) {
        res.status(500).json({ msg: "failed to authorize user", error: error.message })
    }
}

