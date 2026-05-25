require("dotenv").config({
    path: "./backend/.env",
});

const { sendOtp } = require("../services/twilioVerify.service");

const test = async () => {

    const result = await sendOtp("+919487790898");

    console.log(result);
    //console.log(process.env.TWILIO_VERIFY_SERVICE_SID);

};

test();
