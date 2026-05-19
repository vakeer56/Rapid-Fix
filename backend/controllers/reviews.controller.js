const workersSchema = require('../model/workers.model');
const userSchema = require('../model/user.model');
const reviewsSchema = require('../model/reviews.model');


const addRating = async (workerId, value) => {
    try {
        await workersSchema.findByIdAndUpdate(workerId, {
            $inc: {
                "rating.totalSum": value,
                "rating.totalCount": 1
            }
        });
        console.log("Rating updated successfully");
    } catch (error) {
        console.error("Error updating rating:", error);
    }
}

const addReview = async (req, res) => {
    try {
        const {userId, workerId, review, rating} = req.body;
        if(!userId || !workerId || !review || !rating){
            return res.status(400).json({message: "All fields are required"});
        }
        const newReview = new reviewsSchema({
            user_id: userId,
            worker_id: workerId,
            review: review,
            rating: rating
        });
        await newReview.save();
        await addRating(workerId, rating);
        return res.status(201).json({message: "Review added successfully", newReview});
    } catch (error) {
        console.log(error);
        return res.status(500).json({message: "Internal server error"});
    }
}

const removeRating = async (workerId, value) => {
    try {
        await workersSchema.findByIdAndUpdate(workerId, {
            $inc: {
                "rating.totalSum": -value,
                "rating.totalCount": -1
            }
        });
        console.log("Rating removed successfully");
    } catch (error) {
        console.error("Error removing rating:", error);
    }
}

const removeReview = async (req, res) => {
    try {
        const {reviewId} = req.params;
        if(!reviewId){
            return res.status(400).json({message: "Please provide a review id"});
        }
        const review = await reviewsSchema.findById(reviewId);
        await removeRating(review.worker_id, review.rating);
        await reviewsSchema.findByIdAndDelete(reviewId);
        return res.status(200).json({message: "Review removed successfully"});
    } catch (error) {
        console.log(error);
        return res.status(500).json({message: "Internal server error"});
    }
}

module.exports = { addReview, removeReview };