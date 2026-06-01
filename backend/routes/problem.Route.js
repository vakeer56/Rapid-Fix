const express = require('express');
const router = express.Router();

const upload = require('../middleware/upload.js');
const authMiddleware = require('../middleware/auth.middleware');
const {createProblem, resolveProblem, getUserProblems, startProblemProgress} = require('../controllers/problems.controller.js');

router.post('/createProblem', 
        authMiddleware,
        upload.fields([
            {name: 'picture', maxCount: 10},
            {name: 'video', maxCount: 5}
        ]),

        createProblem
);

router.get('/user', authMiddleware, getUserProblems);

router.patch('/start-progress/:problemId', startProblemProgress);

router.patch('/ResolveProblem/:problemId', resolveProblem);

module.exports = router;


