import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Regression guards for the 2026-09-28 security audit:
//
//  T1  a DEVELOPER (rank 70) must not be able to rewrite a role's permission
//      set and self-promote to root ADMIN
//  T5  a permission-store outage must FAIL CLOSED (never widen access back to
//      the compile-time constants) and a roles PUT must take effect at once
//  T9a only HS256 JWTs may be verified

process.env.ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || 'test-access-secret';
process.env.REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || 'test-refresh-secret';

const ROLE_DOCS = [
  { value: 0, isAdmin: true, permissions: ['ALL'] },
  {
    value: 70,
    isAdmin: false,
    permissions: [
      'view_users',
      'view_analytics',
      'access_admin_panel',
      'view_all_subscriptions',
      'manage_roles',
      'generate_resume',
    ],
  },
  { value: 99, isAdmin: false, permissions: ['generate_resume', 'view_own_resumes'] },
  { value: 100, isAdmin: false, permissions: ['generate_resume'] },
];

const roleState = { docs: ROLE_DOCS, failWith: null };
const findImpl = vi.fn(() => ({ lean: async () => roleState.docs }));
const dbConnectMock = vi.fn(async () => {});

vi.mock('@/lib/mongodb', () => ({ default: dbConnectMock }));
vi.mock('@/models/Role', () => ({
  default: { find: (...args) => findImpl(...args) },
}));

const {
  hasPermission,
  hasPermissionDB,
  checkPermissionDB,
  invalidateRoleCache,
  isRootAdmin,
  getNonDelegablePermissions,
} = await import('@/lib/accessControl');
const { PERMISSIONS, ROLES } = await import('@/lib/constants');
const {
  evaluateRolePermissionWrite,
  evaluateRankCeiling,
  evaluateRootRoleWrite,
  evaluateSelfChange,
  evaluateUserRoleChange,
} = await import('@/lib/roleAuthorization');
const { verifyToken } = await import('@/lib/utils');
const { verifyTokenEdge } = await import('@/lib/auth-edge');

const ROOT = { _id: 'a'.repeat(24), role: ROLES.ADMIN };
const DEVELOPER = { _id: 'b'.repeat(24), role: ROLES.DEVELOPER };
const SUBSCRIBER = { _id: 'c'.repeat(24), role: ROLES.SUBSCRIBER };

beforeEach(() => {
  vi.clearAllMocks();
  roleState.docs = ROLE_DOCS;
  roleState.failWith = null;
  findImpl.mockImplementation(() => ({ lean: async () => roleState.docs }));
  dbConnectMock.mockImplementation(async () => {});
  invalidateRoleCache();
});

afterEach(() => vi.restoreAllMocks());

describe('T1 delegate permission registry', () => {
  it('exposes delegate_role_management, marked non-delegable and admin-only', () => {
    expect(PERMISSIONS.DELEGATE_ROLE_MANAGEMENT).toBe('delegate_role_management');
    const nonDelegable = getNonDelegablePermissions();
    expect(nonDelegable).toContain(PERMISSIONS.DELEGATE_ROLE_MANAGEMENT);
  });

  it('is granted to root ADMIN only — a DEVELOPER never holds it', async () => {
    expect(await hasPermissionDB(ROLES.ADMIN, PERMISSIONS.DELEGATE_ROLE_MANAGEMENT)).toBe(true);
    expect(await hasPermissionDB(ROLES.DEVELOPER, PERMISSIONS.DELEGATE_ROLE_MANAGEMENT)).toBe(false);
    expect(await hasPermissionDB(ROLES.SUBSCRIBER, PERMISSIONS.DELEGATE_ROLE_MANAGEMENT)).toBe(false);
  });
});

