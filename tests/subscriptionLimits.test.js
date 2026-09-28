import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// T4 — expired subscribers must not keep Pro limits. getLimit() previously
// trusted role + status alone, so a lapsed subscriber kept 200 monthly
// credits whenever the periodic downgrade job had not run yet.

const checkPermissionDB = vi.fn(async () => false);
vi.mock('@/lib/accessControl', () => ({ checkPermissionDB }));
vi.mock('@/models/User', () => ({ default: {} }));

const { SubscriptionService } = await import('@/services/subscriptionService');
const { isSubscriptionActive } = await import('@/lib/subscriptionChecker');
const { PLANS, ROLES } = await import('@/lib/constants');

const DAY = 24 * 60 * 60 * 1000;

beforeEach(() => {
  checkPermissionDB.mockResolvedValue(false);
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-09-28T12:00:00.000Z'));
});

afterEach(() => {
  vi.useRealTimers();
});

describe('T4 SubscriptionService.getLimit', () => {
  it('grants Pro credits to an active, unexpired subscriber', async () => {
    const user = {
      role: ROLES.SUBSCRIBER,
      subscriptionStatus: 'active',
      subscriptionExpiresAt: new Date(Date.now() + 10 * DAY),
    };
    expect(await SubscriptionService.getLimit(user)).toBe(PLANS.PRO.credits);
  });

  it('gives free limits to an active but EXPIRED subscriber (audit regression)', async () => {
    const user = {
      role: ROLES.SUBSCRIBER,
      subscriptionStatus: 'active',
      subscriptionExpiresAt: new Date(Date.now() - 1000),
      subscriptionId: 'sub_stale',
    };
    expect(await SubscriptionService.getLimit(user)).toBe(PLANS.FREE.credits);
  });

  it('treats the exact expiry instant as expired (boundary)', async () => {
    const user = {
      role: ROLES.SUBSCRIBER,
      subscriptionStatus: 'active',
      subscriptionExpiresAt: new Date(Date.now()),
    };
    expect(await SubscriptionService.getLimit(user)).toBe(PLANS.FREE.credits);
  });

  it('is expired one millisecond before and live one millisecond after the boundary', async () => {
    const base = {
      role: ROLES.SUBSCRIBER,
      subscriptionStatus: 'active',
      subscriptionExpiresAt: new Date(Date.now()),
    };
    expect(await SubscriptionService.getLimit(base)).toBe(PLANS.FREE.credits);
    expect(await SubscriptionService.getLimit({ ...base, subscriptionExpiresAt: new Date(Date.now() + 1) }))
      .toBe(PLANS.PRO.credits);
  });

  it('gives free limits when the status is not active', async () => {
    for (const status of ['canceled', 'expired', 'past_due', 'unpaid', 'none', undefined]) {
      const user = {
        role: ROLES.SUBSCRIBER,
        subscriptionStatus: status,
        subscriptionExpiresAt: new Date(Date.now() + 30 * DAY),
      };
      expect(await SubscriptionService.getLimit(user)).toBe(PLANS.FREE.credits);
    }
  });

  it('gives free limits when a subscriber has no expiry recorded', async () => {
    const user = { role: ROLES.SUBSCRIBER, subscriptionStatus: 'active' };
    expect(await SubscriptionService.getLimit(user)).toBe(PLANS.FREE.credits);
  });

  it('never grants Pro to a non-subscriber role', async () => {
    const user = {
      role: ROLES.USER,
      subscriptionStatus: 'active',
      subscriptionExpiresAt: new Date(Date.now() + 30 * DAY),
    };
    expect(await SubscriptionService.getLimit(user)).toBe(PLANS.FREE.credits);
  });

  it('still honours unlimited_credits ahead of the subscription checks', async () => {
    checkPermissionDB.mockResolvedValue(true);
    const user = { role: ROLES.USER, subscriptionStatus: 'none' };
    expect(await SubscriptionService.getLimit(user)).toBe(Infinity);
  });

  it('still resolves the normal path when the permission store is unavailable', async () => {
    // hasPermissionDB fails closed (returns false) when the store cannot be
    // read, so getLimit must still answer from subscription state alone.
    checkPermissionDB.mockResolvedValue(false);
    const lapsed = {
      role: ROLES.SUBSCRIBER,
      subscriptionStatus: 'active',
      subscriptionExpiresAt: new Date(Date.now() - DAY),
    };
    expect(await SubscriptionService.getLimit(lapsed)).toBe(PLANS.FREE.credits);
  });
});

describe('T4 isSubscriptionActive is no longer dead code', () => {
  it('agrees with getLimit on every boundary case', () => {
    expect(isSubscriptionActive({
      subscriptionStatus: 'active',
      subscriptionExpiresAt: new Date(Date.now() + DAY),
    })).toBe(true);
    expect(isSubscriptionActive({
      subscriptionStatus: 'active',
      subscriptionExpiresAt: new Date(Date.now() - 1),
    })).toBe(false);
    expect(isSubscriptionActive({ subscriptionStatus: 'active' })).toBe(false);
    expect(isSubscriptionActive(null)).toBe(false);
  });
});
