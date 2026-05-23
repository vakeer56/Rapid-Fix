const express = require('express');
const connectDB = require("./config/db");
const addressRouter = require("./routes/adressRoutes");
const getProblemsRouter = require("./routes/getProblems");
const reviewsRouter = require("./routes/reviews.route")
const authRoutes = require("./routes/auth.routes");;
const app = express();

const cors = require("cors");
app.use(cors());

require('dotenv').config();

const problemRoutes = require('../backend/routes/problem.Route.js');

app.use(express.json());
app.use('/address', addressRouter);
app.use('/getProblems', getProblemsRouter);
app.use('/reviews', reviewsRouter);


connectDB();

app.use(express.json());


const PORT = process.env.PORT || 3000;

const workerRoutes = require("./routes/worker.routes");


app.use("/workers", workerRoutes);
app.use('/problem', problemRoutes);
app.use("/auth", authRoutes);

app.listen(PORT, ()=> {
    console.log(`server running on port ${PORT}`)
})