const assert = require('node:assert/strict');
const { afterEach, test } = require('node:test');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const authModel = require('../models/auth');
const Payment = require('../models/payment');
const RefreshToken = require('../models/refreshToken');
const userController = require('../controllers/userController');
const paymentController = require('../controllers/paymentController');
const { authMiddleware, isAdmin } = require('../middleweres/authMiddlewere');
const { checkSubscription } = require('../middleware/subscriptionMiddleware');

const originalMethods = {
  authExists: authModel.exists,
  authFindById: authModel.findById,
  authFindOne: authModel.findOne,
  authFindOneAndUpdate: authModel.findOneAndUpdate,
  paymentFindById: Payment.findById,
  paymentFindOne: Payment.findOne,
  paymentFindOneAndUpdate: Payment.findOneAndUpdate,
  refreshDeleteMany: RefreshToken.deleteMany,
  startSession: mongoose.startSession,
};

afterEach(() => {
  authModel.exists = originalMethods.authExists;
  authModel.findById = originalMethods.authFindById;
  authModel.findOne = originalMethods.authFindOne;
  authModel.findOneAndUpdate = originalMethods.authFindOneAndUpdate;
  Payment.findById = originalMethods.paymentFindById;
  Payment.findOne = originalMethods.paymentFindOne;
  Payment.findOneAndUpdate = originalMethods.paymentFindOneAndUpdate;
  RefreshToken.deleteMany = originalMethods.refreshDeleteMany;
  mongoose.startSession = originalMethods.startSession;
});

const makeResponse = () => ({
  statusCode: 200,
  body: null,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(body) {
    this.body = body;
    return this;
  },
});

const adminRequest = (id) => ({
  params: { id },
  user: { id: new mongoose.Types.ObjectId().toString(), role: 'admin', userType: 'admin', farmId: 'admin-farm' },
  method: 'DELETE',
  originalUrl: '/api/admin/delete',
  ip: '127.0.0.1',
  get: () => 'test-agent',
  farmModels: {
    AuditLog: class AuditLog {
      constructor(data) { this.data = data; }
      async save() { return this.data; }
    },
  },
});

test('missing authentication returns 401 and manager/staff are forbidden', async () => {
  const unauthenticatedResponse = makeResponse();
  await authMiddleware({ cookies: {} }, unauthenticatedResponse, () => assert.fail('next must not run'));
  assert.equal(unauthenticatedResponse.statusCode, 401);

  for (const role of ['manager', 'staff']) {
    const response = makeResponse();
    isAdmin({ user: { role, userType: role } }, response, () => assert.fail('next must not run'));
    assert.equal(response.statusCode, 403);
  }
});

