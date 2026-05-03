const Problem = require('../model/problem.model');
const Worker = require('../model/workers.model.js');
const cloudinary = require('../config/cloudinary.js');
const { worker } = require('cluster');

exports.createProblem = async (req, res) => {

    try {
        const {userId, name, description, address, urgency} = req.body;

        let pictureUrl = null;
        let videoUrl = null;

        if(req.files?.picture) {

            const filePath = req.files.picture[0].path;

            const result = await cloudinary.uploader.upload(filePath, {
                folder: 'rapidfix/images'
            });

            pictureUrl = result.secure_url;

            const fs = require('fs');
            fs.unlinkSync(filePath);
        }

        if(req.files?.video) {
            
            const filePath = req.files.video[0].path;

            const result = await cloudinary.uploader.upload(filePath, {
                resource_type: 'video',
                folder: 'rapidfix/videos'
            });

            videoUrl = result.secure_url;

            const fs = require('fs');
            fs.unlinkSync(filePath);
        }

        const newProblem = new Problem( {
            userId,
            picture: pictureUrl,
            video: videoUrl,
            name,
            description,
            address,
            urgency
        });

        await newProblem.save();
        res.status(201).json(newProblem)

    }
    catch(err) {
        res.status(400).json( { message: err.message } );
    }
}

exports.resolveProblem = async (req, res) => {
    try {
        const {problemId} = req.params;

        const problem = await Problem.findById(problemId);

        if(!problem) {
            res.status(404).json({
                message: "Problem not found"
            })
        }

        //Remove problem id from accepted problems in worker
        if(problem.assigned_worker) {
            
            await Worker.findByIdAndUpdate(
                problem.assigned_worker,
                {
                    $pull: {
                        accepted_problems: problemId
                    }
                }
            )
        }

        problem.assigned_worker = null;
        problem.status = "resolved";

        await problem.save();

        res.status(200).json({
            message: "problem resolved successfully!"
        });

    }
    catch(err) {
        res.status(500).json(
            {
                message: err.message
            }
        );
    }
}