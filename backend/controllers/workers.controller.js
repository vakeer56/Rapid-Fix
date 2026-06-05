const workers = require("../model/workers.model.js");
const Problem = require("../model/problem.model.js");
const User = require("../model/user.model.js");
const nodemailerService = require("../services/nodemailer.service");

const checkAndApplyAutoAcceptance = async (req) => {
    try {
        const expiredProblems = await Problem.find({
            status: "on the way",
            isConfirmedByCustomer: false,
            confirmationExpiresAt: { $lte: new Date() }
        })
        .populate("assigned_worker")
        .populate("userId")
        .populate("address");

        if (expiredProblems.length > 0) {
            const io = req?.app?.get('socketio');
            for (const problem of expiredProblems) {
                problem.isConfirmedByCustomer = true;
                await problem.save();

                if (io) {
                    io.emit('problemUpdated', { problemId: problem._id });
                }

                // Send email to worker
                try {
                    const worker = problem.assigned_worker;
                    const customer = problem.userId;
                    const addressStr = problem.address 
                        ? `${problem.address.address}, ${problem.address.area}, ${problem.address.city}`
                        : "the registered location";
                    if (worker && worker.email && customer) {
                        await nodemailerService.sendAutoAcceptedWorkerEmail(
                            worker.email,
                            worker.name,
                            customer.name,
                            problem.name,
                            addressStr
                        );
                    }
                } catch (emailErr) {
                    console.error("[checkAndApplyAutoAcceptance] Email notification error:", emailErr);
                }
            }
        }
    } catch (err) {
        console.error("[checkAndApplyAutoAcceptance] Error:", err);
    }
};

const workerAcceptProblem = async (req, res) => {
    try {
        const { workerId, problemId } = req.body;

        const isTest = process.env.NODE_ENV === 'test' || process.argv.some(arg => arg.includes('test'));
        const duration = isTest ? 10 : 5 * 60 * 1000;
        const expiresAt = new Date(Date.now() + duration);

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
                    status: "on the way",
                    isConfirmedByCustomer: false,
                    confirmationExpiresAt: expiresAt
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

        // Notify customer that worker wants to accept request (confirmation needed)
        try {
            const customer = await User.findById(problem.userId);
            const worker = await workers.findById(workerId);
            if (customer && customer.email && worker) {
                await nodemailerService.sendWorkerPendingConfirmationEmail(
                    customer.email, 
                    customer.name, 
                    worker.name, 
                    problem.name
                );
            }
        } catch (emailErr) {
            console.error("[workerAcceptProblem] Email notification error:", emailErr);
        }

        // Schedule auto-acceptance check
        const timer = setTimeout(async () => {
            try {
                let query = Problem.findById(problemId);
                if (query && typeof query.populate === "function") {
                    query = query.populate("assigned_worker").populate("userId").populate("address");
                }
                const updatedProblem = await query;

                if (updatedProblem && updatedProblem.status === "on the way" && !updatedProblem.isConfirmedByCustomer) {
                    updatedProblem.isConfirmedByCustomer = true;
                    await updatedProblem.save();

                    const ioSocket = req.app?.get('socketio');
                    if (ioSocket) {
                        ioSocket.emit('problemUpdated', { problemId });
                    }

                    const worker = updatedProblem.assigned_worker;
                    const customer = updatedProblem.userId;
                    const addressStr = updatedProblem.address 
                        ? `${updatedProblem.address.address}, ${updatedProblem.address.area}, ${updatedProblem.address.city}`
                        : "the registered location";
                    if (worker && worker.email && customer) {
                        await nodemailerService.sendAutoAcceptedWorkerEmail(
                            worker.email,
                            worker.name,
                            customer.name,
                            updatedProblem.name,
                            addressStr
                        );
                    }
                }
            } catch (err) {
                console.error("[workerAcceptProblem] setTimeout error:", err);
            }
        }, duration);

        if (timer.unref) {
            timer.unref();
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
        problem.isConfirmedByCustomer = false;
        problem.confirmationExpiresAt = null;
        await problem.save();

        await workers.findByIdAndUpdate(workerId, {
            $pull: { accepted_problems: problemId }
        });

        const io = req.app?.get('socketio');
        if (io) {
            io.emit('problemUpdated', { problemId });
        }

        // Notify worker that customer rejected
        try {
            const worker = await workers.findById(workerId);
            const customer = await User.findById(problem.userId);
            if (worker && worker.email && customer) {
                await nodemailerService.sendCustomerRejectedWorkerEmail(
                    worker.email,
                    worker.name,
                    customer.name,
                    problem.name
                );
            }
        } catch (emailErr) {
            console.error("[userRejectWorker] Email notification error:", emailErr);
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
        
        problem.isConfirmedByCustomer = true;
        problem.confirmationExpiresAt = null;
        await problem.save();

        const io = req.app?.get('socketio');
        if (io) {
            io.emit('problemUpdated', { problemId });
        }

        // Notify worker that customer accepted
        try {
            const worker = await workers.findById(workerId);
            const customer = await User.findById(problem.userId);
            
            let addressStr = "the registered location";
            if (problem.address) {
                const Address = require("../model/address.model.js");
                const addressDoc = await Address.findById(problem.address);
                if (addressDoc) {
                    addressStr = `${addressDoc.address}, ${addressDoc.area}, ${addressDoc.city}`;
                }
            }

            if (worker && worker.email && customer) {
                await nodemailerService.sendCustomerApprovedWorkerEmail(
                    worker.email,
                    worker.name,
                    customer.name,
                    problem.name,
                    addressStr
                );
            }
        } catch (emailErr) {
            console.error("[userAcceptWorker] Email notification error:", emailErr);
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

const workerIntimateComing = async (req, res) => {
    try {
        const { problemId, workerId } = req.body;

        const problem = await Problem.findById(problemId);

        if (!problem) {
            return res.status(404).json({
                success: false,
                message: "Problem not found"
            });
        }

        if (!problem.assigned_worker || problem.assigned_worker.toString() !== workerId) {
            return res.status(400).json({
                success: false,
                message: "Invalid worker"
            });
        }

        problem.isWorkerHeadingOver = true;
        
        if (typeof problem.save === "function") {
            await problem.save();
        }

        const io = req.app?.get('socketio');
        if (io) {
            io.emit('problemUpdated', { problemId });
        }

        // Notify customer that worker is on the way (intimated)
        try {
            const customer = await User.findById(problem.userId);
            const worker = await workers.findById(workerId);
            if (customer && customer.email && worker) {
                await nodemailerService.sendWorkerAcceptedEmail(
                    customer.email, 
                    customer.name, 
                    worker.name, 
                    problem.name
                );
            }
        } catch (emailErr) {
            console.error("[workerIntimateComing] Email notification error:", emailErr);
        }

        return res.status(200).json({
            success: true,
            message: "Customer intimated successfully",
            data: problem
        });

    } catch (err) {
        return res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

module.exports = {
    workerAcceptProblem,
    userAcceptWorker,
    userRejectWorker,
    checkAndApplyAutoAcceptance,
    workerIntimateComing
};
