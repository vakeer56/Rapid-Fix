const express = require("express");
const router = express.Router();
const { 
    addComplaint, 
    getMyComplaints, 
    getWorkerComplaints, 
    disputeComplaint,
    getAllComplaintsAdmin,
    deleteComplaintAdmin,
    revokeDisputeAdmin
} = require("../controllers/complaint.controller");
const authMiddleware = require("../middleware/auth.middleware");

router.post("/add", authMiddleware, addComplaint);
router.get("/my-complaints", authMiddleware, getMyComplaints);
router.get("/worker-complaints", authMiddleware, getWorkerComplaints);
router.put("/dispute/:id", authMiddleware, disputeComplaint);
router.get("/admin/all", getAllComplaintsAdmin);
router.delete("/admin/delete/:id", deleteComplaintAdmin);
router.put("/admin/revoke-dispute/:id", revokeDisputeAdmin);

module.exports = router;
