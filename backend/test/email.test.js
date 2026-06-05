const test = require("node:test");
const assert = require("node:assert/strict");

const Worker = require("../model/workers.model.js");
const User = require("../model/user.model.js");
const Problem = require("../model/problem.model.js");
const nodemailerService = require("../services/nodemailer.service.js");
const { 
  updateProfileController, 
  sendEmailOtpController, 
  verifyEmailOtpController 
} = require("../controllers/auth.controller.js");

const originalWorkerFindById = Worker.findById;
const originalUserFindById = User.findById;
const originalProblemFindOneAndUpdate = Problem.findOneAndUpdate;
const originalProblemFindById = Problem.findById;
const originalWorkerFindByIdAndUpdate = Worker.findByIdAndUpdate;

const originalSendEmailOtp = nodemailerService.sendEmailOtp;
const originalSendWorkerAcceptedEmail = nodemailerService.sendWorkerAcceptedEmail;
const originalSendWorkerReachedEmail = nodemailerService.sendWorkerReachedEmail;
const originalSendProblemResolvedEmail = nodemailerService.sendProblemResolvedEmail;
const originalSendWorkerPendingConfirmationEmail = nodemailerService.sendWorkerPendingConfirmationEmail;
const originalSendCustomerApprovedWorkerEmail = nodemailerService.sendCustomerApprovedWorkerEmail;
const originalSendCustomerRejectedWorkerEmail = nodemailerService.sendCustomerRejectedWorkerEmail;
const originalSendAutoAcceptedWorkerEmail = nodemailerService.sendAutoAcceptedWorkerEmail;

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
  Worker.findById = originalWorkerFindById;
  User.findById = originalUserFindById;
  Problem.findOneAndUpdate = originalProblemFindOneAndUpdate;
  Problem.findById = originalProblemFindById;
  Worker.findByIdAndUpdate = originalWorkerFindByIdAndUpdate;
  
  nodemailerService.sendEmailOtp = originalSendEmailOtp;
  nodemailerService.sendWorkerAcceptedEmail = originalSendWorkerAcceptedEmail;
  nodemailerService.sendWorkerReachedEmail = originalSendWorkerReachedEmail;
  nodemailerService.sendProblemResolvedEmail = originalSendProblemResolvedEmail;
  nodemailerService.sendWorkerPendingConfirmationEmail = originalSendWorkerPendingConfirmationEmail;
  nodemailerService.sendCustomerApprovedWorkerEmail = originalSendCustomerApprovedWorkerEmail;
  nodemailerService.sendCustomerRejectedWorkerEmail = originalSendCustomerRejectedWorkerEmail;
  nodemailerService.sendAutoAcceptedWorkerEmail = originalSendAutoAcceptedWorkerEmail;
});

test("updateProfileController resets worker isEmailVerified when email changes", async () => {
  let saved = false;
  const mockWorker = {
    _id: "worker-1",
    email: "old@example.com",
    isEmailVerified: true,
    save: async function() {
      saved = true;
    },
    toObject: function() {
      return this;
    }
  };

  Worker.findById = async () => mockWorker;

  const req = {
    user: { sub: "worker-1", role: "worker" },
    body: { email: "new@example.com" }
  };
  const res = createRes();

  await updateProfileController(req, res);

  assert.equal(mockWorker.email, "new@example.com");
  assert.equal(mockWorker.isEmailVerified, false);
  assert.equal(saved, true);
});

test("updateProfileController does NOT reset worker isEmailVerified when email is identical", async () => {
  let saved = false;
  const mockWorker = {
    _id: "worker-1",
    email: "same@example.com",
    isEmailVerified: true,
    save: async function() {
      saved = true;
    },
    toObject: function() {
      return this;
    }
  };

  Worker.findById = async () => mockWorker;

  const req = {
    user: { sub: "worker-1", role: "worker" },
    body: { email: "same@example.com" }
  };
  const res = createRes();

  await updateProfileController(req, res);

  assert.equal(mockWorker.isEmailVerified, true);
  assert.equal(saved, true);
});

