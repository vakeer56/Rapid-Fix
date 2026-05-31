const express = require('express');
const router = express.Router();

const upload = require('../middleware/upload.js');
const authMiddleware = require('../middleware/auth.middleware');
const {createProblem, resolveProblem, getUserProblems} = require('../controllers/problems.controller.js');

router.post('/createProblem', 
        authMiddleware,
        upload.fields([
            {name: 'picture', maxCount: 1},
            {name: 'video', maxCount: 1}
        ]),

        createProblem
);

router.get('/user', authMiddleware, getUserProblems);

router.patch('/ResolveProblem/:problemId', resolveProblem);

module.exports = router;


