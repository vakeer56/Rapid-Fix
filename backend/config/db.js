const mongoose = require("mongoose");
const connectDB = async () =>{
    try{
        await mongoose.connect(process.env.MONGODB_URL);
        console.log("DB connected");
    }catch(error){
        console.log("Error Caught: ",error);
    }
}
module.exports = connectDB;