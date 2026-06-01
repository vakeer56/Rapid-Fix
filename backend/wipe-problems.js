require('dotenv').config();
const mongoose = require('mongoose');
const Problem = require('./model/problem.model');
const Review = require('./model/reviews.model');
const connectDB = require('./config/db');

async function wipeDatabase() {
    try {
        console.log("Connecting to database...");
        await connectDB();
        
        console.log("Wiping problems collection...");
        const deleteProblemsResult = await Problem.deleteMany({});
        console.log(`Successfully deleted ${deleteProblemsResult.deletedCount} problems!`);

        console.log("Wiping reviews collection...");
        const deleteReviewsResult = await Review.deleteMany({});
        console.log(`Successfully deleted ${deleteReviewsResult.deletedCount} reviews!`);

        console.log("Wiping workers' active/accepted problems list...");
        const Worker = require('./model/workers.model');
        const updateWorkersResult = await Worker.updateMany({}, {
            $set: { accepted_problems: [], "rating.totalSum": 0, "rating.totalCount": 0 }
        });
        console.log(`Successfully reset accepted problems and ratings for ${updateWorkersResult.modifiedCount} workers!`);

        console.log("Database cleanup completed successfully!");
        process.exit(0);
    } catch (err) {
        console.error("Cleanup failed with error:", err);
        process.exit(1);
    }
}

wipeDatabase();
