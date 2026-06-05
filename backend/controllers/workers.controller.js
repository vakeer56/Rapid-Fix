const workers = require("../model/workers.model.js");
const Problem = require("../model/problem.model.js");
const User = require("../model/user.model.js");
const nodemailerService = require("../services/nodemailer.service");

const workerAcceptProblem = async (req, res) => {
    try {
        const { workerId, problemId } = req.body;

        const problem = await Problem.findOneAndUpdate(
            {
                _id: problemId,
                status: "pending",
                assigned_worker: null,
                rejected_workers: { $ne: workerId }
            },
            {
                $set: {
                    assigned_worker: workerId,
                    status: "on the way"
                }
            },
            { new: true }
        );

        if (!problem) {
            return res.status(400).json({
                success: false,
                message: "Already taken or rejected"
            });
        }

        await workers.findByIdAndUpdate(
            workerId,
            {
                $addToSet: { accepted_problems: problemId } // avoids duplicates
            }
        );
        const io = req.app?.get('socketio');
        if (io) {
            io.emit('problemUpdated', { problemId });
        }

        // Notify customer that worker is on the way
        try {
            const customer = await User.findById(problem.userId);
            const worker = await workers.findById(workerId);
            if (customer && customer.email && worker) {
                await nodemailerService.sendWorkerAcceptedEmail(customer.email, customer.name, worker.name, problem.name);
            }
        } catch (emailErr) {
            console.error("[workerAcceptProblem] Email notification error:", emailErr);
        }

        return res.status(200).json({
            success: true,
            message: "Problem accepted successfully",
            data: problem
        });

    } catch (err) {
        return res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

const userRejectWorker = async (req, res) => {
    try{
        const { problemId, workerId } = req.body;

        const problem = await Problem.findById(problemId);

        if(!problem) {
            return res.status(404).json({ 
                success: false, 
                message :"Problem not found"
            });
        }

        if (!problem.rejected_workers.some(id => id.toString() === workerId)) {
            problem.rejected_workers.push(workerId);
        }

        problem.assigned_worker = null;
        problem.status = "pending";
        await problem.save();

        await workers.findByIdAndUpdate(workerId, {
            $pull: { accepted_problems: problemId }
        });

        const io = req.app?.get('socketio');
        if (io) {
            io.emit('problemUpdated', { problemId });
        }

        return res.status(200).json({
            success: true,
            message: "Worker rejected",
            data: problem
        });
    } catch (err) {
        return res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

const userAcceptWorker = async (req, res) => {

    try{
        const { problemId, workerId } = req.body;

        const problem = await Problem.findById(problemId);

        if(!problem) {
            return res.status(404).json({success: false, message: "Problem not found"});
        }
        
        if(!problem.assigned_worker || problem.assigned_worker.toString() !== workerId){
            return res.status(400).json({
                success: false,
                message: "Invalid worker"
            });
        }
        
        // await workers.findByIdAndUpdate(workerId, {
        //     $addToSet: { accepted_problems: problemId }
        // });//?

        const io = req.app?.get('socketio');
        if (io) {
            io.emit('problemUpdated', { problemId });
        }

        return res.status(200).json({
            success: true,
            message: "Worker accepted successfully",
            data: problem
        });
    } catch (err) {
        return res.status(500).json({
            success: false,
            message: err.message
        });
    }
}

module.exports = {workerAcceptProblem, userAcceptWorker, userRejectWorker};