test("updateProfileController resets user isEmailVerified and isPhoneVerified when credentials change", async () => {
  let saved = false;
  const mockUser = {
    _id: "user-1",
    email: "old@example.com",
    phone: "9876543210",
    isEmailVerified: true,
    isPhoneVerified: true,
    save: async function() {
      saved = true;
    },
    toObject: function() {
      return this;
    }
  };

  User.findById = async () => mockUser;

  const req = {
    user: { sub: "user-1", role: "user" },
    body: { email: "new@example.com", phone: "5555555555" }
  };
  const res = createRes();

  await updateProfileController(req, res);

  assert.equal(mockUser.email, "new@example.com");
  assert.equal(mockUser.phone, "5555555555");
  assert.equal(mockUser.isEmailVerified, false);
  assert.equal(mockUser.isPhoneVerified, false);
  assert.equal(saved, true);
});

test("updateProfileController does NOT reset user verification when credentials are identical", async () => {
  let saved = false;
  const mockUser = {
    _id: "user-1",
    email: "same@example.com",
    phone: "9876543210",
    isEmailVerified: true,
    isPhoneVerified: true,
    save: async function() {
      saved = true;
    },
    toObject: function() {
      return this;
    }
  };

  User.findById = async () => mockUser;

  const req = {
    user: { sub: "user-1", role: "user" },
    body: { email: "same@example.com", phone: "9876543210" }
  };
  const res = createRes();

  await updateProfileController(req, res);

  assert.equal(mockUser.isEmailVerified, true);
  assert.equal(mockUser.isPhoneVerified, true);
  assert.equal(saved, true);
});

test("sendEmailOtpController generates OTP and calls nodemailer service", async () => {
  let saved = false;
  const mockUser = {
    _id: "user-1",
    email: "user@example.com",
    emailVerificationCode: null,
    emailVerificationExpires: null,
    save: async function() {
      saved = true;
    }
  };
  User.findById = async () => mockUser;

  let sentEmail = null;
  let sentOtp = null;
  nodemailerService.sendEmailOtp = async (email, otp) => {
    sentEmail = email;
    sentOtp = otp;
  };

  const req = {
    user: { sub: "user-1", role: "user" }
  };
  const res = createRes();

  await sendEmailOtpController(req, res);

  assert.equal(res.body.success, true);
  assert.equal(sentEmail, "user@example.com");
  assert.ok(sentOtp);
  assert.equal(mockUser.emailVerificationCode, sentOtp);
  assert.ok(mockUser.emailVerificationExpires);
  assert.equal(saved, true);
});

test("verifyEmailOtpController successfully verifies correct code and updates status", async () => {
  let saved = false;
  const mockUser = {
    _id: "user-1",
    email: "user@example.com",
    isEmailVerified: false,
    emailVerificationCode: "123456",
    emailVerificationExpires: new Date(Date.now() + 50000),
    save: async function() {
      saved = true;
    },
    toObject: function() {
      return this;
    }
  };
  User.findById = async () => mockUser;

  const req = {
    user: { sub: "user-1", role: "user" },
    body: { code: "123456" }
  };
  const res = createRes();

  await verifyEmailOtpController(req, res);

  assert.equal(res.body.success, true);
  assert.equal(mockUser.isEmailVerified, true);
  assert.equal(mockUser.emailVerificationCode, null);
  assert.equal(mockUser.emailVerificationExpires, null);
  assert.equal(saved, true);
});

test("verifyEmailOtpController rejects incorrect code", async () => {
  let saved = false;
  const mockUser = {
    _id: "user-1",
    email: "user@example.com",
    isEmailVerified: false,
    emailVerificationCode: "123456",
    emailVerificationExpires: new Date(Date.now() + 50000),
    save: async function() {
      saved = true;
    }
  };
  User.findById = async () => mockUser;

  const req = {
    user: { sub: "user-1", role: "user" },
    body: { code: "000000" }
  };
  const res = createRes();

  await verifyEmailOtpController(req, res);

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.success, false);
  assert.equal(mockUser.isEmailVerified, false);
  assert.equal(saved, false);
});

