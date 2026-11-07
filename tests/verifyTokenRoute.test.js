import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  rotate: vi.fn(),
  warn: vi.fn(),
  complete: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({ rotateRefreshToken: mocks.rotate }));
vi.mock('@/lib/logger', () => ({ logger: { warn: mocks.warn, info: vi.fn(), error: vi.fn(), debug: vi.fn() } }));
vi.mock('@/lib/manager/server', () => ({
  withManagerRequest: (_, handler) => handler(),
  scheduleManagerFlush: mocks.complete,
}));

import { POST } from '@/app/api/auth/verify-token/route';

function request(body = { refreshToken: 'refresh-token' }) {
  return new Request('http://localhost/api/auth/verify-token', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('POST /api/auth/verify-token', () => {
  it('returns 401 instead of a 500 when a revoked or unknown refresh token is presented', async () => {
    mocks.rotate.mockRejectedValue(new Error('Invalid refresh token'));

    const response = await POST(request());

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: 'Invalid or expired refresh token',
    });
    expect(mocks.warn).toHaveBeenCalledWith(
      'Refresh token rotation rejected',
      expect.objectContaining({ reason: 'Invalid refresh token' })
    );
  });

  it('returns the rotated token pair on success', async () => {
    mocks.rotate.mockResolvedValue({
      newAccessToken: 'new-access',
      newRefreshToken: 'new-refresh',
      userId: 'user-1',
      role: 100,
      refreshTokenMaxAge: 1209600,
    });

    const response = await POST(request());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      newAccessToken: 'new-access',
      newRefreshToken: 'new-refresh',
      userId: 'user-1',
      role: 100,
      refreshTokenMaxAge: 1209600,
    });
  });

  it('still rejects a missing refresh token with 400', async () => {
    const response = await POST(request({}));
    expect(response.status).toBe(400);
    expect(mocks.rotate).not.toHaveBeenCalled();
  });
});
