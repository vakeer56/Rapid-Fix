const mongoose = require('mongoose');
const { Schema } = mongoose;
const addressSchema = new Schema({
    belong_to : {
        type: Schema.Types.ObjectId,
        ref: "users"
    },
    address:{
        type:String,
        
    },
    area: {
        type: String
    },
    city: {
        type: String,
    },
    district: {
        type: String
    },
    state: {
        type: String,
    },
    pin_code:{
        type:Number,
    }        
});
const addressModel = model("address",addressSchema);
module.exports = addressModel;