describe('T1 roles PUT authorization', () => {
  it('refuses a DEVELOPER (even with MANAGE_ROLES) — the self-promotion lane', async () => {
    // Positive control: the developer-tier permission is genuinely held.
    expect(await hasPermissionDB(ROLES.DEVELOPER, PERMISSIONS.MANAGE_ROLES)).toBe(true);

    const decision = await evaluateRolePermissionWrite({
      actor: DEVELOPER,
      roleValue: ROLES.DEVELOPER,
      permissions: ['manage_roles', PERMISSIONS.DELEGATE_ROLE_MANAGEMENT, 'ALL'],
    });
    expect(decision.allowed).toBe(false);
    expect(decision.code).toBe('DELEGATION_NOT_PERMITTED');
  });

  it('refuses to write the root ADMIN role (roleValue 0) for everyone', async () => {
    expect(evaluateRootRoleWrite(ROLES.ADMIN).allowed).toBe(false);
    const decision = await evaluateRolePermissionWrite({
      actor: ROOT,
      roleValue: ROLES.ADMIN,
      permissions: ['view_own_profile'],
    });
    expect(decision.allowed).toBe(false);
    expect(decision.code).toBe('ROOT_ROLE_PROTECTED');
  });

  it('refuses granting a permission the caller does not hold (no laundering)', async () => {
    // A non-root caller that holds the delegation permission but NOT
    // MANAGE_USERS must not be able to hand MANAGE_USERS to a lower role.
    roleState.docs = [
      { value: 0, isAdmin: true, permissions: ['ALL'] },
      {
        value: 70,
        isAdmin: false,
        permissions: ['view_users', PERMISSIONS.DELEGATE_ROLE_MANAGEMENT],
      },
    ];
    const decision = await evaluateRolePermissionWrite({
      actor: DEVELOPER,
      roleValue: ROLES.USER,
      permissions: ['manage_users', 'view_own_profile'],
    });
    expect(decision.allowed).toBe(false);
    expect(decision.code).toBe('PERMISSION_CEILING_EXCEEDED');
    expect(decision.deniedPermissions).toContain('manage_users');
  });

  it('never lets the non-delegable delegation permission be assigned', async () => {
    const decision = await evaluateRolePermissionWrite({
      actor: ROOT,
      roleValue: ROLES.DEVELOPER,
      permissions: [PERMISSIONS.DELEGATE_ROLE_MANAGEMENT],
    });
    expect(decision.allowed).toBe(false);
    expect(decision.code).toBe('NON_DELEGABLE_PERMISSION');
  });

  it('blocks the ALL wildcard on any non-root role', async () => {
    const decision = await evaluateRolePermissionWrite({
      actor: ROOT,
      roleValue: ROLES.DEVELOPER,
      permissions: ['ALL'],
    });
    expect(decision.allowed).toBe(false);
    expect(decision.code).toBe('WILDCARD_FORBIDDEN');
  });

  it('rejects malformed permission payloads', async () => {
    expect((await evaluateRolePermissionWrite({ actor: ROOT, roleValue: 70, permissions: 'all' })).code)
      .toBe('INVALID_PERMISSIONS');
    expect((await evaluateRolePermissionWrite({ actor: ROOT, roleValue: 70, permissions: [1, 2] })).code)
      .toBe('INVALID_PERMISSIONS');
    expect((await evaluateRolePermissionWrite({ actor: ROOT, roleValue: 70, permissions: ['view_users', 'view_users'] })).code)
      .toBe('DUPLICATE_PERMISSIONS');
    expect((await evaluateRolePermissionWrite({ actor: ROOT, roleValue: 70, permissions: ['made_up_permission'] })).code)
      .toBe('UNKNOWN_PERMISSION');
  });

  it('root ADMIN succeeds on a normal lower-rank role rewrite', async () => {
    const decision = await evaluateRolePermissionWrite({
      actor: ROOT,
      roleValue: ROLES.DEVELOPER,
      permissions: ['view_users', 'manage_roles', 'view_analytics'],
    });
    expect(decision).toEqual({ allowed: true });
  });
});

