import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  after: vi.fn(),
  flush: vi.fn(async () => {}),
  config: { enabled: true },
  error: vi.fn(),
}));
vi.mock('next/server', async (importOriginal) => ({ ...await importOriginal(), after: mocks.after }));
vi.mock('@/lib/manager/index.js', () => ({ managerConfig: mocks.config, flushManagerLogs: mocks.flush }));
vi.mock('@/lib/logger', () => ({ logger: { error: mocks.error } }));
import { withErrorHandler, ok, fail, AuthError } from '@/lib/apiResponse';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.after.mockReset();
  mocks.config.enabled = true;
});
describe('Manager delivery after request completion', () => {
  it.each([
    ['success', () => ok({ ok: true }), 200],
    ['early denial', () => fail('denied', 403), 403],
    ['expected error', () => { throw new AuthError(); }, 401],
    ['unexpected error', () => { throw new Error('synthetic failure'); }, 500],
  ])('flushes after %s responses without delaying the handler', async (_, handler, status) => {
    const response = await withErrorHandler(handler)();
    expect(response.status).toBe(status);
    expect(mocks.after).toHaveBeenCalledTimes(1);
    expect(mocks.flush).not.toHaveBeenCalled();
    await mocks.after.mock.calls[0][0]();
    expect(mocks.flush).toHaveBeenCalledTimes(1);
    if (status === 500) expect(mocks.error).toHaveBeenCalledWith('Unhandled route error', expect.any(Error));
  });
  it('is a no-op when Manager is unconfigured', async () => {
    mocks.config.enabled = false;
    expect((await withErrorHandler(() => ok({ ok: true }))()).status).toBe(200);
    expect(mocks.after).not.toHaveBeenCalled();
  });
  it('preserves the response outside a Next.js request context', async () => {
    mocks.after.mockImplementation(() => { throw new Error('outside request context'); });
    expect((await withErrorHandler(() => ok({ ok: true }))()).status).toBe(200);
  });
});
