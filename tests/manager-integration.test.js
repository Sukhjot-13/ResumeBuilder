import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const MANAGER_ENV = {
  MANAGER_ENDPOINT: 'http://127.0.0.1:3300',
  MANAGER_APP_ID: 'resume-builder',
  MANAGER_LOG_KEY: 'mlk_test_key',
  MANAGER_ANALYTICS_KEY: 'mak_test_key',
};

function setEnv(values) {
  for (const key of ['MANAGER_ENDPOINT', 'MANAGER_APP_ID', 'MANAGER_LOG_KEY', 'MANAGER_ANALYTICS_KEY', 'MANAGER_LOG_SOURCE']) {
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
  afterEach(() => setEnv({}));

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
    setEnv(MANAGER_ENV);
    const { managerTrackerScript } = await loadManager();
    const tracker = managerTrackerScript();
    expect(tracker).toEqual({
      src: 'http://127.0.0.1:3300/t.js?v=1',
      appId: 'resume-builder',
      key: 'mak_test_key',
    });
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

  it('managerLog flushes so serverless cannot freeze the batch', async () => {
    setEnv(MANAGER_ENV);
    const { managerLog } = await loadManager();
    const { initLogger } = await import('@/lib/manager/logger.js');
    const log = {
      info: vi.fn(),
      error: vi.fn(),
      flush: vi.fn(async () => {}),
    };
    vi.spyOn(await import('@/lib/manager/index.js'), 'getManagerLogger');
    globalThis.__managerServerLogger = log;
    const flush = vi.fn(async () => {});
    log.flush = flush;
    log.info = vi.fn();
    managerLog('info', 'server_event', { route: '/api/health' });
    expect(log.info).toHaveBeenCalledWith('server_event', { route: '/api/health' });
    expect(flush).toHaveBeenCalled();
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
});