describe('T1 rank ceiling', () => {
  it('root ADMIN may manage any rank', () => {
    expect(evaluateRankCeiling(ROOT, ROLES.ADMIN).allowed).toBe(true);
    expect(evaluateRankCeiling(ROOT, ROLES.USER, { newRank: ROLES.SUBSCRIBER }).allowed).toBe(true);
  });

  it('a non-root caller may never manage a higher-authority rank', () => {
    const decision = evaluateRankCeiling(DEVELOPER, ROLES.ADMIN);
    expect(decision.allowed).toBe(false);
    expect(decision.code).toBe('RANK_CEILING_EXCEEDED');
  });

  it('a non-root caller may never assign a rank above their own', () => {
    const decision = evaluateRankCeiling(DEVELOPER, ROLES.USER, { newRank: ROLES.ADMIN });
    expect(decision.allowed).toBe(false);
    expect(decision.code).toBe('RANK_ASSIGNMENT_EXCEEDED');
  });

  it('a non-root caller may still assign a lower-authority rank', () => {
    expect(evaluateRankCeiling(DEVELOPER, ROLES.USER, { newRank: ROLES.SUBSCRIBER }).allowed).toBe(true);
  });

  it('a non-root caller may manage their own rank and below', () => {
    expect(evaluateRankCeiling(DEVELOPER, ROLES.DEVELOPER).allowed).toBe(true);
    expect(evaluateRankCeiling(DEVELOPER, ROLES.USER).allowed).toBe(true);
  });

  it('an unknown or malformed caller rank fails closed', () => {
    expect(evaluateRankCeiling({ role: 'admin' }, ROLES.USER).allowed).toBe(false);
    expect(evaluateRankCeiling(null, ROLES.USER).code).toBe('CALLER_RANK_UNKNOWN');
  });
});

describe('T1 self-escalation guard', () => {
  const adminId = 'd'.repeat(24);

  it('blocks a caller promoting their own account to root ADMIN', () => {
    const decision = evaluateSelfChange({
      actorId: adminId,
      targetId: adminId,
      newRank: ROLES.ADMIN,
      currentRank: ROLES.DEVELOPER,
    });
    expect(decision.allowed).toBe(false);
    expect(decision.code).toBe('SELF_ESCALATION_BLOCKED');
  });

  it('still blocks self-demotion (the pre-existing lockout guard)', () => {
    const decision = evaluateSelfChange({
      actorId: adminId,
      targetId: adminId,
      newRank: ROLES.USER,
      currentRank: ROLES.DEVELOPER,
    });
    expect(decision.allowed).toBe(false);
    expect(decision.code).toBe('SELF_ROLE_CHANGE_BLOCKED');
  });

  it('allows a no-op self write and any change to another account', () => {
    expect(evaluateSelfChange({
      actorId: adminId, targetId: adminId, newRank: ROLES.DEVELOPER, currentRank: ROLES.DEVELOPER,
    }).allowed).toBe(true);
    expect(evaluateSelfChange({
      actorId: adminId, targetId: 'e'.repeat(24), newRank: ROLES.ADMIN, currentRank: ROLES.USER,
    }).allowed).toBe(true);
  });

  it('composes into evaluateUserRoleChange', () => {
    expect(evaluateUserRoleChange({
      actor: DEVELOPER, actorId: adminId, targetId: adminId, newRank: ROLES.ADMIN, currentRank: ROLES.DEVELOPER,
    }).allowed).toBe(false);
    expect(evaluateUserRoleChange({
      actor: ROOT, actorId: adminId, targetId: 'e'.repeat(24), newRank: ROLES.USER, currentRank: ROLES.SUBSCRIBER,
    }).allowed).toBe(true);
  });
});

