const express = require("express");
const router = express.Router();
const { addReview, removeReview, getWorkerReviews, getRatedWorkers } = require("../controllers/reviews.controller");
const authMiddleware = require("../middleware/auth.middleware");

router.post("/add", addReview);
router.delete("/remove/:reviewId", removeReview);
router.get("/worker/:workerId", getWorkerReviews);
router.get("/rated-workers", authMiddleware, getRatedWorkers);

module.exports = router;