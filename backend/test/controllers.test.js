const test = require("node:test");
const assert = require("node:assert/strict");

const Problem = require("../model/problem.model.js");
const Worker = require("../model/workers.model.js");
const User = require("../model/user.model.js");
const cloudinary = require("../config/cloudinary.js");
const fs = require("node:fs");
const nodemailerService = require("../services/nodemailer.service.js");

// Mock nodemailer service globally for controllers tests
nodemailerService.sendWorkerAcceptedEmail = async () => {};
nodemailerService.sendWorkerReachedEmail = async () => {};
nodemailerService.sendProblemResolvedEmail = async () => {};

const {
  createProblem,
  resolveProblem,
} = require("../controllers/problems.controller.js");
const {
  workerAcceptProblem,
  userAcceptWorker,
  userRejectWorker,
  workerIntimateComing,
} = require("../controllers/workers.controller.js");

const originalProblemSave = Problem.prototype.save;
const originalProblemFindById = Problem.findById;
const originalProblemFindOneAndUpdate = Problem.findOneAndUpdate;
const originalWorkerFindByIdAndUpdate = Worker.findByIdAndUpdate;
const originalWorkerFindById = Worker.findById;
const originalUserFindById = User.findById;
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

test.beforeEach(() => {
  User.findById = async () => ({ _id: "user-1", name: "Mock User", email: "mock@user.com" });
  Worker.findById = async () => ({ _id: "worker-1", name: "Mock Worker", email: "mock@worker.com" });
  Problem.findById = async () => ({
    _id: "problem-1",
    status: "on the way",
    isConfirmedByCustomer: false,
    assigned_worker: "worker-1",
    save: async () => {}
  });
});

