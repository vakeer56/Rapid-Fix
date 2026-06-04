const express = require("express");
const router = express.Router();

const {
    submitGovernmentDocs,
    getMyVerification,
    getPendingVerifications,
    approveVerification,
    rejectVerification
} = require("../controllers/verification.controller");

const authMiddleware = require("../middleware/auth.middleware");
const upload = require("../middleware/upload.js");

// Worker routes
router.post("/submit", authMiddleware, upload.array("documents", 3), submitGovernmentDocs);
router.get("/me", authMiddleware, getMyVerification);

// Admin routes (gated by the front-end admin login, consistent with the existing
// complaint admin endpoints).
router.get("/admin/pending", getPendingVerifications);
router.put("/admin/approve/:id", approveVerification);
router.put("/admin/reject/:id", rejectVerification);

module.exports = router;
