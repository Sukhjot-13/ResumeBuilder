import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ users: new Map(), roles: [] }));
const mocks = vi.hoisted(() => ({ db: vi.fn(), warn: vi.fn(), complete: vi.fn(), roleFind: vi.fn() }));

function query(value) {
  const promise = Promise.resolve(value);
  return { populate: () => query(value), then: (...args) => promise.then(...args) };
}

vi.mock('@/models/User', () => ({ default: {
  findById: id => query(state.users.get(String(id)) ?? null),
} }));
vi.mock('@/models/Role', () => ({ default: {
  find: (...args) => mocks.roleFind(...args),
} }));
vi.mock('@/lib/mongodb', () => ({ default: mocks.db }));
vi.mock('@/lib/logger', () => ({ logger: {
  warn: mocks.warn, error: vi.fn(), info: vi.fn(), debug: vi.fn(),
} }));
vi.mock('@/lib/manager/server', () => ({
  withManagerRequest: (_, handler) => handler(), scheduleManagerFlush: mocks.complete,
}));

import { GET, PUT } from '@/app/api/user/profile/route';
import { invalidateRoleCache } from '@/lib/accessControl';

const ROOT_ID = 'a'.repeat(24);
const USER_ID = 'b'.repeat(24);

beforeEach(() => {
  vi.clearAllMocks();
  invalidateRoleCache();
  state.users.clear();
  state.roles = [{ value: 100, isAdmin: false, permissions: [] }];
  mocks.db.mockResolvedValue(undefined);
  mocks.roleFind.mockImplementation(() => ({ lean: async () => state.roles }));
  for (const [id, role] of [[ROOT_ID, 0], [USER_ID, 100]]) {
    state.users.set(id, {
      _id: id, role, name: 'Profile Test', email: `${role}@example.com`,
      dateOfBirth: '1990-01-01', creditsUsed: 0, mainResume: null,
      otp: 'private-otp', customerId: 'private-customer',
      save: vi.fn(async () => {}),
    });
  }
});

function request(userId, method = 'GET', body, extraHeaders = {}) {
  // x-user-id represents identity inserted by the verified JWT proxy; the
  // live browser verification exercises that proxy instead of this fixture.
  return new Request('http://localhost/api/user/profile', {
    method,
    headers: { ...(userId ? { 'x-user-id': userId } : {}), ...extraHeaders },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

describe('profile routes with real permission resolution', () => {
  it('reads root profile from a partially seeded store without its Admin row', async () => {
    const response = await GET(request(ROOT_ID));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({ id: ROOT_ID, role: 0, name: 'Profile Test', creditsRemaining: null });
    expect(body).not.toHaveProperty('otp');
    expect(body).not.toHaveProperty('customerId');
    expect(mocks.warn).not.toHaveBeenCalled();
    expect(mocks.complete).toHaveBeenCalledTimes(1);
  });

  it('updates root profile without an Admin policy row', async () => {
    const response = await PUT(request(ROOT_ID, 'PUT', { name: 'Updated Profile', dateOfBirth: '1991-02-03' }));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ id: ROOT_ID, name: 'Updated Profile', dateOfBirth: '1991-02-03' });
    expect(state.users.get(ROOT_ID).save).toHaveBeenCalledTimes(1);
    expect(mocks.complete).toHaveBeenCalledTimes(1);
  });

  it('still refuses anonymous reads/writes and role claims without an authenticated identity', async () => {
    expect((await GET(request(undefined, 'GET', undefined, { 'x-user-role': '0' }))).status).toBe(401);
    expect((await PUT(request(undefined, 'PUT', { name: 'Anonymous', role: 0 }))).status).toBe(401);
    expect(state.users.get(ROOT_ID).save).not.toHaveBeenCalled();
  });

  it('uses the account role instead of client role/permission claims', async () => {
    const headers = { 'x-user-role': '0', 'x-user-permissions': 'ALL' };
    const read = await GET(request(USER_ID, 'GET', undefined, headers));
    expect(read.status).toBe(403);
    expect(await read.json()).toMatchObject({ code: 'PERMISSION_DENIED', permission: 'view_own_profile' });
    const write = await PUT(request(USER_ID, 'PUT', { name: 'Not Allowed', role: 0 }, headers));
    expect(write.status).toBe(403);
    expect(state.users.get(USER_ID).name).toBe('Profile Test');
    expect(state.users.get(USER_ID).save).not.toHaveBeenCalled();
  });

  it('does not grant root access to a lower role with isAdmin/ALL policy data', async () => {
    state.roles = [{ value: 100, isAdmin: true, permissions: ['ALL'] }];
    expect((await GET(request(USER_ID))).status).toBe(403);
  });

  it('preserves ordinary profile grants and immediate revocation', async () => {
    state.roles[0].permissions = ['view_own_profile'];
    expect((await GET(request(USER_ID))).status).toBe(200);
    state.roles[0].permissions = [];
    invalidateRoleCache();
    expect((await GET(request(USER_ID))).status).toBe(403);
  });

  it('keeps ordinary roles denied when the policy store fails', async () => {
    mocks.roleFind.mockImplementation(() => { throw new Error('synthetic role store outage'); });
    expect((await GET(request(USER_ID))).status).toBe(403);
    expect((await GET(request(ROOT_ID))).status).toBe(200);
  });

  it('cannot bypass an account database outage through root policy', async () => {
    mocks.db.mockRejectedValue(new Error('synthetic account database outage'));
    const response = await GET(request(ROOT_ID));
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ success: false, error: 'Internal server error' });
  });
});