test("workerAcceptProblem triggers sendWorkerPendingConfirmationEmail notification", async () => {
  let workerUpdated = false;
  let problem = {
    _id: "problem-123",
    userId: "customer-123",
    name: "Leaky Pipe Fix",
    assigned_worker: "worker-123",
    status: "on the way"
  };

  Problem.findOneAndUpdate = async () => problem;
  Worker.findByIdAndUpdate = async () => { workerUpdated = true; };

  const mockCustomer = {
    _id: "customer-123",
    name: "John Customer",
    email: "john@customer.com"
  };
  User.findById = async () => mockCustomer;

  const mockWorker = {
    _id: "worker-123",
    name: "Alex Worker"
  };
  Worker.findById = async () => mockWorker;

  let sentEmail = null;
  let sentCustomerName = null;
  let sentWorkerName = null;
  let sentProblemName = null;
  nodemailerService.sendWorkerPendingConfirmationEmail = async (custEmail, custName, workName, probName) => {
    sentEmail = custEmail;
    sentCustomerName = custName;
    sentWorkerName = workName;
    sentProblemName = probName;
  };

  const req = {
    body: { workerId: "worker-123", problemId: "problem-123" }
  };
  const res = createRes();

  const { workerAcceptProblem } = require("../controllers/workers.controller.js");
  await workerAcceptProblem(req, res);

  assert.equal(res.body.success, true);
  assert.equal(sentEmail, "john@customer.com");
  assert.equal(sentCustomerName, "John Customer");
  assert.equal(sentWorkerName, "Alex Worker");
  assert.equal(sentProblemName, "Leaky Pipe Fix");
});

test("startProblemProgress triggers sendWorkerReachedEmail notification", async () => {
  let saved = false;
  let problem = {
    _id: "problem-123",
    userId: "customer-123",
    assigned_worker: "worker-123",
    name: "Leaky Pipe Fix",
    status: "on the way",
    save: async function() {
      saved = true;
    }
  };

  Problem.findById = async () => problem;

  const mockCustomer = {
    _id: "customer-123",
    name: "John Customer",
    email: "john@customer.com"
  };
  User.findById = async () => mockCustomer;

  const mockWorker = {
    _id: "worker-123",
    name: "Alex Worker"
  };
  Worker.findById = async () => mockWorker;

  let sentEmail = null;
  let sentCustomerName = null;
  let sentWorkerName = null;
  let sentProblemName = null;
  nodemailerService.sendWorkerReachedEmail = async (custEmail, custName, workName, probName) => {
    sentEmail = custEmail;
    sentCustomerName = custName;
    sentWorkerName = workName;
    sentProblemName = probName;
  };

  const req = {
    params: { problemId: "problem-123" }
  };
  const res = createRes();

  const { startProblemProgress } = require("../controllers/problems.controller.js");
  await startProblemProgress(req, res);

  assert.equal(res.body.success, true);
  assert.equal(problem.status, "in progress");
  assert.equal(sentEmail, "john@customer.com");
  assert.equal(sentCustomerName, "John Customer");
  assert.equal(sentWorkerName, "Alex Worker");
  assert.equal(sentProblemName, "Leaky Pipe Fix");
  assert.equal(saved, true);
});

test("resolveProblem triggers sendProblemResolvedEmail notification with payment amount", async () => {
  let saved = false;
  let problem = {
    _id: "problem-123",
    userId: "customer-123",
    assigned_worker: "worker-123",
    resolved_worker: null,
    name: "Leaky Pipe Fix",
    status: "in progress",
    amountReceived: 0,
    save: async function() {
      saved = true;
    }
  };

  Problem.findById = async () => problem;
  Worker.findByIdAndUpdate = async () => {};

  const mockCustomer = {
    _id: "customer-123",
    name: "John Customer",
    email: "john@customer.com"
  };
  User.findById = async () => mockCustomer;

  const mockWorker = {
    _id: "worker-123",
    name: "Alex Worker"
  };
  Worker.findById = async () => mockWorker;

  let sentEmail = null;
  let sentCustomerName = null;
  let sentWorkerName = null;
  let sentProblemName = null;
  let sentAmount = null;
  nodemailerService.sendProblemResolvedEmail = async (custEmail, custName, workName, probName, amount) => {
    sentEmail = custEmail;
    sentCustomerName = custName;
    sentWorkerName = workName;
    sentProblemName = probName;
    sentAmount = amount;
  };

  const req = {
    params: { problemId: "problem-123" },
    body: { amountReceived: 450 }
  };
  const res = createRes();

  const { resolveProblem } = require("../controllers/problems.controller.js");
  await resolveProblem(req, res);

  assert.equal(res.body.message, "problem resolved successfully!");
  assert.equal(problem.status, "resolved");
  assert.equal(problem.amountReceived, 450);
  assert.equal(sentEmail, "john@customer.com");
  assert.equal(sentCustomerName, "John Customer");
  assert.equal(sentWorkerName, "Alex Worker");
  assert.equal(sentProblemName, "Leaky Pipe Fix");
  assert.equal(sentAmount, 450);
  assert.equal(saved, true);
});
