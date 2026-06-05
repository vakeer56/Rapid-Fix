const mongoose = require('mongoose')
const problemSchema = new mongoose.Schema(
{
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "users"
    },

    picture: {
      type: String, // URL
    },

    pictures: {
        type: [String],
        default: []
    },

    video: {
        type: String, // URL
    },

    videos: {
        type: [String],
        default: []
    },

    category: {
        type: String,
        required: true,
        enum: ["Plumber", "Electrician", "Mechanic", "Technician", "Other"],
        default: "Other"
    },

    name: {
        type: String,
        required: true,
        trim: true,
    },

    description: {
        type: String,
        default: "",
    },

    address: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "address",
        required: true,
    },

    status: {
        type: String,
        enum: ["unresolved", "pending", "on the way", "in progress", "resolved"],
        default: "pending",
    },

    assigned_worker: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "workers",
        default: null
    },

    resolved_worker: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "workers",
        default: null
    },

    amountReceived: {
        type: Number,
        default: 0
    },

    rejected_workers: [
        {
        type: mongoose.Schema.Types.ObjectId,
        ref: "workers",
        },
    ],

    urgency: {
        type: Boolean,
        default: false
    },

    isConfirmedByCustomer: {
        type: Boolean,
        default: false
    },

    confirmationExpiresAt: {
        type: Date,
        default: null
    },

    isWorkerHeadingOver: {
        type: Boolean,
        default: false
    }
},
    { timestamps: true }
);

const problemModel = mongoose.model("problem", problemSchema);
module.exports = problemModel;