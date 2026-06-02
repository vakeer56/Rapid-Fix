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
        accepted_problems:[
            {
            type: mongoose.Schema.Types.ObjectId,
            ref: "problem",
            }
        ],
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
});      

const workersModel = mongoose.model("workers", workersSchema);

module.exports = workersModel;

//firebase id is kept optional because userss signing in with phone dont have it.