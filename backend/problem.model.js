import mongoose from "mongoose";

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
        ref: "Address",
        required: true,
    },

    status: {
        type: String,
        enum: ["unresolved", "pending"],
        default: "unresolved",
    },

    rejected_workers: [
        {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        },
    ],
},
    { timestamps: true }
);

export default mongoose.model("Problem", problemSchema);