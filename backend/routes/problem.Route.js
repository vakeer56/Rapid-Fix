const express = require('express');
const router = express.Router();

const upload = require('../middleware/upload.js');
const problemController = require('../controllers/problems.controller.js');

router.post('/', 
        //we usin middleware here
        upload.fields([
            {name: 'picture', maxCount: 1},
            {name: 'video', maxCount: 1}
        ]),

        problemController.createProblem
)

module.exports = router;


