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
    defaultAddress : {
        type: Schema.Types.ObjectId,
        ref: "address"
    },
    email: {
        type: String,
        required: true
    },
    phone: {
        type: String,
        required: true
    },
    firebaseUid: {
        type: String,    
        required: true,
        unique: true
    }
});

const userModel = mongoose.model("users",userSchema);
module.exports = userModel;
