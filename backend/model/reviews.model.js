const mongoose = require('mongoose')
const reviewSchema = new mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: true,
    },
    worker_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "workers",
        required: true,
    },
    discription: {
        type: String,
        required: true,
    },
    rating: {
        type: Number,
        required: true,
    },
})

module.exports = mongoose.model("reviews", reviewSchema)