const express = require('express');
const connectDB = require("./config/db");
const app = express();

require('dotenv').config();

const problemRoutes = require('../backend/routes/problem.Route.js');
const workerRoutes = require("./routes/worker.routes");

app.use(express.json());


connectDB();

app.use(express.json());

const PORT = process.env.PORT || 3000;




app.use("/workers", workerRoutes);
app.use('/problem', problemRoutes);

app.listen(PORT, ()=> {
    console.log(`server running on port ${PORT}`)
})