test.afterEach(() => {
  Problem.prototype.save = originalProblemSave;
  Problem.findById = originalProblemFindById;
  Problem.findOneAndUpdate = originalProblemFindOneAndUpdate;
  Worker.findByIdAndUpdate = originalWorkerFindByIdAndUpdate;
  Worker.findById = originalWorkerFindById;
  User.findById = originalUserFindById;
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
      category: "Plumber",
    },
  };
  const res = createRes();

  await createProblem(req, res);

  assert.equal(res.statusCode, 201);
  assert.equal(res.body.name, "Broken tap");
  assert.equal(res.body.picture, null);
  assert.equal(res.body.video, null);
  assert.deepEqual(res.body.pictures, []);
  assert.deepEqual(res.body.videos, []);
  assert.equal(res.body.category, "Plumber");
  assert.equal(savedProblem.name, "Broken tap");
  assert.equal(savedProblem.urgency, true);
  assert.equal(savedProblem.category, "Plumber");
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
      category: "Electrician",
    },
    files: {
      picture: [{ path: "/tmp/picture.png" }, { path: "/tmp/picture2.png" }],
      video: [{ path: "/tmp/video.mp4" }],
    },
  };
  const res = createRes();

  await createProblem(req, res);

  assert.equal(res.statusCode, 201);
  assert.equal(res.body.picture, "https://cdn.example/picture.png");
  assert.equal(res.body.video, "https://cdn.example/video.mp4");
  assert.deepEqual(res.body.pictures, ["https://cdn.example/picture.png", "https://cdn.example/picture.png"]);
  assert.deepEqual(res.body.videos, ["https://cdn.example/video.mp4"]);
  assert.equal(res.body.category, "Electrician");
  assert.deepEqual(uploadCalls, [
    {
      filePath: "/tmp/picture.png",
      options: { folder: "rapidfix/images" },
    },
    {
      filePath: "/tmp/picture2.png",
      options: { folder: "rapidfix/images" },
    },
    {
      filePath: "/tmp/video.mp4",
      options: { resource_type: "video", folder: "rapidfix/videos" },
    },
  ]);
  assert.deepEqual(deletedPaths, ["/tmp/picture.png", "/tmp/picture2.png", "/tmp/video.mp4"]);
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
      $inc: {
        completedJobs: 1,
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
  const updatedProblem = { _id: "problem-1", status: "on the way" };

  Problem.findOneAndUpdate = async (query, update, options) => {
    assert.deepEqual(query, {
      _id: "problem-1",
      status: "pending",
      assigned_worker: null,
      rejected_workers: { $ne: "worker-1" },
    });
    assert.equal(update.$set.assigned_worker, "worker-1");
    assert.equal(update.$set.status, "on the way");
    assert.equal(update.$set.isConfirmedByCustomer, false);
    assert.ok(update.$set.confirmationExpiresAt instanceof Date);
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
    save: async () => {}
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

test("workerIntimateComing returns 404 if problem not found", async () => {
  Problem.findById = async () => null;

  const req = { body: { problemId: "problem-none", workerId: "worker-1" } };
  const res = createRes();

  await workerIntimateComing(req, res);

  assert.equal(res.statusCode, 404);
  assert.deepEqual(res.body, {
    success: false,
    message: "Problem not found",
  });
});

test("workerIntimateComing returns 400 if worker mismatch", async () => {
  Problem.findById = async () => ({
    assigned_worker: { toString: () => "worker-2" }
  });

  const req = { body: { problemId: "problem-1", workerId: "worker-1" } };
  const res = createRes();

  await workerIntimateComing(req, res);

  assert.equal(res.statusCode, 400);
  assert.deepEqual(res.body, {
    success: false,
    message: "Invalid worker",
  });
});

test("workerIntimateComing sets isWorkerHeadingOver and returns 200 on success", async () => {
  let saved = false;
  const problem = {
    assigned_worker: { toString: () => "worker-1" },
    isWorkerHeadingOver: false,
    save: async () => {
      saved = true;
    }
  };
  Problem.findById = async () => problem;

  const req = {
    body: { problemId: "problem-1", workerId: "worker-1" },
    app: {
      get: (key) => null
    }
  };
  const res = createRes();

  await workerIntimateComing(req, res);

  assert.equal(problem.isWorkerHeadingOver, true);
  assert.equal(saved, true);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.message, "Customer intimated successfully");
});

const { approveVerification, rejectVerification } = require("../controllers/verification.controller.js");

test("approveVerification approves a pending worker documents and sends email", async () => {
  let saved = false;
  let emailSent = null;

  const mockWorker = {
    _id: "worker-verified-1",
    name: "Doc Worker",
    email: "doc@worker.com",
    governmentVerification: {
      status: "pending",
      reviewedAt: null,
      rejectionReason: ""
    },
    save: async function() {
      saved = true;
    },
    get badge() {
      return { tier: "verified_pro", label: "Verified Pro" };
    }
  };

  Worker.findById = async () => mockWorker;
  nodemailerService.sendWorkerDocumentVerifiedEmail = async (email, name) => {
    emailSent = { email, name };
  };

  const req = {
    params: { id: "worker-verified-1" }
  };
  const res = createRes();

  await approveVerification(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.success, true);
  assert.equal(mockWorker.governmentVerification.status, "approved");
  assert.ok(mockWorker.governmentVerification.reviewedAt instanceof Date);
  assert.equal(saved, true);
  assert.deepEqual(emailSent, {
    email: "doc@worker.com",
    name: "Doc Worker"
  });
});

test("rejectVerification rejects a pending worker documents without email", async () => {
  let saved = false;

  const mockWorker = {
    _id: "worker-verified-2",
    name: "Rejected Worker",
    email: "rejected@worker.com",
    governmentVerification: {
      status: "pending",
      reviewedAt: null,
      rejectionReason: ""
    },
    save: async function() {
      saved = true;
    },
    get badge() {
      return { tier: "verified", label: "Verified" };
    }
  };

  Worker.findById = async () => mockWorker;

  const req = {
    params: { id: "worker-verified-2" },
    body: { rejectionReason: "Blurry images" }
  };
  const res = createRes();

  await rejectVerification(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.success, true);
  assert.equal(mockWorker.governmentVerification.status, "rejected");
  assert.equal(mockWorker.governmentVerification.rejectionReason, "Blurry images");
  assert.equal(saved, true);
});

const { deleteAccountController } = require("../controllers/auth.controller.js");

test("deleteAccountController permanently deletes worker account and sends worker farewell email", async () => {
  let workerDeletedId = null;
  let emailSent = null;

  Worker.findById = async (id) => {
    return {
      _id: id,
      name: "Jim Worker",
      email: "jim@worker.com"
    };
  };

  Worker.findByIdAndDelete = async (id) => {
    workerDeletedId = id;
    return {};
  };

  const Problem = require("../model/problem.model.js");
  const originalUpdateMany = Problem.updateMany;
  let updateManyCalls = [];
  Problem.updateMany = async (query, update) => {
    updateManyCalls.push({ query, update });
  };

  nodemailerService.sendWorkerFarewellEmail = async (email, name) => {
    emailSent = { email, name };
  };

  const req = {
    user: { sub: "worker-delete-1", role: "worker" },
    body: { confirmation: "worker@Jim Worker" }
  };
  const res = createRes();

  await deleteAccountController(req, res);

  Problem.updateMany = originalUpdateMany;

  assert.equal(res.body.success, true);
  assert.equal(workerDeletedId, "worker-delete-1");
  assert.equal(updateManyCalls.length, 2);
  assert.deepEqual(emailSent, {
    email: "jim@worker.com",
    name: "Jim Worker"
  });
});

test("deleteAccountController permanently deletes customer account and sends customer farewell email", async () => {
  let userDeletedId = null;
  let emailSent = null;

  User.findById = async (id) => {
    return {
      _id: id,
      name: "Pam Customer",
      email: "pam@customer.com"
    };
  };

  User.findByIdAndDelete = async (id) => {
    userDeletedId = id;
    return {};
  };

  const Address = require("../model/address.model.js");
  const Problem = require("../model/problem.model.js");
  
  const originalAddressDeleteMany = Address.deleteMany;
  const originalProblemDeleteMany = Problem.deleteMany;

  let addressDeleteQuery = null;
  let problemDeleteQuery = null;

  Address.deleteMany = async (query) => {
    addressDeleteQuery = query;
  };
  Problem.deleteMany = async (query) => {
    problemDeleteQuery = query;
  };

  nodemailerService.sendCustomerFarewellEmail = async (email, name) => {
    emailSent = { email, name };
  };

  const req = {
    user: { sub: "user-delete-1", role: "customer" },
    body: { confirmation: "customer@Pam Customer" }
  };
  const res = createRes();

  await deleteAccountController(req, res);

  Address.deleteMany = originalAddressDeleteMany;
  Problem.deleteMany = originalProblemDeleteMany;

  assert.equal(res.body.success, true);
  assert.equal(userDeletedId, "user-delete-1");
  assert.deepEqual(addressDeleteQuery, { belong_to: "user-delete-1" });
  assert.deepEqual(problemDeleteQuery, { userId: "user-delete-1" });
  assert.deepEqual(emailSent, {
    email: "pam@customer.com",
    name: "Pam Customer"
  });
});

