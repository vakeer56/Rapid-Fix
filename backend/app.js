const express = require('express');
require('dotenv').config();
const connectDB = require("./config/db");
const addressRouter = require("./routes/adressRoutes");
const app = express();

app.use(express.json());
app.use('/address', addressRouter);

connectDB();

const PORT = process.env.PORT || 3000;

app.listen(PORT, ()=> {
    console.log(`server running on port ${PORT}`)
})