describe('T5 permission store outage fails closed', () => {
  it('denies a permission the constants grant when the store is unreachable', async () => {
    // Sanity: the compile-time constants DO grant it (the old fallback path).
    expect(hasPermission(ROLES.DEVELOPER, PERMISSIONS.MANAGE_ROLES)).toBe(true);

    dbConnectMock.mockImplementation(async () => {
      throw new Error('mongo unreachable');
    });

    const granted = await hasPermissionDB(ROLES.DEVELOPER, PERMISSIONS.MANAGE_ROLES);
    expect(granted).toBe(false);
  });

  it('keeps root system authority but denies ordinary roles when the store is unreachable', async () => {
    dbConnectMock.mockImplementation(async () => {
      throw new Error('mongo unreachable');
    });
    expect(await hasPermissionDB(ROLES.ADMIN, PERMISSIONS.VIEW_USERS)).toBe(true);
    expect(await hasPermissionDB(ROLES.USER, PERMISSIONS.GENERATE_RESUME)).toBe(false);
  });

  it('denies a revoked permission rather than restoring the constant grant', async () => {
    // First load: permission present.
    expect(await hasPermissionDB(ROLES.DEVELOPER, PERMISSIONS.MANAGE_USERS)).toBe(false);
    roleState.docs = [
      { value: 0, isAdmin: true, permissions: ['ALL'] },
      { value: 70, isAdmin: false, permissions: ['view_users', 'manage_users'] },
    ];
    invalidateRoleCache();
    expect(await hasPermissionDB(ROLES.DEVELOPER, PERMISSIONS.MANAGE_USERS)).toBe(true);

    // Admin revokes it, then the DB goes down. The revoked grant must not come
    // back from the constants.
    roleState.docs = [
      { value: 0, isAdmin: true, permissions: ['ALL'] },
      { value: 70, isAdmin: false, permissions: ['view_users'] },
    ];
    invalidateRoleCache();
    dbConnectMock.mockImplementation(async () => {
      throw new Error('mongo unreachable');
    });
    expect(await hasPermissionDB(ROLES.DEVELOPER, PERMISSIONS.MANAGE_USERS)).toBe(false);
  });

  it('denies a role that is absent from a loaded store (no constant fallback)', async () => {
    roleState.docs = [{ value: 0, isAdmin: true, permissions: ['ALL'] }];
    expect(await hasPermissionDB(ROLES.DEVELOPER, PERMISSIONS.VIEW_USERS)).toBe(false);
  });

  it('denies an unknown/malformed role value', async () => {
    expect(await hasPermissionDB(9999, PERMISSIONS.VIEW_USERS)).toBe(false);
    expect(await hasPermissionDB(undefined, PERMISSIONS.VIEW_USERS)).toBe(false);
    expect(await hasPermissionDB(ROLES.USER, '')).toBe(false);
  });

  it('checkPermissionDB fails closed for a user without a role', async () => {
    expect(await checkPermissionDB(null, PERMISSIONS.VIEW_USERS)).toBe(false);
    expect(await checkPermissionDB({}, PERMISSIONS.VIEW_USERS)).toBe(false);
  });

  it('a new roles PUT is effective immediately (cache invalidation)', async () => {
    expect(await hasPermissionDB(ROLES.DEVELOPER, PERMISSIONS.PARSE_RESUME)).toBe(false);

    // Simulate PUT /api/admin/roles writing a new permission set, then
    // invalidating the cache the way the route does.
    roleState.docs = [
      { value: 0, isAdmin: true, permissions: ['ALL'] },
      { value: 70, isAdmin: false, permissions: ['view_users', 'parse_resume'] },
    ];
    invalidateRoleCache();

    expect(await hasPermissionDB(ROLES.DEVELOPER, PERMISSIONS.PARSE_RESUME)).toBe(true);
  });

  it('serves a verified last-known-good snapshot when the store is briefly down', async () => {
    const timestamp = Date.now();
    expect(await hasPermissionDB(ROLES.DEVELOPER, PERMISSIONS.VIEW_USERS)).toBe(true);
    // Simulate the cache expiring while the DB is unreachable.
    vi.spyOn(Date, 'now').mockReturnValue(timestamp + 61_000);
    dbConnectMock.mockImplementation(async () => {
      throw new Error('mongo unreachable');
    });
    expect(await hasPermissionDB(ROLES.DEVELOPER, PERMISSIONS.VIEW_USERS)).toBe(true);
  });

  it('expires the last-known-good policy rather than preserving stale access indefinitely', async () => {
    const timestamp = Date.now();
    expect(await hasPermissionDB(ROLES.DEVELOPER, PERMISSIONS.VIEW_USERS)).toBe(true);
    vi.spyOn(Date, 'now').mockReturnValue(timestamp + 301_000);
    dbConnectMock.mockRejectedValue(new Error('mongo unreachable'));
    expect(await hasPermissionDB(ROLES.DEVELOPER, PERMISSIONS.VIEW_USERS)).toBe(false);
    expect(await hasPermissionDB(ROLES.ADMIN, PERMISSIONS.VIEW_USERS)).toBe(true);
  });
});

