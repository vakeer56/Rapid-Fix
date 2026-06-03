const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth.middleware');
const { diagnoseProblem } = require('../controllers/ai.controller');

router.post('/diagnose', authMiddleware, diagnoseProblem);

module.exports = router;
