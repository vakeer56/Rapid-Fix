const test = require("node:test");
const assert = require("node:assert/strict");

const Complaint = require("../model/complaint.model.js");
const Worker = require("../model/workers.model.js");
const nodemailerService = require("../services/nodemailer.service.js");
const { 
  disputeComplaint, 
  revokeDisputeAdmin,
  deleteComplaintAdmin
} = require("../controllers/complaint.controller.js");

const originalFindOne = Complaint.findOne;
const originalFindByIdAndUpdate = Complaint.findByIdAndUpdate;
const originalFindByIdAndDelete = Complaint.findByIdAndDelete;
const originalWorkerFindById = Worker.findById;
const originalWorkerFindByIdAndUpdate = Worker.findByIdAndUpdate;

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
  Complaint.findOne = originalFindOne;
  Complaint.findByIdAndUpdate = originalFindByIdAndUpdate;
  Complaint.findByIdAndDelete = originalFindByIdAndDelete;
  Worker.findById = originalWorkerFindById;
  Worker.findByIdAndUpdate = originalWorkerFindByIdAndUpdate;
});

test("disputeComplaint disputes a pending complaint successfully", async () => {
  let saved = false;
  const mockComplaint = {
    _id: "complaint-1",
    status: "pending",
    worker_id: "worker-1",
    save: async function() {
      saved = true;
    }
  };

  Complaint.findOne = async () => mockComplaint;

  const req = {
    params: { id: "complaint-1" },
    user: { sub: "worker-1" }
  };
  const res = createRes();

  await disputeComplaint(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.success, true);
  assert.equal(mockComplaint.status, "disputed");
  assert.equal(saved, true);
});

test("disputeComplaint fails if the complaint is already revoked", async () => {
  let saved = false;
  const mockComplaint = {
    _id: "complaint-1",
    status: "revoked",
    worker_id: "worker-1",
    save: async function() {
      saved = true;
    }
  };

  Complaint.findOne = async () => mockComplaint;

  const req = {
    params: { id: "complaint-1" },
    user: { sub: "worker-1" }
  };
  const res = createRes();

  await disputeComplaint(req, res);

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.success, false);
  assert.equal(res.body.message.includes("rejected"), true);
  assert.equal(saved, false);
});

test("disputeComplaint fails if the complaint is already disputed", async () => {
  let saved = false;
  const mockComplaint = {
    _id: "complaint-1",
    status: "disputed",
    worker_id: "worker-1",
    save: async function() {
      saved = true;
    }
  };

  Complaint.findOne = async () => mockComplaint;

  const req = {
    params: { id: "complaint-1" },
    user: { sub: "worker-1" }
  };
  const res = createRes();

  await disputeComplaint(req, res);

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.success, false);
  assert.equal(res.body.message.includes("already disputed"), true);
  assert.equal(saved, false);
});

test("revokeDisputeAdmin updates status to revoked and triggers email", async () => {
  let updatedData = null;
  let emailSent = null;

  Complaint.findByIdAndUpdate = async (id, update, options) => {
    updatedData = { id, update };
    return { 
      _id: id, 
      worker_id: "worker-123", 
      title: "Bad service",
      status: "revoked" 
    };
  };

  Worker.findById = async (id) => {
    return {
      _id: id,
      name: "John Worker",
      email: "john@worker.com"
    };
  };

  nodemailerService.sendWorkerDisputeRejectedEmail = async (email, name, title) => {
    emailSent = { email, name, title };
  };

  const req = {
    params: { id: "complaint-123" }
  };
  const res = createRes();

  await revokeDisputeAdmin(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.complaint.status, "revoked");
  assert.deepEqual(updatedData, {
    id: "complaint-123",
    update: { status: "revoked" }
  });
  assert.deepEqual(emailSent, {
    email: "john@worker.com",
    name: "John Worker",
    title: "Bad service"
  });
});

test("deleteComplaintAdmin deletes a complaint and triggers approved email", async () => {
  let deletedId = null;
  let workerUpdated = null;
  let emailSent = null;

  Complaint.findByIdAndDelete = async (id) => {
    deletedId = id;
    return {
      _id: id,
      worker_id: "worker-123",
      title: "Bad service"
    };
  };

  Worker.findByIdAndUpdate = async (id, update) => {
    workerUpdated = { id, update };
  };

  Worker.findById = async (id) => {
    return {
      _id: id,
      name: "John Worker",
      email: "john@worker.com"
    };
  };

  nodemailerService.sendWorkerDisputeApprovedEmail = async (email, name, title) => {
    emailSent = { email, name, title };
  };

  const req = {
    params: { id: "complaint-123" }
  };
  const res = createRes();

  await deleteComplaintAdmin(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.success, true);
  assert.equal(deletedId, "complaint-123");
  assert.deepEqual(workerUpdated, {
    id: "worker-123",
    update: { $inc: { complaintsCount: -1 } }
  });
  assert.deepEqual(emailSent, {
    email: "john@worker.com",
    name: "John Worker",
    title: "Bad service"
  });
});
