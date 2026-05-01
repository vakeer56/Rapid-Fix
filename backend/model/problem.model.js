const mongoose = require('mongoose')
const problemSchema = new mongoose.Schema(
{
    picture: {
      type: String, // URL
    },

    video: {
      type: String, // URL (optional)
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

module.exports = mongoose.model("Problem", problemSchema);