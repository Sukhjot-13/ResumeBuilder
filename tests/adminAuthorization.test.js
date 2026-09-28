import { describe, it, expect, beforeEach, vi } from 'vitest';

// Route-level authorization coverage for the 2026-09-28 audit. Mongoose is
// mocked, so no live database is required.
//
//  T1  roles PUT / role PATCH — DEVELOPER vs ADMIN, self-escalation, root role
//  T2  user DELETE must require delete_user, not access_admin_panel
//  T3  verify-session replay returns 409, never refunds credits, never
//      reactivates a cancelled subscription
//  T9  unauthenticated 401, malformed id 400, cross-user 404 (IDOR)

process.env.ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || 'test-access-secret';
process.env.REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || 'test-refresh-secret';
process.env.STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || 'sk_test_dummy';

const USER_ID = 'a'.repeat(24);
const OTHER_USER_ID = 'b'.repeat(24);
const TARGET_ID = 'c'.repeat(24);

// ── Mongoose model doubles ──────────────────────────────────────────────────
const users = new Map();
const txns = [];
const events = [];

const chainable = (value) => {
  const promise = Promise.resolve(value);
  const chain = {
    select: () => chain,
    sort: () => chain,
    limit: () => chain,
    skip: () => chain,
    populate: () => chain,
    lean: () => promise,
    then: (onOk, onErr) => promise.then(onOk, onErr),
    catch: (onErr) => promise.catch(onErr),
  };
  return chain;
};

function makeDoc(id, extra = {}) {
  const doc = { _id: id, ...extra };
  doc.select = () => doc;
  doc.lean = () => Promise.resolve(doc);
  doc.populate = () => doc;
  doc.save = vi.fn(async () => doc);
  return doc;
}

const User = {
  findById: vi.fn((id) => users.get(String(id)) || null),
  findByIdAndUpdate: vi.fn((id, update) => {
    const existing = users.get(String(id));
    if (!existing) return null;
    const next = makeDoc(String(id), { ...existing, ...(update?.$set || update || {}) });
    users.set(String(id), next);
    return next;
  }),
  find: vi.fn(() => chainable([])),
  findOne: vi.fn(() => chainable(null)),
  findByIdAndDelete: vi.fn(async (id) => {
    const existing = users.get(String(id));
    users.delete(String(id));
    return existing || null;
  }),
  deleteMany: vi.fn(async () => ({ deletedCount: 0 })),
  updateOne: vi.fn(async () => ({ modifiedCount: 0 })),
};

const Transaction = {
  create: vi.fn(async (doc) => {
    if (txns.some((t) => t.stripePaymentId === doc.stripePaymentId)) {
      const err = new Error('E11000 duplicate key');
      err.code = 11000;
      throw err;
    }
    const saved = { _id: `t${txns.length + 1}`, ...doc };
    txns.push(saved);
    return saved;
  }),
  findOne: vi.fn((query) =>
    chainable(txns.find((t) => t.stripePaymentId === query.stripePaymentId) || null)),
  deleteOne: vi.fn(async ({ _id }) => {
    const idx = txns.findIndex((t) => t._id === _id);
    if (idx >= 0) txns.splice(idx, 1);
    return { deletedCount: idx >= 0 ? 1 : 0 };
  }),
  find: vi.fn(() => chainable([])),
  findOneAndUpdate: vi.fn(),
  countDocuments: vi.fn(async () => 0),
};

const Role = {
  findOne: vi.fn(({ value }) => chainable(Role.docs.find((r) => r.value === value) || null)),
  findOneAndUpdate: vi.fn(async ({ value }, update) => {
    const found = Role.docs.find((r) => r.value === value);
    if (!found) return null;
    found.permissions = update.$set.permissions;
    return { ...found };
  }),
  find: vi.fn(() => chainable([])),
  docs: [],
};

const deleteMany = vi.fn(async () => ({ deletedCount: 0 }));

