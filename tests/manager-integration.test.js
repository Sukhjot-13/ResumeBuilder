import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const CLIENT_ENV = {
  NEXT_PUBLIC_MANAGER_ENDPOINT: 'http://127.0.0.1:3300',
  NEXT_PUBLIC_MANAGER_APP_ID: 'resume-builder',
  NEXT_PUBLIC_MANAGER_CLIENT_KEY: 'mck_test_key',
  NEXT_PUBLIC_MANAGER_ANALYTICS_KEY: 'mak_test_key',
};

const MANAGER_ENV = {
  MANAGER_ENDPOINT: 'http://127.0.0.1:3300',
  MANAGER_APP_ID: 'resume-builder',
  MANAGER_LOG_KEY: 'mlk_test_key',
  MANAGER_ANALYTICS_KEY: 'mak_test_key',
};

function setEnv(values) {
  for (const key of ['MANAGER_ENDPOINT', 'MANAGER_APP_ID', 'MANAGER_LOG_KEY', 'MANAGER_ANALYTICS_KEY', 'MANAGER_LOG_SOURCE', 'NEXT_PUBLIC_MANAGER_ENDPOINT', 'NEXT_PUBLIC_MANAGER_APP_ID', 'NEXT_PUBLIC_MANAGER_CLIENT_KEY', 'NEXT_PUBLIC_MANAGER_ANALYTICS_KEY']) {
    delete process.env[key];
  }
  for (const [key, value] of Object.entries(values ?? {})) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}

async function loadManager() {
  vi.resetModules();
  delete globalThis.__managerServerLogger;
  return import('@/lib/manager/index.js');
}

