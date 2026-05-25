const jwt = require("jsonwebtoken");

const generateAccessToken = (payload) => {

    return jwt.sign(
        {
            ...payload,
            tokenType:"access",
        },
        process.env.JWT_SECRET,
        {
            expiresIn: process.env.JWT_EXPIRES_IN || "7d",
        }
    );
};

const generateSetupToken = (payload) => {
    return jwt.sign({
        ...payload,
        tokenType:"setup",
    },
    process.env.JWT_SECRET,
    {
        expiresIn: process.env.JWT_SETUP_EXPIRES_IN || "15m",
    }
    );
}

const verifyToken = (token) => {
    return jwt.verify(token, process.env.JWT_SECRET);
}

module.exports = {
    generateAccessToken,
    generateSetupToken,
    verifyToken
}