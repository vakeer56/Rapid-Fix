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

    video: {
        type: String, // URL
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
        enum: ["unresolved", "pending", "resolved"],
        default: "pending",
    },

    accepted_worker: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "workers",
    default: null
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
    }
},
    { timestamps: true }
);

const problemModel = mongoose.model("problem", problemSchema);
module.exports = problemModel;