describe('manager integration module', () => {
  beforeEach(() => setEnv({}));
  afterEach(async () => {
    const { shutdownLoggers } = await import('@/lib/manager/logger.js');
    shutdownLoggers();
    delete globalThis.__managerServerLogger;
    vi.unstubAllGlobals();
    setEnv({});
  });

  it('is fully disabled (no-ops) when nothing is configured', async () => {
    const { managerConfig, getManagerLogger, logServerEvent, logServerError, managerTrackerScript } =
      await loadManager();

    expect(managerConfig.enabled).toBe(false);
    expect(() => logServerEvent('noop_event', { a: 1 })).not.toThrow();
    expect(() => logServerError('noop_error', new Error('x'))).not.toThrow();
    expect(managerTrackerScript()).toBeNull();

    const log = getManagerLogger();
    for (const level of ['trace', 'debug', 'info', 'warn', 'error', 'fatal']) {
      expect(() => log[level]('message', { a: 1 })).not.toThrow();
    }
    expect(() => log.child({ requestId: 'r1' }).info('child')).not.toThrow();
    expect(log.timeEnd('timer')).toBe(0);
    await expect(log.flush()).resolves.toBeUndefined();
  });

  it('enables itself when endpoint, app id and key are present', async () => {
    setEnv(MANAGER_ENV);
    const { managerConfig } = await loadManager();
    expect(managerConfig.enabled).toBe(true);
    expect(managerConfig.appId).toBe('resume-builder');
    expect(managerConfig.analyticsKey).toBe('mak_test_key');
  });

  it('stays disabled when only the analytics key is set', async () => {
    setEnv({ MANAGER_ANALYTICS_KEY: 'mak_test_key' });
    const { managerConfig } = await loadManager();
    expect(managerConfig.enabled).toBe(false);
  });

  it('treats blank values as unconfigured', async () => {
    setEnv({ ...MANAGER_ENV, MANAGER_LOG_KEY: '   ' });
    const { managerConfig } = await loadManager();
    expect(managerConfig.enabled).toBe(false);
  });

  it('builds a versioned tracker script tag only when analytics is configured', async () => {
    setEnv({ ...MANAGER_ENV, ...CLIENT_ENV });
    const { managerTrackerScript } = await loadManager();
    const tracker = managerTrackerScript();
    expect(tracker).toEqual({
      src: 'http://127.0.0.1:3300/t.js?v=1',
      appId: 'resume-builder',
      key: 'mak_test_key',
    });
  });

  it('keeps the browser config separate and reads NEXT_PUBLIC_* statically', async () => {
    setEnv(MANAGER_ENV);
    const { managerConfig, managerClientConfig } = await loadManager();
    expect(managerConfig.enabled).toBe(true);
    expect(managerClientConfig.enabled).toBe(false);

    setEnv({ ...MANAGER_ENV, ...CLIENT_ENV });
    const withClient = await loadManager();
    expect(withClient.managerConfig.enabled).toBe(true);
    expect(withClient.managerClientConfig.enabled).toBe(true);
    expect(withClient.managerClientConfig.apiKey).toBe('mck_test_key');
    // The server key must never reach the browser config.
    expect(withClient.managerClientConfig.apiKey).not.toBe('mlk_test_key');
  });

  it('never reads a plain process.env lookup in the client-facing module', async () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/lib/manager/index.js'),
      'utf8',
    );
    const clientBlock = source.slice(source.indexOf('export const managerClientConfig'));
    // Only literal NEXT_PUBLIC_* member access is allowed there.
    expect(clientBlock).not.toMatch(/process\.env\[[^\]]*\]/);
    expect(clientBlock).toMatch(/process\.env\.NEXT_PUBLIC_MANAGER_ENDPOINT/);
  });

  it('omits the tracker when the analytics key is missing', async () => {
    setEnv({ ...MANAGER_ENV, MANAGER_ANALYTICS_KEY: undefined });
    const { managerTrackerScript } = await loadManager();
    expect(managerTrackerScript()).toBeNull();
  });

  it('managerLog is a safe no-op when unconfigured', async () => {
    const { managerLog } = await loadManager();
    expect(() => managerLog('info', 'x', { a: 1 })).not.toThrow();
    expect(() => managerLog('nonsense_level', 'x')).not.toThrow();
    expect(() => managerLog('error', 'x', { error: new Error('boom') })).not.toThrow();
  });

  it('batches routine levels but flushes errors immediately (leading edge)', async () => {
    setEnv(MANAGER_ENV);
    const { managerLog } = await loadManager();
    const info = vi.fn();
    const error = vi.fn();
    const flush = vi.fn(async () => {});
    globalThis.__managerServerLogger = { info, error, flush };

    managerLog('info', 'routine_1');
    managerLog('info', 'routine_2');
    expect(flush).not.toHaveBeenCalled();

    managerLog('error', 'urgent_1');
    expect(error).toHaveBeenCalledTimes(1);
    expect(flush).toHaveBeenCalledTimes(1);

    // A second error inside the gap must not start another request on its own.
    managerLog('error', 'urgent_2');
    expect(flush).toHaveBeenCalledTimes(1);
    await new Promise((resolve) => setTimeout(resolve, 150));
    expect(flush).toHaveBeenCalledTimes(2);
  });

  it('falls back to info for an unknown level', async () => {
    setEnv(MANAGER_ENV);
    const { managerLog } = await loadManager();
    const info = vi.fn();
    globalThis.__managerServerLogger = { info, flush: vi.fn(async () => {}) };
    managerLog('not_a_level', 'x');
    expect(info).toHaveBeenCalledTimes(1);
    expect(info.mock.calls[0][0]).toBe('x');
  });

  it('shares one logger instance across module instances via globalThis', async () => {
    setEnv(MANAGER_ENV);
    const { startManagerLogger, getManagerLogger } = await loadManager();
    const first = startManagerLogger();
    const second = getManagerLogger();
    expect(second).toBe(first);
    expect(globalThis.__managerServerLogger).toBe(first);
  });

  it('creates a real SDK logger when configured', async () => {
    setEnv(MANAGER_ENV);
    const { startManagerLogger } = await loadManager();
    const log = startManagerLogger();
    for (const level of ['trace', 'debug', 'info', 'warn', 'error', 'fatal']) {
      expect(typeof log[level]).toBe('function');
    }
    expect(typeof log.child).toBe('function');
    expect(typeof log.flush).toBe('function');
    expect(typeof log.traceId).toBe('function');
  });

  it('uses a request-bound child without changing the shared logger trace', async () => {
    setEnv(MANAGER_ENV);
    const { managerLog } = await loadManager();
    const info = vi.fn();
    const withTrace = vi.fn(() => ({ info }));
    globalThis.__managerServerLogger = { withTrace };
    globalThis.__managerRequestContext = { getStore: () => 'browser-trace' };
    try {
      managerLog('info', 'request_event', { synthetic: true });
    } finally {
      delete globalThis.__managerRequestContext;
    }
    expect(withTrace).toHaveBeenCalledWith('browser-trace');
    expect(info).toHaveBeenCalledWith('request_event', { synthetic: true });
  });

  it('delivers distinct serialized server exceptions with their stack and browser trace', async () => {
    setEnv(MANAGER_ENV);
    const batches = [];
    vi.stubGlobal('fetch', vi.fn(async (_, options) => {
      batches.push(...JSON.parse(options.body).logs);
      return { status: 200, ok: true };
    }));
    const { managerLog, flushManagerLogs } = await loadManager();
    managerLog('error', 'Unhandled route error', {
      error: { name: 'Error', message: 'first failure', stack: 'Error: first failure\n at save (/app.js:1:1)' },
      password: 'must-be-redacted',
    }, 'browser-trace');
    managerLog('error', 'Unhandled route error', {
      error: { name: 'Error', message: 'second failure', stack: 'Error: second failure\n at load (/app.js:2:1)' },
    }, 'browser-trace');
    await flushManagerLogs();
    const errors = batches.filter(row => row.message === 'Unhandled route error');
    expect(errors).toHaveLength(2);
    expect(errors.map(row => row.stack)).toEqual([
      'Error: first failure\n at save (/app.js:1:1)',
      'Error: second failure\n at load (/app.js:2:1)',
    ]);
    expect(errors.every(row => row.traceId === 'browser-trace')).toBe(true);
    expect(JSON.stringify(batches)).not.toContain('must-be-redacted');
  });
});
