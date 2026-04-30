const express = require('express');
require('dotenv').config();

const app = express()

app.use(express.json());

const PORT = process.env.PORT || 3000;

const workerRoutes = require("./routes/worker.routes");
const connectDB = require("./config/db.js");

connectDB();

app.use("/workers", workerRoutes);

app.listen(PORT, ()=> {
    console.log(`server running on port ${PORT}`)
})