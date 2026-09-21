import { describe, it, expect } from 'vitest';
import { resolveRotationLifetime } from '@/lib/utils';
import { TOKEN_CONFIG } from '@/lib/constants';

// Regression guard for remember-me: rotation must carry a longer
// (remember-device) lifetime forward instead of shrinking it to 15 days,
// and standard sessions must keep the default 15-day window.
describe('resolveRotationLifetime', () => {
  const now = Date.now();

  it('keeps the standard 15-day window for normal sessions', () => {
    const result = resolveRotationLifetime(new Date(now + 10 * 24 * 60 * 60 * 1000), now);
    expect(result.maxAgeSeconds).toBe(TOKEN_CONFIG.REFRESH_TOKEN_EXPIRY_MS / 1000);
    expect(result.jwtExp).toBe('15d');
  });

  it('preserves the remaining lifetime of a 30-day remember-me token', () => {
    const remainingMs = 29 * 24 * 60 * 60 * 1000;
    const result = resolveRotationLifetime(new Date(now + remainingMs), now);
    expect(result.maxAgeSeconds).toBe(Math.floor(remainingMs / 1000));
    expect(result.jwtExp).toBe(`${Math.floor(remainingMs / 1000)}s`);
    expect(result.expiresAt.getTime()).toBe(now + remainingMs);
  });

  it('falls back to 15 days for expired tokens', () => {
    const result = resolveRotationLifetime(new Date(now - 1000), now);
    expect(result.maxAgeSeconds).toBe(TOKEN_CONFIG.REFRESH_TOKEN_EXPIRY_MS / 1000);
    expect(result.jwtExp).toBe('15d');
  });
});
