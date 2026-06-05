const workersSchema = require('../model/workers.model');
const userSchema = require('../model/user.model');
const reviewsSchema = require('../model/reviews.model');

const syncWorkerRating = async (workerId) => {
    try {
        const reviews = await reviewsSchema.find({ worker_id: workerId });
        let totalSum = 0;
        reviews.forEach(r => {
            totalSum += r.rating;
        });
        const totalCount = reviews.length;

        await workersSchema.findByIdAndUpdate(workerId, {
            $set: {
                "rating.totalSum": totalSum,
                "rating.totalCount": totalCount
            }
        });

        console.log(`Rating synced successfully for worker ${workerId}: sum=${totalSum}, count=${totalCount}`);
        return { totalSum, totalCount };
    } catch (error) {
        console.error("Error syncing rating:", error);
        return null;
    }
}

const addReview = async (req, res) => {
    try {
        const {userId, workerId, review, rating, description} = req.body;
        const reviewText = review || description;
        if(!userId || !workerId || !reviewText || !rating){
            return res.status(400).json({message: "All fields are required"});
        }

        // Strict limit: check if user has already rated this worker once
        const existingReview = await reviewsSchema.findOne({ user_id: userId, worker_id: workerId });
        if (existingReview) {
            return res.status(400).json({ message: "You have already rated this Service Partner." });
        }

        const newReview = new reviewsSchema({
            user_id: userId,
            worker_id: workerId,
            discription: reviewText,
            rating: rating
        });
        await newReview.save();
        await syncWorkerRating(workerId);
        return res.status(201).json({message: "Review added successfully", newReview});
    } catch (error) {
        console.log(error);
        return res.status(500).json({message: "Internal server error"});
    }
}

const removeReview = async (req, res) => {
    try {
        const {reviewId} = req.params;
        if(!reviewId){
            return res.status(400).json({message: "Please provide a review id"});
        }
        const review = await reviewsSchema.findById(reviewId);
        if (!review) {
            return res.status(404).json({message: "Review not found"});
        }
        const workerId = review.worker_id;
        await reviewsSchema.findByIdAndDelete(reviewId);
        await syncWorkerRating(workerId);
        return res.status(200).json({message: "Review removed successfully"});
    } catch (error) {
        console.log(error);
        return res.status(500).json({message: "Internal server error"});
    }
}

// Fetch complete rating & review history of a specific worker
const getWorkerReviews = async (req, res) => {
    try {
        const { workerId } = req.params;
        if (!workerId) {
            return res.status(400).json({ message: "Please provide a worker id" });
        }
        await syncWorkerRating(workerId);

        const reviews = await reviewsSchema.find({ worker_id: workerId })
            .populate("user_id", "name photo")
            .sort({ createdAt: -1 });

        const worker = await workersSchema.findById(
            workerId,
            "rating experience isEmailVerified isPhoneVerified governmentVerification completedJobs createdAt"
        );
        const complaintsSchema = require('../model/complaint.model');
        const complaintsCount = await complaintsSchema.countDocuments({ worker_id: workerId });

        return res.json({
            success: true,
            reviews,
            rating: worker?.rating || { totalSum: 0, totalCount: 0 },
            experience: worker?.experience || 0,
            complaintsCount: complaintsCount || 0,
            badge: worker?.badge || { tier: "pending", label: "Verification Pending" },
            completedJobs: worker?.completedJobs || 0
        });
    } catch (error) {
        console.error("[getWorkerReviews]", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}

// Fetch a list of worker IDs the logged-in customer has already reviewed
const getRatedWorkers = async (req, res) => {
    try {
        const userId = req.user.sub;
        const reviews = await reviewsSchema.find({ user_id: userId }, "worker_id");
        const ratedWorkerIds = reviews.map(r => r.worker_id.toString());
        return res.json({ success: true, ratedWorkerIds });
    } catch (error) {
        console.error("[getRatedWorkers]", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}

module.exports = { addReview, removeReview, getWorkerReviews, getRatedWorkers, syncWorkerRating };