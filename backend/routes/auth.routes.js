const express = require("express");

const {
    sendOtpController,
    verifyOtpController,
    completeProfileController,
    meController,
    firebaseAuthController,
    firebaseCompleteProfileController,
    updateProfileController,
    getFirebaseConfigController,
    syncAdminConfigController,
    getAdminConfigController,
    deleteAccountController,
    verifyWorkerPhoneController,
    sendEmailOtpController,
    verifyEmailOtpController,
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

// Firebase authentication (email/password or Google)
router.post('/firebase', firebaseAuthController);

// Complete Firebase user profile (called when needsProfile=true)
router.post('/firebase/complete-profile', requireSetupToken, firebaseCompleteProfileController);

// Update user profile info
router.put('/profile', authMiddleware, updateProfileController);

// Verify worker phone number
router.put('/verify-phone', authMiddleware, verifyWorkerPhoneController);

// Email OTP Verification
router.post('/email-otp/send', authMiddleware, sendEmailOtpController);
router.post('/email-otp/verify', authMiddleware, verifyEmailOtpController);

// Public Firebase config retriever (safe, client-side credentials only)
router.get('/firebase-config', getFirebaseConfigController);

// Secure administrator .env config synchronizer
router.post('/admin/sync-config', syncAdminConfigController);

// Retrieve active configurations securely
router.get('/admin/config', getAdminConfigController);

// Permanently delete user/worker account
router.delete('/delete-account', authMiddleware, deleteAccountController);

module.exports = router;