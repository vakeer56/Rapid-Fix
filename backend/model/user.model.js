const mongoose = require('mongoose');
const { Schema } = mongoose;

const userSchema = new Schema({
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
        required: true
    },
    stored_addresses: {
        type: [Schema.Types.ObjectId], 
        ref: "address" 
    },
    defaultAddress: {
        type: Schema.Types.ObjectId,
        ref: "address"
    },
    email: {
        type: String,
        required: true
    },
    phone: {
        type: String,
        required: true,
        unique: true
    },
    firebaseUid: {
        type: String,    
        unique: true,
        sparse: true,
    }, 
    authProvider: {
        type: String,
        enum: ["firebase", "twilio"],
        default: "twilio",
    },
    photo: {
        type: String,
        default: ""
    },
    isEmailVerified: {
        type: Boolean,
        default: false
    },
    isPhoneVerified: {
        type: Boolean,
        default: false
    },
    emailVerificationCode: {
        type: String,
        default: null
    },
    emailVerificationExpires: {
        type: Date,
        default: null
    }
}, { timestamps: true })

const userModel = mongoose.model("users",userSchema);
module.exports = userModel;
