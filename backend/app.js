const express = require('express');
const connectDB = require("./config/db");
const app = express();

require('dotenv').config();

const problemRoutes = require('../backend/routes/problem.Route.js');

app.use(express.json());

app.use('/problems', problemRoutes);

connectDB();

const PORT = process.env.PORT || 3000;

app.listen(PORT, ()=> {
    console.log(`server running on port ${PORT}`)
})