import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  complete: vi.fn(), db: vi.fn(), error: vi.fn(), warn: vi.fn(),
  pdf: vi.fn(), auth: vi.fn(), permission: vi.fn(), stripe: vi.fn(),
}));
vi.mock('@/lib/manager/server', () => ({
  withManagerRequest: (_, handler) => handler(), scheduleManagerFlush: mocks.complete,
}));
vi.mock('@/lib/logger', () => ({ logger: { error: mocks.error, warn: mocks.warn, info: vi.fn() } }));
vi.mock('@/lib/mongodb', () => ({ default: mocks.db }));
vi.mock('@/lib/pdf-generator', () => ({ generatePdf: mocks.pdf, generateCoverLetterPdf: mocks.pdf }));
vi.mock('@/lib/apiKeyAuth', () => ({ resolveUserId: mocks.auth }));
vi.mock('@/lib/apiPermissionGuard', () => ({
  requirePermission: mocks.permission, isPermissionError: result => Boolean(result?.error),
}));
vi.mock('@/lib/stripe', () => ({ getStripe: mocks.stripe }));
vi.mock('@/lib/utils', () => ({ hashToken: () => 'synthetic-token-hash' }));
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: () => ({ value: 'synthetic-refresh-token' }) }),
  headers: async () => new Headers(),
}));
import { POST as pdf } from '@/app/api/render-pdf-react/route';
import { POST as webhook } from '@/app/api/webhooks/stripe/route';
import { POST as logout } from '@/app/api/auth/logout/route';
import { fail } from '@/lib/apiResponse';

beforeEach(() => {
  vi.resetAllMocks();
  mocks.db.mockResolvedValue(undefined);
  mocks.auth.mockResolvedValue({ userId: 'synthetic-user' });
  mocks.permission.mockResolvedValue({});
  mocks.pdf.mockResolvedValue(Buffer.from('%PDF-1.3 synthetic fixture'));
});

describe('Manager completion coverage for direct route handlers', () => {
  const request = () => new Request('http://localhost/api/render-pdf-react', {
    method: 'POST', body: JSON.stringify({ resumeData: { profile: {} }, template: 'ClassicTemplate' }),
  });

  it('preserves successful PDF responses and schedules completion', async () => {
    const response = await pdf(request());
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('application/pdf');
    expect(await response.text()).toMatch(/^%PDF-/);
    expect(mocks.complete).toHaveBeenCalledTimes(1);
  });

  it('logs PDF database failures that occur before its rendering try/catch', async () => {
    mocks.db.mockRejectedValue(new Error('synthetic database failure'));
    const response = await pdf(request());
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ success: false, error: 'Internal server error' });
    expect(mocks.error).toHaveBeenCalledWith('Unhandled route error', expect.any(Error));
    expect(mocks.complete).toHaveBeenCalledTimes(1);
  });

  it('preserves PDF permission rejection without rendering', async () => {
    mocks.permission.mockResolvedValue({ error: fail('Forbidden', 403) });
    expect((await pdf(request())).status).toBe(403);
    expect(mocks.pdf).not.toHaveBeenCalled();
    expect(mocks.complete).toHaveBeenCalledTimes(1);
  });

  it('keeps logout successful and clears cookies when token revocation fails', async () => {
    mocks.db.mockRejectedValue(new Error('synthetic revocation failure'));
    const response = await logout();
    expect(response.status).toBe(200);
    expect(response.headers.getSetCookie()).toHaveLength(2);
    expect(mocks.error).toHaveBeenCalledWith('Could not revoke refresh token during logout', expect.any(Error));
    expect(mocks.complete).toHaveBeenCalledTimes(1);
  });

  it('flushes the warning when billing is not configured', async () => {
    mocks.stripe.mockImplementation(() => { throw new Error('not configured'); });
    expect((await webhook(new Request('http://localhost/webhook', { method: 'POST' }))).status).toBe(503);
    expect(mocks.warn).toHaveBeenCalled();
    expect(mocks.complete).toHaveBeenCalledTimes(1);
  });

  it('preserves invalid-signature webhook rejection and completion', async () => {
    mocks.stripe.mockReturnValue({ webhooks: { constructEvent: () => { throw new Error('invalid signature'); } } });
    expect((await webhook(new Request('http://localhost/webhook', { method: 'POST', body: '{}' }))).status).toBe(400);
    expect(mocks.db).not.toHaveBeenCalled();
    expect(mocks.complete).toHaveBeenCalledTimes(1);
  });

  it('logs unexpected webhook body-reading failures and returns a safe response', async () => {
    mocks.stripe.mockReturnValue({});
    const response = await webhook({ text: async () => { throw new Error('synthetic body failure'); } });
    expect(response.status).toBe(500);
    expect(mocks.error).toHaveBeenCalledWith('Unhandled route error', expect.any(Error));
    expect(mocks.complete).toHaveBeenCalledTimes(1);
  });
});
