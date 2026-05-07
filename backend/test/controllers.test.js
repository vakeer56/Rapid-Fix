const test = require("node:test");
const assert = require("node:assert/strict");

const Problem = require("../model/problem.model.js");
const Worker = require("../model/workers.model.js");
const cloudinary = require("../config/cloudinary.js");
const fs = require("node:fs");

const {
  createProblem,
  resolveProblem,
} = require("../controllers/problems.controller.js");
const {
  workerAcceptProblem,
  userAcceptWorker,
  userRejectWorker,
} = require("../controllers/workers.controller.js");

const originalProblemSave = Problem.prototype.save;
const originalProblemFindById = Problem.findById;
const originalProblemFindOneAndUpdate = Problem.findOneAndUpdate;
const originalWorkerFindByIdAndUpdate = Worker.findByIdAndUpdate;
const originalCloudinaryUpload = cloudinary.uploader.upload;
const originalUnlinkSync = fs.unlinkSync;

function createRes() {
  return {
    body: undefined,
    statusCode: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

test.afterEach(() => {
  Problem.prototype.save = originalProblemSave;
  Problem.findById = originalProblemFindById;
  Problem.findOneAndUpdate = originalProblemFindOneAndUpdate;
  Worker.findByIdAndUpdate = originalWorkerFindByIdAndUpdate;
  cloudinary.uploader.upload = originalCloudinaryUpload;
  fs.unlinkSync = originalUnlinkSync;
});

test("createProblem saves a problem without uploads", async () => {
  let savedProblem = null;
  Problem.prototype.save = async function save() {
    savedProblem = this;
  };

  const req = {
    body: {
      userId: "507f1f77bcf86cd799439011",
      name: "Broken tap",
      description: "Kitchen sink leak",
      address: "507f191e810c19729de860ea",
      urgency: true,
    },
  };
  const res = createRes();

  await createProblem(req, res);

  assert.equal(res.statusCode, 201);
  assert.equal(res.body.name, "Broken tap");
  assert.equal(res.body.picture, null);
  assert.equal(res.body.video, null);
  assert.equal(savedProblem.name, "Broken tap");
  assert.equal(savedProblem.urgency, true);
});

test("createProblem uploads picture and video, then deletes temp files", async () => {
  const uploadCalls = [];
  const deletedPaths = [];

  Problem.prototype.save = async function save() {};
  cloudinary.uploader.upload = async (filePath, options) => {
    uploadCalls.push({ filePath, options });
    return {
      secure_url: options.resource_type === "video"
        ? "https://cdn.example/video.mp4"
        : "https://cdn.example/picture.png",
    };
  };
  fs.unlinkSync = (filePath) => {
    deletedPaths.push(filePath);
  };

  const req = {
    body: {
      userId: "507f1f77bcf86cd799439011",
      name: "Blocked drain",
      description: "Bathroom drain clogged",
      address: "507f191e810c19729de860ea",
      urgency: false,
    },
    files: {
      picture: [{ path: "/tmp/picture.png" }],
      video: [{ path: "/tmp/video.mp4" }],
    },
  };
  const res = createRes();

  await createProblem(req, res);

  assert.equal(res.statusCode, 201);
  assert.equal(res.body.picture, "https://cdn.example/picture.png");
  assert.equal(res.body.video, "https://cdn.example/video.mp4");
  assert.deepEqual(uploadCalls, [
    {
      filePath: "/tmp/picture.png",
      options: { folder: "rapidfix/images" },
    },
    {
      filePath: "/tmp/video.mp4",
      options: { resource_type: "video", folder: "rapidfix/videos" },
    },
  ]);
  assert.deepEqual(deletedPaths, ["/tmp/picture.png", "/tmp/video.mp4"]);
});

test("resolveProblem returns 404 when the problem does not exist", async () => {
  let workerUpdated = false;
  Problem.findById = async () => null;
  Worker.findByIdAndUpdate = async () => {
    workerUpdated = true;
  };

  const req = { params: { problemId: "problem-1" } };
  const res = createRes();

  await resolveProblem(req, res);

  assert.equal(res.statusCode, 404);
  assert.deepEqual(res.body, { message: "Problem not found" });
  assert.equal(workerUpdated, false);
});

test("resolveProblem removes the assignment from the worker and marks the problem resolved", async () => {
  let saved = false;
  let workerUpdateArgs = null;
  const problem = {
    assigned_worker: "worker-1",
    status: "unresolved",
    save: async () => {
      saved = true;
    },
  };

  Problem.findById = async () => problem;
  Worker.findByIdAndUpdate = async (...args) => {
    workerUpdateArgs = args;
  };

  const req = { params: { problemId: "problem-123" } };
  const res = createRes();

  await resolveProblem(req, res);

  assert.deepEqual(workerUpdateArgs, [
    "worker-1",
    {
      $pull: {
        accepted_problems: "problem-123",
      },
    },
  ]);
  assert.equal(problem.assigned_worker, null);
  assert.equal(problem.status, "resolved");
  assert.equal(saved, true);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, { message: "problem resolved successfully!" });
});

test("workerAcceptProblem claims an available problem for a worker", async () => {
  let workerUpdateArgs = null;
  const updatedProblem = { _id: "problem-1", status: "unresolved" };

  Problem.findOneAndUpdate = async (query, update, options) => {
    assert.deepEqual(query, {
      _id: "problem-1",
      status: "pending",
      assigned_worker: null,
      rejected_workers: { $ne: "worker-1" },
    });
    assert.deepEqual(update, {
      $set: {
        assigned_worker: "worker-1",
        status: "unresolved",
      },
    });
    assert.deepEqual(options, { new: true });
    return updatedProblem;
  };
  Worker.findByIdAndUpdate = async (...args) => {
    workerUpdateArgs = args;
  };

  const req = { body: { workerId: "worker-1", problemId: "problem-1" } };
  const res = createRes();

  await workerAcceptProblem(req, res);

  assert.deepEqual(workerUpdateArgs, [
    "worker-1",
    {
      $addToSet: { accepted_problems: "problem-1" },
    },
  ]);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.data, updatedProblem);
});

