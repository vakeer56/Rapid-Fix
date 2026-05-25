const twilio = require("twilio");
require('dotenv').config()

const client = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN,
);

const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

const sendOtp = async (phone) => {
    try {
        const response = await client.verify.v2.services(verifyServiceSid).verifications.create({
            to: phone,
            channel: "sms",
        });

        return {
            success: response.status ==="pending",
        };
    } catch (error) {
        console.error("Twilio send OTP error: ", error.message);

        return {
            success: false,
            message: "Failed to send OTP",
        };
    }
};

const checkOtp = async (phone, code) => {
    try {
        const response = await client.verify.v2.services(verifyServiceSid).verificationChecks.create({
            to: phone,
            code,
        });

        return{
            success: response.status === "approved",
        };
    } catch (error) {
        console.error("Twilio verify OTP error", error.message);

        return {
            success: false,
            message: "Invalid OTP",
        };
    }
};

module.exports = {
    sendOtp,
    checkOtp
}