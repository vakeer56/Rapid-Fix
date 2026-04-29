const mongoose = require('mongoose');
const { Schema } = mongoose;
const userSchema = new Schema({
    name: {
        type: String
    },
    age: {
        type: Number,
    },
    gender: {
        type: String,
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
        type: String
    },
    phone: {
        type: String
    }
});

const userModel = mongoose.model("users",userSchema);
module.exports = userModel;