test("workerAcceptProblem rejects requests for unavailable problems", async () => {
  let workerUpdated = false;
  Problem.findOneAndUpdate = async () => null;
  Worker.findByIdAndUpdate = async () => {
    workerUpdated = true;
  };

  const req = { body: { workerId: "worker-1", problemId: "problem-1" } };
  const res = createRes();

  await workerAcceptProblem(req, res);

  assert.equal(res.statusCode, 400);
  assert.deepEqual(res.body, {
    success: false,
    message: "Already taken or rejected",
  });
  assert.equal(workerUpdated, false);
});

test("userRejectWorker saves the rejection and removes the problem from the worker", async () => {
  let saved = false;
  let workerUpdateArgs = null;
  const problem = {
    rejected_workers: [{ toString: () => "worker-0" }],
    assigned_worker: { toString: () => "worker-2" },
    status: "unresolved",
    save: async () => {
      saved = true;
    },
  };

  Problem.findById = async () => problem;
  Worker.findByIdAndUpdate = async (...args) => {
    workerUpdateArgs = args;
  };

  const req = { body: { problemId: "problem-2", workerId: "worker-2" } };
  const res = createRes();

  await userRejectWorker(req, res);

  assert.equal(problem.rejected_workers.length, 2);
  assert.equal(problem.rejected_workers[1], "worker-2");
  assert.equal(problem.assigned_worker, null);
  assert.equal(problem.status, "pending");
  assert.equal(saved, true);
  assert.deepEqual(workerUpdateArgs, [
    "worker-2",
    {
      $pull: { accepted_problems: "problem-2" },
    },
  ]);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.success, true);
});

test("userAcceptWorker rejects a mismatched assigned worker", async () => {
  Problem.findById = async () => ({
    assigned_worker: { toString: () => "worker-9" },
  });

  const req = { body: { problemId: "problem-9", workerId: "worker-1" } };
  const res = createRes();

  await userAcceptWorker(req, res);

  assert.equal(res.statusCode, 400);
  assert.deepEqual(res.body, {
    success: false,
    message: "Invalid worker",
  });
});

test("userAcceptWorker returns success when the assigned worker matches", async () => {
  const problem = {
    assigned_worker: { toString: () => "worker-3" },
  };
  Problem.findById = async () => problem;

  const req = { body: { problemId: "problem-3", workerId: "worker-3" } };
  const res = createRes();

  await userAcceptWorker(req, res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, {
    success: true,
    message: "Worker accepted successfully",
    data: problem,
  });
});
