const mongoose = require('mongoose');
const problemModel = require('../model/problem.model');
const workerModel = require('../model/workers.model');
const addressModel = require('../model/address.model');

const getAllProblems = async (req, res) => {
    try {
        const { workerId } = req.query;
        if (!workerId) {
            return res.status(400).json({ message: "Please provide a worker id" });
        }
        const worker = await workerModel.findById(workerId);
        if(!worker){
            return res.status(404).json({message: "Worker not found"});
        }
        const preferred_areas = worker.preferred_areas;
        if(!preferred_areas.length){
            return res.status(404).json({message: "Worker has no preferred areas"});
        }
        const locatedAddressId = worker.located_address;
        if(!locatedAddressId){
            return res.status(404).json({message: "Worker has no located address"});
        }
        const retrievedAddress = await addressModel.findOne({ address: locatedAddressId });
        if(!retrievedAddress){
            return res.status(404).json({message: "Worker's located address not found in database"});
        }
        const district = retrievedAddress.district;
        
        // Convert the string ID to a MongoDB ObjectId so the aggregate query matches properly
        const workerObjectId = new mongoose.Types.ObjectId(workerId);
        
        const problems = await problemModel.aggregate([
        {
            $match: {
            rejected_workers: { $nin: [workerObjectId] }
            }
        },
        {
            $lookup: {
            from: "addresses",
            localField: "address",
            foreignField: "_id",
            as: "address"
            }
        },
        { $unwind: "$address" },
        {
            $match: {
            "address.area": { $in: preferred_areas },
            "address.district": district
            }
        }
        ]);

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