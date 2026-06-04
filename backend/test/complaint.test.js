const test = require("node:test");
const assert = require("node:assert/strict");

const Complaint = require("../model/complaint.model.js");
const { disputeComplaint, revokeDisputeAdmin } = require("../controllers/complaint.controller.js");

const originalFindOne = Complaint.findOne;
const originalFindByIdAndUpdate = Complaint.findByIdAndUpdate;

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

test("revokeDisputeAdmin updates status to revoked", async () => {
  let updatedData = null;
  Complaint.findByIdAndUpdate = async (id, update, options) => {
    updatedData = { id, update };
    return { _id: id, status: "revoked" };
  };

  const req = {
    params: { id: "complaint-1" }
  };
  const res = createRes();

  await revokeDisputeAdmin(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.complaint.status, "revoked");
  assert.deepEqual(updatedData, {
    id: "complaint-1",
    update: { status: "revoked" }
  });
});
