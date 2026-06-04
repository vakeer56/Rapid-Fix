const test = require("node:test");
const assert = require("node:assert/strict");

const Worker = require("../model/workers.model.js");
const firebaseAdminMiddleware = require("../middleware/firebaseAdmin.middleware.js");
const { verifyWorkerPhoneController } = require("../controllers/auth.controller.js");

const originalVerifyFirebaseToken = firebaseAdminMiddleware.verifyFirebaseToken;
const originalFindById = Worker.findById;

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
  firebaseAdminMiddleware.verifyFirebaseToken = originalVerifyFirebaseToken;
  Worker.findById = originalFindById;
});

test("verifyWorkerPhoneController successfully verifies phone number", async () => {
  let saved = false;
  const mockWorker = {
    _id: "worker-1",
    phone: "9876543210",
    isPhoneVerified: false,
    save: async function() {
      saved = true;
    },
    toObject: function() {
      return this;
    }
  };

  Worker.findById = async () => mockWorker;

  firebaseAdminMiddleware.verifyFirebaseToken = async (token) => {
    assert.equal(token, "valid-token");
    return {
      uid: "firebase-uid",
      phone_number: "+919876543210"
    };
  };

  const req = {
    user: { sub: "worker-1" },
    body: { idToken: "valid-token" }
  };
  const res = createRes();

  await verifyWorkerPhoneController(req, res);

  assert.equal(res.statusCode, undefined); // res.json doesn't set status code in mock (implies 200)
  assert.equal(res.body.success, true);
  assert.equal(mockWorker.isPhoneVerified, true);
  assert.equal(saved, true);
});

test("verifyWorkerPhoneController fails on phone number mismatch", async () => {
  let saved = false;
  const mockWorker = {
    _id: "worker-1",
    phone: "9876543210",
    isPhoneVerified: false,
    save: async function() {
      saved = true;
    },
    toObject: function() {
      return this;
    }
  };

  Worker.findById = async () => mockWorker;

  firebaseAdminMiddleware.verifyFirebaseToken = async (token) => {
    return {
      uid: "firebase-uid",
      phone_number: "+915555555555"
    };
  };

  const req = {
    user: { sub: "worker-1" },
    body: { idToken: "mismatch-token" }
  };
  const res = createRes();

  await verifyWorkerPhoneController(req, res);

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.success, false);
  assert.equal(res.body.message.includes("Phone number mismatch"), true);
  assert.equal(mockWorker.isPhoneVerified, false);
  assert.equal(saved, false);
});

test("verifyWorkerPhoneController fails when phone number is missing in token", async () => {
  let saved = false;
  const mockWorker = {
    _id: "worker-1",
    phone: "9876543210",
    isPhoneVerified: false,
    save: async function() {
      saved = true;
    },
    toObject: function() {
      return this;
    }
  };

  Worker.findById = async () => mockWorker;

  firebaseAdminMiddleware.verifyFirebaseToken = async (token) => {
    return {
      uid: "firebase-uid",
      email: "test@example.com"
      // no phone_number
    };
  };

  const req = {
    user: { sub: "worker-1" },
    body: { idToken: "no-phone-token" }
  };
  const res = createRes();

  await verifyWorkerPhoneController(req, res);

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.success, false);
  assert.equal(res.body.message.includes("No phone number found"), true);
  assert.equal(saved, false);
});
