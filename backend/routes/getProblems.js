const express = require('express');
const {getAllProblems} = require('../controllers/getProblems.controller');

const router = express.Router();

router.get('/getAllProblems', getAllProblems);

module.exports = router;