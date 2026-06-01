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
        
        let district = "";
        const parts = locatedAddressId.split(",");
        if (parts.length >= 2) {
            district = parts[1].trim();
        } else {
            const retrievedAddress = await addressModel.findOne({ address: locatedAddressId });
            if (retrievedAddress) {
                district = retrievedAddress.district;
            } else {
                district = locatedAddressId.trim();
            }
        }
        
        // Helper to escape regular expression special characters
        const escapeRegExp = (string) => {
            return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        };

        const escapedDistrict = escapeRegExp(district.trim());
        const districtRegex = new RegExp(`^${escapedDistrict}$`, 'i');
        
        const areaRegexes = preferred_areas.map(area => {
            const escapedArea = escapeRegExp(area.trim());
            return new RegExp(escapedArea, 'i');
        });

        // Convert the string ID to a MongoDB ObjectId so the aggregate query matches properly
        const workerObjectId = new mongoose.Types.ObjectId(workerId);
        
        const problems = await problemModel.aggregate([
        {
            $match: {
            status: "pending",
            assigned_worker: null,
            rejected_workers: { $nin: [workerObjectId] },
            category: { $in: worker.categories || [] }
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
            $or: [
                { "address.area": { $in: areaRegexes } },
                { "address.city": { $in: areaRegexes } },
                { "address.district": { $in: areaRegexes } }
            ]
            }
        },
        {
            $sort: { createdAt: -1 }
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