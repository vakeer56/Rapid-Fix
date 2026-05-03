const express = require('express');
require('dotenv').config();
const connectDB = require("./config/db");
const addressRouter = require("./routes/adressRoutes");
const getProblemsRouter = require("./routes/getProblems");
const reviewsRouter = require("./routes/reviews.route");
const app = express();

app.use(express.json());
app.use('/address', addressRouter);
app.use('/getProblems', getProblemsRouter);
app.use('/reviews', reviewsRouter);

connectDB();

const PORT = process.env.PORT || 3000;

app.listen(PORT, ()=> {
    console.log(`server running on port ${PORT}`)
})