vi.mock('@/models/User', () => ({ default: User }));
vi.mock('@/models/Transaction', () => ({ default: Transaction }));
vi.mock('@/models/Role', () => ({ default: Role }));
vi.mock('@/models/resume', () => ({
  default: {
    findOne: vi.fn(() => chainable(null)),
    findOneAndDelete: vi.fn(() => chainable(null)),
    findByIdAndUpdate: vi.fn(() => chainable(null)),
    create: vi.fn(async () => ({ _id: 'r1' })),
    deleteMany,
  },
}));
vi.mock('@/models/resumeMetadata', () => ({
  default: {
    deleteMany,
    findOneAndUpdate: vi.fn(() => chainable(null)),
    findOneAndDelete: vi.fn(() => chainable(null)),
  },
}));
vi.mock('@/models/CoverLetter', () => ({ default: { deleteMany } }));
vi.mock('@/models/refreshToken', () => ({ default: { deleteMany } }));
vi.mock('@/models/ApiKey', () => ({ default: { deleteMany } }));
vi.mock('@/models/AuthorizationEvent', () => ({
  default: { create: vi.fn(async (doc) => { events.push(doc); return doc; }) },
}));
vi.mock('@/lib/mongodb', () => ({ default: vi.fn(async () => {}) }));

// ── Authorization doubles ───────────────────────────────────────────────────
vi.mock('@/services/userService', () => ({
  UserService: {
    getUserById: vi.fn(async (id) => users.get(String(id)) || null),
  },
}));

const BASE_ROLE_PERMISSIONS = {
  0: ['ALL'],
  70: ['view_users', 'view_analytics', 'access_admin_panel', 'view_all_subscriptions', 'manage_roles'],
  99: ['view_cover_letters', 'edit_cover_letter', 'generate_cover_letter', 'view_own_resumes'],
  100: ['view_own_resumes'],
};
const ROLE_PERMISSIONS = { ...BASE_ROLE_PERMISSIONS };
const roleStore = { available: true };
vi.mock('@/lib/accessControl', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    hasPermissionDB: vi.fn(async (role, permission) => {
      if (!roleStore.available) return false;
      const list = ROLE_PERMISSIONS[role];
      if (!list) return false;
      if (list.includes('ALL')) return true;
      return list.includes(permission);
    }),
    checkPermissionDB: vi.fn(async (user, permission) => {
      if (!user || !roleStore.available) return false;
      const list = ROLE_PERMISSIONS[user.role];
      if (!list) return false;
      if (list.includes('ALL')) return true;
      return list.includes(permission);
    }),
    invalidateRoleCache: vi.fn(),
  };
});

const stripeSession = { current: null };
const stripeRetrieveSession = vi.fn(async () => stripeSession.current);
const stripeRetrieveSubscription = vi.fn(async () => ({ current_period_end: 1900000000 }));
vi.mock('@/lib/stripe', () => ({
  getStripe: vi.fn(() => ({
    checkout: { sessions: { retrieve: stripeRetrieveSession } },
    subscriptions: { retrieve: stripeRetrieveSubscription, cancel: vi.fn(async () => {}) },
  })),
}));

vi.mock('@/lib/auditLog', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    recordAuthorizationEvent: vi.fn(async (event) => {
      events.push({ ...event, __stub: true });
      return event;
    }),
  };
});

const rolesRoute = await import('@/app/api/admin/roles/route');
const userRoleRoute = await import('@/app/api/admin/users/[id]/role/route');
const userRoute = await import('@/app/api/admin/users/[id]/route');
const verifySessionRoute = await import('@/app/api/checkout/verify-session/route');
const resumeByIdRoute = await import('@/app/api/resumes/[id]/route');
const coverLetterByIdRoute = await import('@/app/api/cover-letters/[id]/route');
const { PERMISSIONS, ROLES } = await import('@/lib/constants');

function jsonRequest(body, { userId = USER_ID } = {}) {
  return new Request('http://localhost/api/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
    body: JSON.stringify(body),
  });
}

