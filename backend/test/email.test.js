const test = require("node:test");
const assert = require("node:assert/strict");

const Worker = require("../model/workers.model.js");
const User = require("../model/user.model.js");
const { updateProfileController } = require("../controllers/auth.controller.js");

const originalWorkerFindById = Worker.findById;
const originalUserFindById = User.findById;

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
