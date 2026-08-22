import { describe, it, expect } from 'vitest';
import { resolvePlanKey } from '@/lib/planResolver';

// Regression guard for audit finding C1: checkout must accept both the plan
// KEY ('PRO') and the display name ('Pro'), in any casing, and never resolve
// an unknown plan.
describe('resolvePlanKey', () => {
  it('resolves the PRO key', () => {
    expect(resolvePlanKey('PRO')).toBe('PRO');
  });

  it('resolves the display name "Pro" case-insensitively (C1 regression)', () => {
    expect(resolvePlanKey('Pro')).toBe('PRO');
    expect(resolvePlanKey('pro')).toBe('PRO');
    expect(resolvePlanKey(' Pro ')).toBe('PRO');
  });

  it('resolves the FREE plan by key or name', () => {
    expect(resolvePlanKey('FREE')).toBe('FREE');
    expect(resolvePlanKey('Free')).toBe('FREE');
    expect(resolvePlanKey('free')).toBe('FREE');
  });

  it('returns null for unknown plans', () => {
    expect(resolvePlanKey('ENTERPRISE')).toBe(null);
    expect(resolvePlanKey('')).toBe(null);
    expect(resolvePlanKey(null)).toBe(null);
    expect(resolvePlanKey(undefined)).toBe(null);
    expect(resolvePlanKey(123)).toBe(null);
    expect(resolvePlanKey({ name: 'Pro' })).toBe(null);
  });
});
