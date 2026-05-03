const express = require("express");
const router = express.Router();
const { addReview, removeReview } = require("../controllers/reviews.controller");

router.post("/add", addReview);
router.delete("/remove/:reviewId", removeReview);

module.exports = router;