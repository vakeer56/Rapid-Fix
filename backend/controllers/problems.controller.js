const Problem = require('../model/problem.model');
const Worker = require('../model/workers.model.js');
const cloudinary = require('../config/cloudinary.js');
const { worker } = require('cluster');

exports.createProblem = async (req, res) => {

    try {
        const {name, description, address, urgency, category} = req.body;
        const userId = req.user?.sub || req.body.userId;

        let pictures = [];
        let videos = [];

        if (req.files?.picture) {
            const fs = require('fs');
            for (const file of req.files.picture) {
                const filePath = file.path;
                const result = await cloudinary.uploader.upload(filePath, {
                    folder: 'rapidfix/images'
                });
                pictures.push(result.secure_url);
                try {
                    fs.unlinkSync(filePath);
                } catch (unlinkErr) {
                    console.warn('[createProblem] Temp picture delete failed:', unlinkErr.message);
                }
            }
        }

        if (req.files?.video) {
            const fs = require('fs');
            for (const file of req.files.video) {
                const filePath = file.path;
                const result = await cloudinary.uploader.upload(filePath, {
                    resource_type: 'video',
                    folder: 'rapidfix/videos'
                });
                videos.push(result.secure_url);
                try {
                    fs.unlinkSync(filePath);
                } catch (unlinkErr) {
                    console.warn('[createProblem] Temp video delete failed:', unlinkErr.message);
                }
            }
        }

        const newProblem = new Problem({
            userId,
            picture: pictures[0] || null,
            pictures,
            video: videos[0] || null,
            videos,
            name,
            description,
            address,
            urgency,
            category: category || "Other"
        });

        await newProblem.save();

        // Emit Socket event to notify workers of a new request
        const io = req.app?.get('socketio');
        if (io) {
            io.emit('newProblem', newProblem);
        }

        res.status(201).json(newProblem)

    }
    catch(err) {
        res.status(400).json( { message: err.message } );
    }
}

exports.resolveProblem = async (req, res) => {
    try {
        const {problemId} = req.params;
        const {amountReceived} = req.body || {};

        const problem = await Problem.findById(problemId);

        if(!problem) {
            return res.status(404).json({
                message: "Problem not found"
            });
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

        problem.resolved_worker = problem.assigned_worker;
        problem.assigned_worker = null;
        problem.status = "resolved";
        if (amountReceived !== undefined) {
            problem.amountReceived = Number(amountReceived) || 0;
        }

        await problem.save();

        // Emit Socket event to notify customer that the request is resolved
        const io = req.app?.get('socketio');
        if (io) {
            io.emit('problemResolved', { problemId });
            io.emit('problemUpdated', { problemId });
        }

        return res.status(200).json({
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

exports.getUserProblems = async (req, res) => {
    try {
        const { sub, role } = req.user;
        let problems = [];
        if (role === "worker") {
            problems = await Problem.find({
                $or: [
                    { assigned_worker: sub },
                    { resolved_worker: sub }
                ]
            })
            .populate('address')
            .populate('userId')
            .sort({ createdAt: -1 });
        } else {
            problems = await Problem.find({ userId: sub })
                .populate('address')
                .populate('assigned_worker')
                .populate('resolved_worker')
                .sort({ createdAt: -1 });
        }

        const Complaint = require('../model/complaint.model');
        const problemsWithComplaints = await Promise.all(problems.map(async (problem) => {
            const p = problem.toObject();
            if (p.assigned_worker) {
                const count = await Complaint.countDocuments({ worker_id: p.assigned_worker._id });
                p.assigned_worker.complaintsCount = count;
            }
            if (p.resolved_worker) {
                const count = await Complaint.countDocuments({ worker_id: p.resolved_worker._id });
                p.resolved_worker.complaintsCount = count;
            }
            return p;
        }));

        return res.json({ success: true, problems: problemsWithComplaints });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

exports.startProblemProgress = async (req, res) => {
    try {
        const { problemId } = req.params;
        const problem = await Problem.findById(problemId);
        if (!problem) {
            return res.status(404).json({ message: "Problem not found" });
        }
        if (problem.status !== "on the way") {
            return res.status(400).json({ message: "Job must be in state 'on the way' to start progress." });
        }
        problem.status = "in progress";
        await problem.save();

        const io = req.app?.get('socketio');
        if (io) {
            io.emit('problemUpdated', { problemId });
        }

        return res.status(200).json({ success: true, message: "Job is now in progress", problem });
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
};
