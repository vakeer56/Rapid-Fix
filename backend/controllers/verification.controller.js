const Worker = require('../model/workers.model');
const cloudinary = require('../config/cloudinary.js');
const fs = require('fs');
const nodemailerService = require("../services/nodemailer.service");

// Uploads temp multer files to Cloudinary and returns their secure URLs.
// Mirrors the pattern used in community.controller.js / problems.controller.js.
const uploadDocuments = async (files, folder = 'rapidfix/government-docs') => {
    const urls = [];
    if (files && files.length > 0) {
        for (const file of files) {
            const filePath = file.path;
            try {
                const result = await cloudinary.uploader.upload(filePath, {
                    folder,
                    resource_type: 'auto'
                });
                urls.push(result.secure_url);
            } catch (err) {
                console.error(`[Cloudinary Upload Error] Path: ${filePath}`, err);
            } finally {
                try {
                    fs.unlinkSync(filePath);
                } catch (unlinkErr) {
                    console.warn(`[Temp File Clean Warning] Path: ${filePath}`, unlinkErr.message);
                }
            }
        }
    }
    return urls;
};

// Worker submits government documents for the "Verified Pro" tier.
const submitGovernmentDocs = async (req, res) => {
    try {
        if (req.user.role !== "worker") {
            return res.status(403).json({ success: false, message: "Only service partners can submit verification documents." });
        }

        const worker = await Worker.findById(req.user.sub);
        if (!worker) {
            return res.status(404).json({ success: false, message: "Worker not found" });
        }

        if (!worker.isEmailVerified || !worker.isPhoneVerified) {
            return res.status(400).json({
                success: false,
                message: "Please verify your email and phone number before submitting government documents."
            });
        }

        const currentStatus = worker.governmentVerification?.status;
        if (currentStatus === "pending") {
            return res.status(400).json({ success: false, message: "Your documents are already under review." });
        }
        if (currentStatus === "approved") {
            return res.status(400).json({ success: false, message: "Your account is already verified." });
        }

        const { documentType, documentNumber } = req.body;
        if (!documentType || !documentNumber) {
            return res.status(400).json({ success: false, message: "Document type and number are required." });
        }

        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ success: false, message: "Please upload at least one document image." });
        }

        const documentImages = await uploadDocuments(req.files);
        if (documentImages.length === 0) {
            return res.status(500).json({ success: false, message: "Failed to upload documents. Please try again." });
        }

        worker.governmentVerification = {
            status: "pending",
            documentType,
            documentNumber,
            documentImages,
            submittedAt: new Date(),
            reviewedAt: undefined,
            rejectionReason: ""
        };
        await worker.save();

        return res.status(200).json({
            success: true,
            message: "Documents submitted successfully. Our team will review them shortly.",
            governmentVerification: worker.governmentVerification,
            badge: worker.badge
        });
    } catch (error) {
        console.error("[submitGovernmentDocs Error]", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// Worker fetches their own verification status + current badge.
const getMyVerification = async (req, res) => {
    try {
        if (req.user.role !== "worker") {
            return res.status(403).json({ success: false, message: "Only service partners have a verification status." });
        }

        const worker = await Worker.findById(req.user.sub);
        if (!worker) {
            return res.status(404).json({ success: false, message: "Worker not found" });
        }

        return res.status(200).json({
            success: true,
            governmentVerification: worker.governmentVerification,
            badge: worker.badge,
            completedJobs: worker.completedJobs || 0,
            isEmailVerified: worker.isEmailVerified,
            isPhoneVerified: worker.isPhoneVerified
        });
    } catch (error) {
        console.error("[getMyVerification Error]", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// Admin: list all workers awaiting document review.
const getPendingVerifications = async (req, res) => {
    try {
        const workers = await Worker.find({ "governmentVerification.status": "pending" })
            .select("name phone email experience categories rating completedJobs governmentVerification createdAt")
            .sort({ "governmentVerification.submittedAt": 1 });

        return res.status(200).json({ success: true, workers });
    } catch (error) {
        console.error("[getPendingVerifications Error]", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// Admin: approve a worker's government documents.
const approveVerification = async (req, res) => {
    try {
        const { id } = req.params;
        const worker = await Worker.findById(id);
        if (!worker) {
            return res.status(404).json({ success: false, message: "Worker not found" });
        }
        if (worker.governmentVerification?.status !== "pending") {
            return res.status(400).json({ success: false, message: "This worker has no pending verification to approve." });
        }

        worker.governmentVerification.status = "approved";
        worker.governmentVerification.reviewedAt = new Date();
        worker.governmentVerification.rejectionReason = "";
        await worker.save();

        // Send email to worker notifying document verification approval
        try {
            if (worker.email) {
                await nodemailerService.sendWorkerDocumentVerifiedEmail(
                    worker.email,
                    worker.name
                );
            }
        } catch (emailErr) {
            console.error("[approveVerification] Email notification error:", emailErr);
        }

        return res.status(200).json({
            success: true,
            message: "Worker verification approved successfully.",
            badge: worker.badge
        });
    } catch (error) {
        console.error("[approveVerification Error]", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// Admin: reject a worker's government documents (worker can resubmit).
const rejectVerification = async (req, res) => {
    try {
        const { id } = req.params;
        const { rejectionReason } = req.body;

        const worker = await Worker.findById(id);
        if (!worker) {
            return res.status(404).json({ success: false, message: "Worker not found" });
        }
        if (worker.governmentVerification?.status !== "pending") {
            return res.status(400).json({ success: false, message: "This worker has no pending verification to reject." });
        }

        worker.governmentVerification.status = "rejected";
        worker.governmentVerification.reviewedAt = new Date();
        worker.governmentVerification.rejectionReason = rejectionReason || "Documents could not be verified. Please resubmit clear, valid documents.";
        await worker.save();

        return res.status(200).json({
            success: true,
            message: "Worker verification rejected.",
            badge: worker.badge
        });
    } catch (error) {
        console.error("[rejectVerification Error]", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

module.exports = {
    submitGovernmentDocs,
    getMyVerification,
    getPendingVerifications,
    approveVerification,
    rejectVerification
};
