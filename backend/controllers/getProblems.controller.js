const mongoose = require('mongoose');
const problemModel = require('../model/problem.model');

const getAllProblems = async (req, res) => {
    try {
        const { workerId } = req.query;
        if (!workerId) {
            return res.status(400).json({ message: "Please provide a worker id" });
        }
        const problems = await problemModel.find({ rejected_workers: { $nin: workerId } });
        if(!problems.length){
            return res.status(404).json({message: "No problems found"});
        }
        return res.status(200).json({ problems });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal server error" });
    }
}

module.exports = {getAllProblems};