describe('canonical root-admin rule', () => {
  it.each([
    [],
    [{ value: 100, isAdmin: false, permissions: ['view_own_profile'] }],
    [{ value: 0, isAdmin: false, permissions: [] }],
  ])('keeps every registered root permission with incomplete/edited role data: %j', async (docs) => {
    roleState.docs = docs;
    for (const permission of Object.values(PERMISSIONS)) {
      expect(await checkPermissionDB(ROOT, permission)).toBe(true);
      expect(hasPermission(ROLES.ADMIN, permission)).toBe(true);
    }
    expect(findImpl).not.toHaveBeenCalled();
    expect(dbConnectMock).not.toHaveBeenCalled();
  });

  it('cannot manufacture a root role using database flags or wildcards', async () => {
    roleState.docs = [{ value: 70, isAdmin: true, permissions: ['ALL', 'view_own_profile'] }];
    expect(await hasPermissionDB(70, PERMISSIONS.MANAGE_USERS)).toBe(false);
    expect(await hasPermissionDB(70, PERMISSIONS.VIEW_OWN_PROFILE)).toBe(true);
  });

  it.each(['', null, undefined, 'not_registered', 'ALL', 'constructor', '__proto__'])(
    'denies unknown permission %j even for root', async (permission) => {
      expect(await hasPermissionDB(ROLES.ADMIN, permission)).toBe(false);
      expect(hasPermission(ROLES.ADMIN, permission)).toBe(false);
    },
  );

  it.each(['0', null, undefined, -1, NaN, 0.5])('rejects malformed role %j', async (role) => {
    expect(await hasPermissionDB(role, PERMISSIONS.VIEW_OWN_PROFILE)).toBe(false);
    expect(hasPermission(role, PERMISSIONS.VIEW_OWN_PROFILE)).toBe(false);
  });

  it('uses a fresh empty-store bootstrap consistently across repeated checks', async () => {
    roleState.docs = [];
    expect(await hasPermissionDB(ROLES.USER, PERMISSIONS.VIEW_OWN_PROFILE)).toBe(true);
    expect(await hasPermissionDB(ROLES.USER, PERMISSIONS.VIEW_OWN_PROFILE)).toBe(true);
    expect(findImpl).toHaveBeenCalledTimes(1);
  });

  it('does not restore bootstrap defaults from an empty snapshot during an outage', async () => {
    roleState.docs = [];
    const timestamp = Date.now();
    expect(await hasPermissionDB(ROLES.USER, PERMISSIONS.VIEW_OWN_PROFILE)).toBe(true);
    vi.spyOn(Date, 'now').mockReturnValue(timestamp + 61_000);
    dbConnectMock.mockRejectedValue(new Error('mongo unreachable'));
    expect(await hasPermissionDB(ROLES.USER, PERMISSIONS.VIEW_OWN_PROFILE)).toBe(false);
  });

  it('recognises only rank 0', () => {
    expect(isRootAdmin(ROOT)).toBe(true);
    expect(isRootAdmin(DEVELOPER)).toBe(false);
    expect(isRootAdmin(null)).toBe(false);
    expect(isRootAdmin({ role: '0' })).toBe(false);
  });
});

describe('T9a JWT algorithm pinning', () => {
  it('accepts an HS256 token it issued', async () => {
    const token = await makeToken('HS256');
    const payload = await verifyToken(token, 'access');
    expect(payload.userId).toBe('user-1');
  });

  it('rejects an HS384 token signed with the same secret', async () => {
    const token = await makeToken('HS384');
    await expect(verifyToken(token, 'access')).rejects.toThrow();
  });

  it('rejects an HS512 token signed with the same secret', async () => {
    const token = await makeToken('HS512');
    await expect(verifyToken(token, 'access')).rejects.toThrow();
  });

  it('verifyTokenEdge pins the algorithm too', async () => {
    const bad = await makeToken('HS384');
    await expect(verifyTokenEdge(bad, 'access')).rejects.toThrow();
  });
});

async function makeToken(alg) {
  const { SignJWT } = await import('jose');
  const secret = new TextEncoder().encode(process.env.ACCESS_TOKEN_SECRET);
  return new SignJWT({ type: 'access', userId: 'user-1', role: 100 })
    .setProtectedHeader({ alg })
    .setExpirationTime('5m')
    .sign(secret);
}
