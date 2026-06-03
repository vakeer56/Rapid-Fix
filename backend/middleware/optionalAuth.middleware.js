const { verifyToken } = require("../utils/jwt");

const optionalAuth = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return next();
        }

        const [bearer, token] = authHeader.split(" ");
        if (bearer !== "Bearer" || !token) {
            return next();
        }

        const decoded = verifyToken(token);
        if (decoded && decoded.tokenType === "access") {
            req.user = decoded;
        }
        next();
    } catch (error) {
        // Silently fail auth verification and treat as guest
        next();
    }
};

module.exports = optionalAuth;
