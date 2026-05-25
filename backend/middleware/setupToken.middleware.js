const { verifyToken } = require("../utils/jwt");

const requireSetupToken = (req, res, next) =>{
    try{
        const authHeader = req.headers.authorization;

        if(!authHeader){
            return res.status(401).json({
                success: false,
                message: "Authorization headers missing",
            });
        }

        const [bearer, token] = authHeader.split("");

        if(bearer !== "Bearer" || !token){
            return res.status(401).json({
                success: "false",
                message: "Invalid Authorization format",
            });
        }

        const decoded = verifyToken(token);

        if(decoded.tokenType !== "setup"){
            return res.status(401).json({
                success: false,
                message: "Setup token required",
            });
        }

        req.user = decoded;

        next();
    } catch(error){
        return res.status(401).json({
            success: "false",
            message: "Invalid or expired Token",
        });
    }
};

module.exports = requireSetupToken;