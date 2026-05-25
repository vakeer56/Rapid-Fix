const express = require("express");

const {
    sendOtpController,
    verifyOtpController,
    completeProfileController,
    meController,
} = require("../controllers/auth.controller");

const authMiddleware = require("../middleware/auth.middleware");

const requireSetupToken = require(
    "../middleware/setupToken.middleware"
);

const router = express.Router();

router.post(
    "/otp/send",
    sendOtpController
);

router.post(
    "/otp/verify",
    verifyOtpController
);

router.post(
    "/profile",
    requireSetupToken,
    completeProfileController
);

router.get(
    "/me",
    authMiddleware,
    meController
);

module.exports = router;