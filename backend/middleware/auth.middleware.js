const { verifyToken }  = require("../utils/jwt");

const authmiddleware = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader) {
            return res.status(401).json({
                success: false,
                message: "Authorization header missing",
            });
        }

        const [bearer, token] = authHeader.split(" ");

        if (bearer !== "Bearer" || !token) {
            return res.status(401).json({
                success: false,
                message: "Invalid authorization",
            });
        }

        const decoded = verifyToken(token);

        if(decoded.tokenType !== "access"){
            return res.status(401).json({
                success: false,
                message: "Access Token required"
            });
        }
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: "Invalid or expired token",
        });
    }
}

module.exports = authmiddleware;