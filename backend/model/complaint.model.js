const mongoose = require('mongoose');

const complaintSchema = new mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "users",
        required: true,
    },
    worker_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "workers",
        required: true,
    },
    problem_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "problems",
        required: true,
    },
    title: {
        type: String,
        required: true,
        trim: true,
    },
    description: {
        type: String,
        required: true,
        trim: true,
    },
    status: {
        type: String,
        enum: ["pending", "reviewed", "resolved", "disputed", "revoked"],
        default: "pending"
    }
}, { timestamps: true });

module.exports = mongoose.model("complaints", complaintSchema);
