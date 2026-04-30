const express = require("express");
const router = express.Router();

const {
    workerAcceptProblem,
    userAcceptWorker,
    userRejectWorker
} = require("../controllers/workers.controller");

router.post("/accept-problem", workerAcceptProblem);

router.post("/reject-worker", userRejectWorker);

router.post("/accept-worker", userAcceptWorker);

module.exports = router;