const mongoose = require('mongoose');


const workersSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true                            
        },
        age: {
            type: Number,
            required: true
        },
        gender: {
            type: String,
            required: true,
            enum: ["male", "female", "other"]
        },
        experience: {
            type: Number,
            required: true
        },
        rating: {
            totalSum: {
                type: Number,
                default: 0
            },
            totalCount: {
                type: Number,
                default: 0
            }
        },
        preferred_areas: {
            type: [String],
            default: []
        },
        located_address: {
            type: String
        },
        email: {
            type: String,
            default: ""
        },
        photo: {
            type: String,
            default: ""
        },
        verificationStatus: {
            type: Boolean,
            default: false
        },
        isPhoneVerified: {
            type: Boolean,
            default: false
        },
        isEmailVerified: {
            type: Boolean,
            default: false
        },
        accepted_problems:[
            {
            type: mongoose.Schema.Types.ObjectId,
            ref: "problem",
            }
        ],
        // Number of jobs the worker has resolved (incremented when a problem is resolved)
        completedJobs: {
            type: Number,
            default: 0
        },
        // Cached count of active complaints filed against the worker (kept in sync by the
        // complaint controller). A worker must have zero complaints to reach Trusted Elite.
        complaintsCount: {
            type: Number,
            default: 0
        },
        // Government document verification handled by an admin (enables the "Verified Pro" tier and above)
        governmentVerification: {
            status: {
                type: String,
                enum: ["none", "pending", "approved", "rejected"],
                default: "none"
            },
            documentType: {
                type: String,
                default: ""
            },
            documentNumber: {
                type: String,
                default: ""
            },
            documentImages: {
                type: [String],
                default: []
            },
            submittedAt: Date,
            reviewedAt: Date,
            rejectionReason: {
                type: String,
                default: ""
            }
        },
        // sign in through firebase
        firebaseUid: {
            type: String,    
            unique: true,
            sparse: true
        },
        //Sign in thorough phone
        phone: {
            type: String,
            required: true,
            unique: true
        }, 
        authProvider: {
            type: String,
            enum: ["firebase", "twilio"],
            default: "twilio",
        },
        categories: {
            type: [String],
            default: [],
            required: true
        }
}, { timestamps: true });

// Derives the worker's trust-badge tier from their own fields so it is always
// consistent everywhere a worker document is serialized.
//
// Ladder:
//   pending        -> email or phone not yet verified
//   verified       -> email AND phone verified
//   verified_pro   -> verified AND government documents approved by an admin
//   trusted_pro    -> verified_pro AND avg rating >= 4.5 AND >= 35 completed jobs
//   trusted_elite  -> verified_pro AND avg rating >= 4.8 AND >= 100 completed jobs AND >= 6 months active AND zero complaints
workersSchema.virtual("badge").get(function () {
    const isVerified = this.isEmailVerified && this.isPhoneVerified;
    if (!isVerified) {
        return { tier: "pending", label: "Verification Pending" };
    }

    const govApproved = this.governmentVerification &&
        this.governmentVerification.status === "approved";

    const totalCount = this.rating ? this.rating.totalCount : 0;
    const totalSum = this.rating ? this.rating.totalSum : 0;
    const avg = totalCount > 0 ? totalSum / totalCount : 0;

    const MS_PER_MONTH = 1000 * 60 * 60 * 24 * 30;
    const months = this.createdAt
        ? (Date.now() - new Date(this.createdAt).getTime()) / MS_PER_MONTH
        : 0;

    const completedJobs = this.completedJobs || 0;
    const hasNoComplaints = (this.complaintsCount || 0) === 0;

    if (govApproved && avg >= 4.8 && completedJobs >= 100 && months >= 6 && hasNoComplaints) {
        return { tier: "trusted_elite", label: "Rapid Fix Trusted Elite" };
    }
    if (govApproved && avg >= 4.5 && completedJobs >= 35) {
        return { tier: "trusted_pro", label: "Trusted Pro" };
    }
    if (govApproved) {
        return { tier: "verified_pro", label: "Verified Pro" };
    }
    return { tier: "verified", label: "Verified" };
});

workersSchema.set("toJSON", { virtuals: true });
workersSchema.set("toObject", { virtuals: true });

const workersModel = mongoose.model("workers", workersSchema);

module.exports = workersModel;

//firebase id is kept optional because userss signing in with phone dont have it.