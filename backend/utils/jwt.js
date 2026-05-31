const jwt = require("jsonwebtoken");

const getJwtSecret = () => process.env.JWT_SECRET || "rapid_fix_default_secure_secret_123456";

const generateAccessToken = (payload) => {
    return jwt.sign(
        {
            ...payload,
            tokenType:"access",
        },
        getJwtSecret(),
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
    getJwtSecret(),
    {
        expiresIn: process.env.JWT_SETUP_EXPIRES_IN || "15m",
    }
    );
}

const verifyToken = (token) => {
    return jwt.verify(token, getJwtSecret());
}

module.exports = {
    generateAccessToken,
    generateSetupToken,
    verifyToken
}