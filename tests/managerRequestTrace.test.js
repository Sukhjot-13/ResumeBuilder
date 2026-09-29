import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ config: { enabled: true }, log: vi.fn(), after: vi.fn(), traced: [] }));
vi.mock('next/server', async (importOriginal) => ({ ...await importOriginal(), after: mocks.after }));
vi.mock('@/lib/manager/index.js', () => ({
  managerConfig: mocks.config, managerLog: mocks.log, flushManagerLogs: vi.fn(async () => {}),
}));
import { logger } from '@/lib/logger';
import { withErrorHandler, ok } from '@/lib/apiResponse';
import { getManagerRequestTrace } from '@/lib/manager/server';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.config.enabled = true;
  mocks.traced = [];
  mocks.log.mockImplementation((level, message, meta) => {
    mocks.traced.push([level, message, meta, getManagerRequestTrace()]);
  });
});

describe('request-scoped Manager traces', () => {
  it('keeps concurrent browser traces separate through async work and thrown errors', async () => {
    let unblockFirst;
    const firstReady = new Promise(resolve => { unblockFirst = resolve; });
    let secondLogged;
    const secondReady = new Promise(resolve => { secondLogged = resolve; });
    const handler = withErrorHandler(async request => {
      const name = request.headers.get('x-test-name');
      if (name === 'first') {
        unblockFirst();
        await secondReady;
        logger.info('first complete');
        throw new Error('first failed');
      }
      await firstReady;
      logger.info('second complete');
      secondLogged();
      return ok({ ok: true });
    });
    const request = (name, trace) => new Request('http://localhost/api/test', {
      headers: { 'x-test-name': name, 'x-trace-id': trace },
    });
    const responses = await Promise.all([
      handler(request('first', 'trace-first')), handler(request('second', 'trace-second')),
    ]);
    expect(responses.map(response => response.status)).toEqual([500, 200]);
    expect(mocks.traced.map(([level, message, , trace]) => ({ level, message, trace }))).toEqual([
      { level: 'info', message: 'second complete', trace: 'trace-second' },
      { level: 'info', message: 'first complete', trace: 'trace-first' },
      { level: 'error', message: 'Unhandled route error', trace: 'trace-first' },
    ]);
    expect(getManagerRequestTrace()).toBe('');
  });

  it('gives headerless requests unique traces and bounds incoming trace IDs', async () => {
    const handler = withErrorHandler(() => {
      logger.info('request');
      return ok({ ok: true });
    });
    await handler(new Request('http://localhost/api/test'));
    await handler(new Request('http://localhost/api/test'));
    await handler(new Request('http://localhost/api/test', { headers: { 'x-trace-id': 'x'.repeat(200) } }));
    const traces = mocks.traced.map(call => call[3]);
    expect(traces[0]).toBeTruthy();
    expect(traces[1]).not.toBe(traces[0]);
    expect(traces[2]).toHaveLength(80);
  });

  it('keeps disabled integrations and logs outside a request safe', async () => {
    mocks.config.enabled = false;
    await withErrorHandler(() => { logger.info('disabled'); return ok({ ok: true }); })();
    logger.info('standalone');
    expect(mocks.traced.map(call => call[3])).toEqual(['', '']);
  });
});
