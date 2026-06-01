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

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use('/address', addressRouter);
app.use('/getProblems', getProblemsRouter);
app.use('/reviews', reviewsRouter);


connectDB();

app.use(express.json({ limit: '10mb' }));


const PORT = process.env.PORT || 3000;

const workerRoutes = require("./routes/worker.routes");


app.use("/workers", workerRoutes);
app.use('/problem', problemRoutes);
app.use("/auth", authRoutes);

const http = require('http');
const { Server } = require('socket.io');
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST", "PATCH", "PUT", "DELETE"]
    }
});

io.on('connection', (socket) => {
    console.log(`[Socket] New client connected: ${socket.id}`);
    socket.on('disconnect', () => {
        console.log(`[Socket] Client disconnected: ${socket.id}`);
    });
});

app.set('socketio', io);

server.listen(PORT, ()=> {
    console.log(`server running on port ${PORT}`)
});