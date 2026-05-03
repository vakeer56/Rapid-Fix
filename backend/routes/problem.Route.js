const express = require('express');
const router = express.Router();

const upload = require('../middleware/upload.js');
const {createProblem, resolveProblem} = require('../controllers/problems.controller.js');

router.post('/createProblem', 
        //we usin middleware here
        upload.fields([
            {name: 'picture', maxCount: 1},
            {name: 'video', maxCount: 1}
        ]),

        createProblem
);

router.patch('/ResolveProblem/:problemId', resolveProblem);

module.exports = router;


