const complaintSchema = require('../model/complaint.model');
const problemModel = require('../model/problem.model');
const workersModel = require('../model/workers.model');
const nodemailerService = require("../services/nodemailer.service");

const addComplaint = async (req, res) => {
    try {
        const userId = req.user.sub;
        const { problemId, workerId, title, description } = req.body;

        if (!problemId || !workerId || !title || !description) {
            return res.status(400).json({ success: false, message: "All fields are required" });
        }

        // Verify if this worker has actually been assigned to or resolved this specific problem request for this user,
        // and the status is "on the way", "in progress", or "resolved".
        const problem = await problemModel.findOne({
            _id: problemId,
            userId: userId,
            $or: [
                { assigned_worker: workerId },
                { resolved_worker: workerId }
            ],
            status: { $in: ["on the way", "in progress", "resolved"] }
        });

        if (!problem) {
            return res.status(400).json({
                success: false,
                message: "You cannot complain about a worker who has not been assigned to or worked on this request."
            });
        }

        // Ensure only 1 complaint can be raised per order
        const existingComplaint = await complaintSchema.findOne({ problem_id: problemId });
        if (existingComplaint) {
            return res.status(400).json({
                success: false,
                message: "You have already raised a complaint for this order."
            });
        }

        const newComplaint = new complaintSchema({
            user_id: userId,
            worker_id: workerId,
            problem_id: problemId,
            title,
            description
        });

        await newComplaint.save();

        // Keep the worker's cached complaint count in sync (gates the Trusted Elite badge)
        await workersModel.findByIdAndUpdate(workerId, { $inc: { complaintsCount: 1 } });

        const io = req.app?.get('socketio');
        if (io) {
            io.emit('complaintReceived', {
                worker_id: workerId,
                complaint: {
                    title,
                    description,
                    createdAt: newComplaint.createdAt
                }
            });
        }

        return res.status(201).json({
            success: true,
            message: "Complaint registered successfully",
            complaint: newComplaint
        });
    } catch (error) {
        console.error("[addComplaint Error]", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

const getMyComplaints = async (req, res) => {
    try {
        const userId = req.user.sub;
        const complaints = await complaintSchema.find({ user_id: userId })
            .populate("worker_id", "name photo phone experience categories rating")
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            complaints
        });
    } catch (error) {
        console.error("[getMyComplaints Error]", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

const getWorkerComplaints = async (req, res) => {
    try {
        const workerId = req.user.sub;
        const complaints = await complaintSchema.find({ worker_id: workerId })
            .select("-user_id")
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            complaints
        });
    } catch (error) {
        console.error("[getWorkerComplaints Error]", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

const disputeComplaint = async (req, res) => {
    try {
        const { id } = req.params;
        const workerId = req.user.sub;

        const complaint = await complaintSchema.findOne({ _id: id, worker_id: workerId });

        if (!complaint) {
            return res.status(404).json({ success: false, message: "Complaint not found or you are not authorized to dispute it." });
        }

        if (complaint.status === "revoked") {
            return res.status(400).json({ success: false, message: "This dispute has already been reviewed and rejected by the administrator, and cannot be disputed again." });
        }

        if (complaint.status === "disputed") {
            return res.status(400).json({ success: false, message: "This complaint is already disputed and pending review." });
        }

        complaint.status = "disputed";
        await complaint.save();

        return res.status(200).json({
            success: true,
            message: "Complaint reported as false (disputed) successfully",
            complaint
        });
    } catch (error) {
        console.error("[disputeComplaint Error]", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

const getAllComplaintsAdmin = async (req, res) => {
    try {
        const complaints = await complaintSchema.find({ status: "disputed" })
            .populate("user_id", "name phone email")
            .populate("worker_id", "name phone email rating")
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            complaints
        });
    } catch (error) {
        console.error("[getAllComplaintsAdmin Error]", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

const deleteComplaintAdmin = async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await complaintSchema.findByIdAndDelete(id);

        if (!deleted) {
            return res.status(404).json({ success: false, message: "Complaint not found" });
        }

        // Decrement the worker's cached complaint count (a deleted/false complaint no longer counts)
        if (deleted.worker_id) {
            await workersModel.findByIdAndUpdate(deleted.worker_id, { $inc: { complaintsCount: -1 } });
            
            // Notify worker that dispute has been approved and complaint deleted
            try {
                const worker = await workersModel.findById(deleted.worker_id);
                if (worker && worker.email) {
                    await nodemailerService.sendWorkerDisputeApprovedEmail(
                        worker.email,
                        worker.name,
                        deleted.title
                    );
                }
            } catch (emailErr) {
                console.error("[deleteComplaintAdmin] Email notification error:", emailErr);
            }
        }

        return res.status(200).json({
            success: true,
            message: "Complaint deleted successfully"
        });
    } catch (error) {
        console.error("[deleteComplaintAdmin Error]", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

const revokeDisputeAdmin = async (req, res) => {
    try {
        const { id } = req.params;
        const complaint = await complaintSchema.findByIdAndUpdate(
            id,
            { status: "revoked" },
            { new: true }
        );

        if (!complaint) {
            return res.status(404).json({ success: false, message: "Complaint not found" });
        }

        // Notify worker that dispute has been rejected and complaint remains active
        try {
            const worker = await workersModel.findById(complaint.worker_id);
            if (worker && worker.email) {
                await nodemailerService.sendWorkerDisputeRejectedEmail(
                    worker.email,
                    worker.name,
                    complaint.title
                );
            }
        } catch (emailErr) {
            console.error("[revokeDisputeAdmin] Email notification error:", emailErr);
        }

        return res.status(200).json({
            success: true,
            message: "Worker dispute revoked successfully. Complaint is active again.",
            complaint
        });
    } catch (error) {
        console.error("[revokeDisputeAdmin Error]", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

module.exports = {
    addComplaint,
    getMyComplaints,
    getWorkerComplaints,
    disputeComplaint,
    getAllComplaintsAdmin,
    deleteComplaintAdmin,
    revokeDisputeAdmin
};
