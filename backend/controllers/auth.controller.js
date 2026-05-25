const User = require("../model/user.model");
const Workers = require("../model/workers.model");

const {sendOtp, checkOtp } = require("../services/twilioVerify.service");

const {generateAccessToken, generateSetupToken} = require("../utils/jwt");

// Sends an OTP to the provided phone number after validating the requested role.
const sendOtpController = async (req, res) => {
    try{
        const {phone, role} = req.body;

        if(!phone || !role){
            return res.status(401).json({
                success: false,
                message: "Phone number is required",
            });
        }

        if(!["users", "worker"].includes(role)) {
            return res.status(401).json({
                success: "false",
                message: "Invalid role",
            });
        }

        const result = await sendOtp(phone);

        if(!result.success){
            return res.status(500).json({
                success: false,
                message: "Failed to send OTP",
            });
        }

        return res.json({
            success: 'true',
            message: "OTP sent successfully",
        });
    } catch (error){
        console.error(error);

        return res.status(500).json({
            success: "false",
            message: "Server Error",
        });
    }
};

// Verifies the submitted OTP and returns either an access token or a setup token.
const verifyOtpController = async (req, res) => {
    try{
        const { phone, code, role} = req.body;

        if(!phone || !code || !role){
            return res.status(401).json({
                success: "false",
                message: "Phone, code and role are required",
            });
        }

        const verification = await checkOtp(phone, code);

        if(!verification.success){
            return res.status(401).json({
                success: "false",
                message: "Invalid OTP",
            });
        }

        let account = null;

        if(role==="user") {
            account = await User.findOne({phone});
        }

        if(role==="worker"){
            account = await Worker.findOne({phone});
        }

        if(account){
            const token = generateAccessToken({
                sub: account._id.toString(),
                role, 
                phone: account.phone,
            });

            return res.json({
                success: true,
                needsProfile: false,
                role,
                token,
                account,
            });
        }

        const setupToken = generateSetupToken({
            role, 
            phone,
            needsProfile: true,
        });

        return res.json({
            success: true,
            needsProfile: true,
            role,
            setupToken,
        });
    } catch (error) {
        console.error(error);

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

// Creates the missing user or worker profile after OTP verification and returns an access token.
const completeProfileController = async(req, res) => {
    try {
        const {role, phone} = req.user;

        let account = null;

        if(role==='user'){
            const {name, age, gender, email,} = req.body;

            if(!name || !age || !gender || !email){
                return res.status(500).json({
                    success: false,
                    message: "Missing required fields",
                })
            }
            account = await User.create({
                name,
                age,
                gender,
                email,
                phone,
                authProvider: "twilio",
            });
        }

        if (role === "worker") {

            const {
                name,
                age,
                experience,
                preferred_areas,
                located_address,
            } = req.body;

            if (!name || !age || experience === undefined) {
                return res.status(400).json({
                    success: false,
                    message: "Missing required worker fields",
                });
            }

            account = await Worker.create({
                name,
                age,
                experience,
                preferred_areas,
                located_address,
                phone,
                authProvider: "twilio",
            });
        }

        const token = generateAccessToken({
            sub: account._id.toString(),
            role,
            phone,
        });

        return res.status(201).json({
            success: true,
            role,
            token,
            account,
        });
    } catch (error) {

        console.error(error);

        return res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
};

// Returns the currently authenticated user or worker account details.
const meController = async (req, res) => {

    try {

        const {
            sub,
            role,
        } = req.user;

        let account = null;

        if (role === "user") {
            account = await User.findById(sub);
        }

        if (role === "worker") {
            account = await Worker.findById(sub);
        }

        if (!account) {
            return res.status(404).json({
                success: false,
                message: "Account not found",
            });
        }

        return res.json({
            success: true,
            role,
            account,
        });

    } catch (error) {

        console.error(error);

        return res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
};

module.exports = {
    sendOtpController,
    verifyOtpController,
    completeProfileController,
    meController,
};
