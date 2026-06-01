const mongoose = require("mongoose");
const connectDB = async () =>{
    try{
        let dbUri = process.env.MONGODB_URL;
        const dbName = process.env.MONGODB_DB_NAME || "rapid_fix_db";
        
        if (dbUri) {
            const urlWithoutProtocol = dbUri.replace(/^mongodb(\+srv)?:\/\//, "");
            const hasPath = urlWithoutProtocol.includes("/");
            if (!hasPath) {
                dbUri = `${dbUri.replace(/\/$/, "")}/${dbName}`;
            } else {
                const pathParts = urlWithoutProtocol.split("/");
                const dbPart = pathParts[1] ? pathParts[1].split("?")[0] : "";
                if (!dbPart) {
                    dbUri = dbUri.replace(/\/?(\?.*)?$/, `/${dbName}$1`);
                }
            }
        } else {
            dbUri = `mongodb://localhost:27017/${dbName}`;
        }

        await mongoose.connect(dbUri);
        console.log(`DB connected to database: "${mongoose.connection.name}"`);
    }catch(error){
        console.log("Error Caught: ",error);
    }
}
module.exports = connectDB;