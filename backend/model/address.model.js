const mongoose = require('mongoose');
const { Schema, model } = mongoose;
const addressSchema = new Schema({
    belong_to : {
        type: Schema.Types.ObjectId,
        ref: "users"
    },
    address:{
        type:String,
        required: true
        
    },
    area: {
        type: String,
        required: true
    },
    city: {
        type: String,
        required: true
    },
    district: {
        type: String,
        required: true
    },
    state: {
        type: String,
        required: true
    },
    pin_code:{
        type:Number,
        required: true
    }        
});
const addressModel = model("address",addressSchema);
module.exports = addressModel;