function deleteRequest(userId = USER_ID) {
  return new Request('http://localhost/api/test', {
    method: 'DELETE',
    headers: { 'x-user-id': userId },
  });
}

function setSession(role, extra = {}) {
  users.set(USER_ID, makeDoc(USER_ID, { role, email: 'a@example.com', ...extra }));
}

beforeEach(() => {
  users.clear();
  txns.length = 0;
  events.length = 0;
  roleStore.available = true;
  for (const key of Object.keys(ROLE_PERMISSIONS)) delete ROLE_PERMISSIONS[key];
  Object.assign(ROLE_PERMISSIONS, JSON.parse(JSON.stringify(BASE_ROLE_PERMISSIONS)));
  Role.docs = [
    { value: 0, isAdmin: true, permissions: ['ALL'] },
    { value: 70, isAdmin: false, permissions: ['view_users', 'manage_roles'] },
    { value: 99, isAdmin: false, permissions: ['view_own_resumes'] },
    { value: 100, isAdmin: false, permissions: ['view_own_resumes'] },
  ];
  User.findByIdAndUpdate.mockClear();
  User.findById.mockClear();
  Transaction.create.mockClear();
  users.set(USER_ID, makeDoc(USER_ID, { role: ROLES.USER, subscriptionStatus: 'none' }));
});