test('deleted access tokens are rejected after account deactivation', async () => {
  const oldSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = 'admin-delete-test-secret';
  const userId = new mongoose.Types.ObjectId().toString();
  const token = jwt.sign({ id: userId, role: 'staff', userType: 'staff' }, process.env.JWT_SECRET, { expiresIn: '5m' });
  authModel.findById = () => ({ select: async () => null });
  const response = makeResponse();

  try {
    await authMiddleware({ cookies: { token } }, response, () => assert.fail('next must not run'));
    assert.equal(response.statusCode, 401);
    assert.equal(response.body.code, 'INVALID_TOKEN');
  } finally {
    if (oldSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = oldSecret;
  }
});

test('invalid user IDs return 400 without querying the database', async () => {
  authModel.findById = async () => assert.fail('database must not be queried');
  await assert.rejects(
    userController.deleteUser(adminRequest('not-an-object-id')),
    (error) => error.statusCode === 400
  );
});

test('nonexistent user IDs return 404', async () => {
  authModel.findById = async () => null;
  await assert.rejects(
    userController.deleteUser(adminRequest(new mongoose.Types.ObjectId().toString())),
    (error) => error.statusCode === 404
  );
});

test('invalid subscription IDs return 400 without querying payments', async () => {
  Payment.findById = () => assert.fail('database must not be queried');
  await assert.rejects(
    paymentController.cancelAdminSubscription(adminRequest('not-an-object-id')),
    (error) => error.statusCode === 400
  );
});

test('nonexistent subscription IDs return 404', async () => {
  Payment.findById = () => ({ lean: async () => null });
  await assert.rejects(
    paymentController.cancelAdminSubscription(adminRequest(new mongoose.Types.ObjectId().toString())),
    (error) => error.statusCode === 404
  );
});

test('manager user accounts cannot be deactivated or cascade-delete farm data', async () => {
  const manager = { _id: new mongoose.Types.ObjectId(), userType: 'manager', role: 'manager', farmId: 'farm-1' };
  authModel.findById = async () => manager;
  authModel.findOneAndUpdate = async () => assert.fail('protected account must not be updated');

  await assert.rejects(
    userController.deleteUser(adminRequest(String(manager._id))),
    (error) => error.statusCode === 409
  );
});

test('staff deactivation preserves the auth record and revokes refresh sessions', async () => {
  const staff = {
    _id: new mongoose.Types.ObjectId(),
    name: 'Farm Staff',
    email: 'staff@example.test',
    userType: 'staff',
    role: 'staff',
    farmId: 'farm-1',
    isAccountVerified: true,
    deletedAt: null,
  };
  let refreshTokensRemovedFor;
  let auditedAction;
  authModel.findById = async () => staff;
  authModel.findOneAndUpdate = async (_filter, update) => {
    Object.assign(staff, update.$set);
    return staff;
  };
  RefreshToken.deleteMany = async (filter) => { refreshTokensRemovedFor = String(filter.userId); };
  const req = adminRequest(String(staff._id));
  req.farmModels.AuditLog = class AuditLog {
    constructor(data) { this.data = data; }
    async save() { auditedAction = this.data.action; }
  };
  const response = makeResponse();

  await userController.deleteUser(req, response);

  assert.equal(response.statusCode, 200);
  assert.ok(staff.deletedAt instanceof Date);
  assert.equal(staff.isAccountVerified, false);
  assert.equal(refreshTokensRemovedFor, String(staff._id));
  assert.equal(auditedAction, 'ADMIN_DELETE_USER');
  assert.equal(response.body.data.id, String(staff._id));
});

test('subscription cancellation keeps the successful payment and deactivates its manager', async () => {
  const managerId = new mongoose.Types.ObjectId();
  const payment = {
    _id: new mongoose.Types.ObjectId(),
    farmId: 'farm-1',
    userId: String(managerId),
    reference: 'SUB_test_1',
    plan: 'basic',
    billingCycle: 'monthly',
    status: 'success',
    createdAt: new Date(),
    subscriptionCancelledAt: null,
  };
  const owner = {
    _id: managerId,
    farmId: 'farm-1',
    userType: 'manager',
    isSubscribed: true,
    subscriptionStatus: 'active',
    subscriptionType: 'paid',
    subscriptionPlan: 'basic',
    billingCycle: 'monthly',
    subscriptionEnd: new Date(Date.now() + 86400000),
  };
  let auditedAction;
  Payment.findById = () => ({ lean: async () => payment });
  Payment.findOne = () => ({ sort: () => ({ lean: async () => payment }) });
  authModel.findOne = () => ({ lean: async () => owner, select: async () => owner });
  authModel.findOneAndUpdate = async (_filter, update) => {
    Object.assign(owner, update.$set);
    return owner;
  };
  Payment.findOneAndUpdate = async (_filter, update) => {
    Object.assign(payment, update.$set);
    return payment;
  };
  mongoose.startSession = async () => ({
    active: false,
    startTransaction() { this.active = true; },
    inTransaction() { return this.active; },
    async commitTransaction() { this.active = false; },
    async abortTransaction() { this.active = false; },
    async endSession() {},
  });
  const req = adminRequest(String(payment._id));
  req.farmModels.AuditLog = class AuditLog {
    constructor(data) { this.data = data; }
    async save() { auditedAction = this.data.action; }
  };
  const response = makeResponse();
  const staffRequest = {
    user: { id: new mongoose.Types.ObjectId().toString(), userType: 'staff', farmId: 'farm-1' },
    farmModels: req.farmModels,
  };

  await checkSubscription(staffRequest, makeResponse(), (error) => assert.ifError(error));

  await paymentController.cancelAdminSubscription(req, response);

  assert.equal(response.statusCode, 200);
  assert.equal(owner.isSubscribed, false);
  assert.equal(owner.subscriptionStatus, 'cancelled');
  assert.equal(owner.subscriptionPlan, 'none');
  assert.equal(payment.status, 'success');
  assert.ok(payment.subscriptionCancelledAt instanceof Date);
  assert.equal(auditedAction, 'ADMIN_DELETE_SUBSCRIPTION');

  let accessError;
  await checkSubscription(staffRequest, makeResponse(), (error) => { accessError = error; });
  assert.equal(accessError.statusCode, 403);
  assert.equal(owner.subscriptionStatus, 'cancelled');
});

test('stale JWT admin claims are replaced by the current database role', async () => {
  const oldSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = 'admin-delete-test-secret';
  const userId = new mongoose.Types.ObjectId().toString();
  const token = jwt.sign({ id: userId, role: 'admin', userType: 'admin' }, process.env.JWT_SECRET, { expiresIn: '5m' });
  authModel.findById = () => ({
    select: async () => ({ _id: userId, role: 'manager', userType: 'manager', farmId: 'farm-1', permissions: [] }),
  });
  const request = { cookies: { token } };
  const response = makeResponse();

  try {
    await authMiddleware(request, response, () => {});
    assert.equal(request.user.role, 'manager');
    assert.equal(request.user.userType, 'manager');
    const authorizationResponse = makeResponse();
    isAdmin(request, authorizationResponse, () => assert.fail('demoted account must not remain admin'));
    assert.equal(authorizationResponse.statusCode, 403);
  } finally {
    if (oldSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = oldSecret;
  }
});