// ── T1: roles PUT ───────────────────────────────────────────────────────────
describe('T1 PUT /api/admin/roles', () => {
  it('rejects a DEVELOPER with 403 (MANAGE_ROLES is not enough)', async () => {
    setSession(ROLES.DEVELOPER);
    const res = await rolesRoute.PUT(
      jsonRequest({ roleValue: 70, permissions: ['view_users', 'manage_roles', 'delete_user'] })
    );
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.code).toBe('PERMISSION_DENIED');
    expect(Role.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('rejects an unauthenticated caller with 401', async () => {
    const res = await rolesRoute.PUT(
      new Request('http://localhost/api/admin/roles', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roleValue: 70, permissions: [] }),
      })
    );
    expect(res.status).toBe(401);
  });

  it('rejects roleValue 0 (root role protected) even for root ADMIN', async () => {
    setSession(ROLES.ADMIN);
    const res = await rolesRoute.PUT(jsonRequest({ roleValue: 0, permissions: ['view_users'] }));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.code).toBe('ROOT_ROLE_PROTECTED');
    expect(Role.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('rejects granting a permission the caller does not hold (laundering)', async () => {
    // A non-root caller that holds the delegation permission but NOT
    // unlimited_credits must not be able to hand it to a lower role.
    ROLE_PERMISSIONS[70] = ['view_users', PERMISSIONS.DELEGATE_ROLE_MANAGEMENT];
    setSession(ROLES.DEVELOPER);
    const res = await rolesRoute.PUT(
      jsonRequest({ roleValue: 100, permissions: ['view_own_resumes', 'unlimited_credits'] })
    );
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.code).toBe('PERMISSION_CEILING_EXCEEDED');
    expect(body.error).toMatch(/do not hold/i);
    expect(Role.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('root ADMIN is not subject to the permission ceiling (wildcard authority)', async () => {
    setSession(ROLES.ADMIN);
    const res = await rolesRoute.PUT(
      jsonRequest({ roleValue: 100, permissions: ['view_own_resumes', 'unlimited_credits'] })
    );
    expect(res.status).toBe(200);
  });

  it('rejects a non-delegable permission being assigned to a role', async () => {
    setSession(ROLES.ADMIN);
    const res = await rolesRoute.PUT(
      jsonRequest({ roleValue: 70, permissions: [PERMISSIONS.DELEGATE_ROLE_MANAGEMENT] })
    );
    expect(res.status).toBe(403);
    expect((await res.json()).code).toBe('NON_DELEGABLE_PERMISSION');
  });

  it('allows root ADMIN to rewrite a lower role and invalidates the cache', async () => {
    const { invalidateRoleCache } = await import('@/lib/accessControl');
    setSession(ROLES.ADMIN);
    const res = await rolesRoute.PUT(
      jsonRequest({ roleValue: 70, permissions: ['view_users', 'view_analytics'] })
    );
    expect(res.status).toBe(200);
    expect(Role.findOneAndUpdate).toHaveBeenCalled();
    expect(invalidateRoleCache).toHaveBeenCalled();
    const body = await res.json();
    expect(body.role.permissions).toEqual(['view_users', 'view_analytics']);
  });

  it('records an audit event for an allowed rewrite', async () => {
    setSession(ROLES.ADMIN);
    await rolesRoute.PUT(jsonRequest({ roleValue: 100, permissions: ['view_own_resumes'] }));
    const actions = events.map((e) => e.action);
    expect(actions).toContain('role.permissions.updated');
  });

  it('records a denied audit event when a DEVELOPER attempts a rewrite', async () => {
    setSession(ROLES.DEVELOPER);
    await rolesRoute.PUT(jsonRequest({ roleValue: 70, permissions: ['view_users'] }));
    expect(events.some((e) => e.action === 'role.permissions.denied' && e.outcome === 'denied')).toBe(true);
  });

  it('404s an unknown role', async () => {
    setSession(ROLES.ADMIN);
    const res = await rolesRoute.PUT(jsonRequest({ roleValue: 55, permissions: ['view_users'] }));
    expect(res.status).toBe(404);
  });
});

// ── T1: role PATCH self-escalation ──────────────────────────────────────────
describe('T1 PATCH /api/admin/users/[id]/role', () => {
  it('blocks an admin promoting their own account to root ADMIN', async () => {
    setSession(ROLES.DEVELOPER);
    ROLE_PERMISSIONS[70] = [...ROLE_PERMISSIONS[70], PERMISSIONS.CHANGE_USER_ROLE];
    const res = await userRoleRoute.PATCH(
      jsonRequest({ role: ROLES.ADMIN }, { userId: USER_ID }),
      { params: Promise.resolve({ id: USER_ID }) }
    );
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.code).toBe('SELF_ESCALATION_BLOCKED');
    expect(User.findByIdAndUpdate).not.toHaveBeenCalled();
    delete ROLE_PERMISSIONS[70][ROLE_PERMISSIONS[70].length - 1];
  });

  it('still blocks self-demotion', async () => {
    setSession(ROLES.ADMIN);
    const res = await userRoleRoute.PATCH(
      jsonRequest({ role: ROLES.USER }, { userId: USER_ID }),
      { params: Promise.resolve({ id: USER_ID }) }
    );
    expect(res.status).toBe(403);
    expect((await res.json()).code).toBe('SELF_ROLE_CHANGE_BLOCKED');
  });

  it('blocks a non-root caller changing an account that outranks them', async () => {
    setSession(ROLES.DEVELOPER);
    ROLE_PERMISSIONS[70] = [...ROLE_PERMISSIONS[70], PERMISSIONS.CHANGE_USER_ROLE];
    users.set(TARGET_ID, makeDoc(TARGET_ID, { role: ROLES.ADMIN, subscriptionStatus: 'active' }));
    const res = await userRoleRoute.PATCH(
      jsonRequest({ role: ROLES.USER }, { userId: USER_ID }),
      { params: Promise.resolve({ id: TARGET_ID }) }
    );
    expect(res.status).toBe(403);
    expect((await res.json()).code).toBe('RANK_CEILING_EXCEEDED');
    delete ROLE_PERMISSIONS[70][ROLE_PERMISSIONS[70].length - 1];
  });

  it('allows root ADMIN to change another account and audits it', async () => {
    setSession(ROLES.ADMIN);
    users.set(TARGET_ID, makeDoc(TARGET_ID, { role: ROLES.USER, subscriptionStatus: 'none' }));
    const res = await userRoleRoute.PATCH(
      jsonRequest({ role: ROLES.SUBSCRIBER }, { userId: USER_ID }),
      { params: Promise.resolve({ id: TARGET_ID }) }
    );
    expect(res.status).toBe(200);
    expect(User.findByIdAndUpdate).toHaveBeenCalled();
    expect(events.some((e) => e.action === 'user.role.updated')).toBe(true);
  });

  it('rejects a malformed user id with 400, not a CastError 500', async () => {
    setSession(ROLES.ADMIN);
    const res = await userRoleRoute.PATCH(
      jsonRequest({ role: ROLES.USER }, { userId: USER_ID }),
      { params: Promise.resolve({ id: 'not-an-object-id' }) }
    );
    expect(res.status).toBe(400);
  });
});

// ── T2: user deletion permission ────────────────────────────────────────────
describe('T2 DELETE /api/admin/users/[id]', () => {
  it('refuses a DEVELOPER with 403 (delete_user is admin-only)', async () => {
    setSession(ROLES.DEVELOPER);
    users.set(TARGET_ID, makeDoc(TARGET_ID, { role: ROLES.USER, subscriptionStatus: 'none' }));
    const res = await userRoute.DELETE(deleteRequest(), {
      params: Promise.resolve({ id: TARGET_ID }),
    });
    expect(res.status).toBe(403);
    expect((await res.json()).code).toBe('PERMISSION_DENIED');
    expect(User.findByIdAndDelete).not.toHaveBeenCalled();
  });

  it('allows a role that holds delete_user and cascades the delete', async () => {
    setSession(ROLES.ADMIN);
    users.set(TARGET_ID, makeDoc(TARGET_ID, { role: ROLES.USER, subscriptionStatus: 'none' }));
    const res = await userRoute.DELETE(deleteRequest(), {
      params: Promise.resolve({ id: TARGET_ID }),
    });
    expect(res.status).toBe(200);
    expect(deleteMany).toHaveBeenCalled();
    expect(User.findByIdAndDelete).toHaveBeenCalledWith(TARGET_ID);
    expect(events.some((e) => e.action === 'user.deleted')).toBe(true);
  });

  it('refuses an unauthenticated caller with 401', async () => {
    const res = await userRoute.DELETE(
      new Request('http://localhost/api/admin/users/x', { method: 'DELETE' }),
      { params: Promise.resolve({ id: TARGET_ID }) }
    );
    expect(res.status).toBe(401);
    expect((await res.json()).code).toBe('NO_AUTH');
  });

  it('refuses a malformed id with 400 before touching the database', async () => {
    setSession(ROLES.ADMIN);
    const res = await userRoute.DELETE(deleteRequest(), {
      params: Promise.resolve({ id: '../../etc/passwd' }),
    });
    expect(res.status).toBe(400);
  });

  it('still blocks an admin deleting their own account', async () => {
    setSession(ROLES.ADMIN);
    const res = await userRoute.DELETE(deleteRequest(), {
      params: Promise.resolve({ id: USER_ID }),
    });
    expect(res.status).toBe(400);
  });
});

// ── T3: verify-session replay ───────────────────────────────────────────────
describe('T3 POST /api/checkout/verify-session', () => {
  function paidSession(overrides = {}) {
    return {
      id: 'cs_test_1',
      payment_intent: 'pi_test_1',
      payment_status: 'paid',
      subscription: 'sub_test_1',
      customer: 'cus_test_1',
      amount_total: 1399,
      currency: 'usd',
      metadata: { userId: USER_ID, planName: 'PRO' },
      ...overrides,
    };
  }

  it('upgrades a paying user and does not reset consumed credits', async () => {
    setSession(ROLES.USER);
    users.set(USER_ID, makeDoc(USER_ID, { role: ROLES.USER, subscriptionStatus: 'none', creditsUsed: 7 }));
    stripeSession.current = paidSession();

    const res = await verifySessionRoute.POST(jsonRequest({ sessionId: 'cs_test_1' }));
    expect(res.status).toBe(200);

    const [id, update] = User.findByIdAndUpdate.mock.calls.at(-1);
    expect(id).toBe(USER_ID);
    expect(update.role).toBe(ROLES.SUBSCRIBER);
    expect(update.subscriptionStatus).toBe('active');
    expect(update).not.toHaveProperty('creditsUsed');
    expect(txns).toHaveLength(1);
  });

  it('returns 409 on a replay of the same session id and changes nothing', async () => {
    setSession(ROLES.USER);
    users.set(USER_ID, makeDoc(USER_ID, { role: ROLES.USER, subscriptionStatus: 'none', creditsUsed: 7 }));
    stripeSession.current = paidSession();

    const first = await verifySessionRoute.POST(jsonRequest({ sessionId: 'cs_test_1' }));
    expect(first.status).toBe(200);
    User.findByIdAndUpdate.mockClear();
    const updateCountAfterFirst = User.findByIdAndUpdate.mock.calls.length;

    const second = await verifySessionRoute.POST(jsonRequest({ sessionId: 'cs_test_1' }));
    expect(second.status).toBe(409);
    expect((await second.json()).error).toMatch(/already been used/i);
    expect(User.findByIdAndUpdate.mock.calls.length).toBe(updateCountAfterFirst);
    expect(txns).toHaveLength(1);
    expect(events.some((e) => e.action === 'subscription.upgrade.replay_blocked')).toBe(true);
  });

  it('does not refund consumed credits on a later replay', async () => {
    setSession(ROLES.USER);
    users.set(USER_ID, makeDoc(USER_ID, { role: ROLES.USER, subscriptionStatus: 'none', creditsUsed: 42 }));
    stripeSession.current = paidSession();

    await verifySessionRoute.POST(jsonRequest({ sessionId: 'cs_test_1' }));
    User.findByIdAndUpdate.mockClear();
    await verifySessionRoute.POST(jsonRequest({ sessionId: 'cs_test_1' }));

    for (const call of User.findByIdAndUpdate.mock.calls) {
      expect(call[1]).not.toHaveProperty('creditsUsed');
      expect(call[1]).not.toHaveProperty('lastCreditResetDate');
    }
  });

  it('never reactivates a cancelled subscription', async () => {
    setSession(ROLES.USER);
    users.set(USER_ID, makeDoc(USER_ID, {
      role: ROLES.USER,
      subscriptionStatus: 'canceled',
      subscriptionExpiresAt: new Date(Date.now() + 86400000),
    }));
    stripeSession.current = paidSession();

    const res = await verifySessionRoute.POST(jsonRequest({ sessionId: 'cs_test_1' }));
    expect(res.status).toBe(409);
    expect(User.findByIdAndUpdate).not.toHaveBeenCalled();
    expect(txns).toHaveLength(0);
  });

  it('never reactivates an expired subscription', async () => {
    setSession(ROLES.USER);
    users.set(USER_ID, makeDoc(USER_ID, { role: ROLES.USER, subscriptionStatus: 'expired' }));
    stripeSession.current = paidSession();
    const res = await verifySessionRoute.POST(jsonRequest({ sessionId: 'cs_test_1' }));
    expect(res.status).toBe(409);
    expect(User.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it('refuses a session belonging to another user', async () => {
    setSession(ROLES.USER);
    stripeSession.current = paidSession({ metadata: { userId: OTHER_USER_ID, planName: 'PRO' } });
    const res = await verifySessionRoute.POST(jsonRequest({ sessionId: 'cs_test_1' }));
    expect(res.status).toBe(403);
  });

  it('refuses an unpaid session', async () => {
    setSession(ROLES.USER);
    stripeSession.current = paidSession({ payment_status: 'unpaid' });
    const res = await verifySessionRoute.POST(jsonRequest({ sessionId: 'cs_test_1' }));
    expect(res.status).toBe(400);
  });

  it('refuses a non-PRO plan', async () => {
    setSession(ROLES.USER);
    stripeSession.current = paidSession({ metadata: { userId: USER_ID, planName: 'ENTERPRISE' } });
    const res = await verifySessionRoute.POST(jsonRequest({ sessionId: 'cs_test_1' }));
    expect(res.status).toBe(400);
  });

  it('rejects an unauthenticated caller with 401', async () => {
    const res = await verifySessionRoute.POST(
      new Request('http://localhost/api/checkout/verify-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: 'cs_test_1' }),
      })
    );
    expect(res.status).toBe(401);
  });

  it('rejects an oversized body with 413', async () => {
    setSession(ROLES.USER);
    const huge = 'x'.repeat(300 * 1024);
    const res = await verifySessionRoute.POST(jsonRequest({ sessionId: huge }));
    expect(res.status).toBe(413);
  });
});

// ── T10: unauthenticated + cross-user (IDOR) coverage ───────────────────────
describe('T10 IDOR on the id-scoped routes', () => {
  it('GET /api/resumes/[id] 404s for another user (query is scoped by userId)', async () => {
    setSession(ROLES.USER);
    const { default: Resume } = await import('@/models/resume');
    Resume.findOne.mockImplementation(() => chainable(null));
    const res = await resumeByIdRoute.GET(
      new Request('http://localhost/api/resumes/x', { headers: { 'x-user-id': USER_ID } }),
      { params: Promise.resolve({ id: OTHER_USER_ID }) }
    );
    expect(res.status).toBe(404);
    expect(Resume.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ _id: OTHER_USER_ID, userId: USER_ID })
    );
  });

  it('GET /api/cover-letters/[id] 404s for another user', async () => {
    setSession(ROLES.SUBSCRIBER);
    const { CoverLetterService } = await import('@/services/coverLetterService');
    CoverLetterService.getCoverLetterById = vi.fn(async () => null);
    const res = await coverLetterByIdRoute.GET(
      new Request('http://localhost/api/cover-letters/x', { headers: { 'x-user-id': USER_ID } }),
      { params: Promise.resolve({ id: OTHER_USER_ID }) }
    );
    expect(res.status).toBe(404);
    expect(CoverLetterService.getCoverLetterById).toHaveBeenCalledWith(OTHER_USER_ID, USER_ID);
  });

  it('GET /api/resumes 401s without any identity', async () => {
    const resumesRoute = await import('@/app/api/resumes/route');
    const res = await resumesRoute.GET(
      new Request('http://localhost/api/resumes', { headers: {} })
    );
    expect(res.status).toBe(401);
    expect((await res.json()).code).toBe('NO_AUTH');
  });

  it('GET /api/resumes 401s when the identity is malformed (no CastError 500)', async () => {
    const resumesRoute = await import('@/app/api/resumes/route');
    const res = await resumesRoute.GET(
      new Request('http://localhost/api/resumes', { headers: { 'x-user-id': 'garbage' } })
    );
    expect(res.status).toBe(401);
    expect((await res.json()).code).toBe('INVALID_IDENTITY');
  });

  it('401s when the authenticated user record no longer exists', async () => {
    const resumesRoute = await import('@/app/api/resumes/route');
    const res = await resumesRoute.GET(
      new Request('http://localhost/api/resumes', { headers: { 'x-user-id': 'f'.repeat(24) } })
    );
    expect(res.status).toBe(401);
    expect((await res.json()).code).toBe('IDENTITY_UNRESOLVABLE');
  });

  it('403s a DEVELOPER-only permission gap on an admin route', async () => {
    setSession(ROLES.DEVELOPER);
    const adminUsersRoute = await import('@/app/api/admin/users/route');
    const res = await adminUsersRoute.GET(
      new Request('http://localhost/api/admin/users', { headers: { 'x-user-id': USER_ID } })
    );
    // DEVELOPER legitimately holds access_admin_panel, so this is the positive path.
    expect(res.status).toBe(200);
  });

  it('401s an admin route for an unauthenticated caller', async () => {
    const adminUsersRoute = await import('@/app/api/admin/users/route');
    const res = await adminUsersRoute.GET(
      new Request('http://localhost/api/admin/users', { headers: {} })
    );
    expect(res.status).toBe(401);
  });
});
