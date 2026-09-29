import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  effect: null,
  initLogger: vi.fn(),
  info: vi.fn(),
  tracker: vi.fn(),
  config: { enabled: true, endpoint: 'http://localhost:3300', appId: 'resume-builder', apiKey: 'mck_test' },
}));
vi.mock('react', () => ({ useEffect: (effect) => { mocks.effect = effect; } }));
vi.mock('@/lib/manager/logger.js', () => ({ initLogger: mocks.initLogger }));
vi.mock('@/lib/manager/index.js', () => ({ managerClientConfig: mocks.config, managerTrackerScript: mocks.tracker }));
import ManagerProvider from '@/lib/manager/ManagerProvider.jsx';

let scripts;
beforeEach(() => {
  vi.clearAllMocks();
  scripts = [];
  mocks.config.enabled = true;
  mocks.initLogger.mockReturnValue({ info: mocks.info });
  mocks.tracker.mockReturnValue({ src: 'http://localhost:3300/t.js?v=1', appId: 'resume-builder', key: 'mak_test' });
  vi.stubGlobal('window', {});
  vi.stubGlobal('document', {
    querySelector: () => scripts[0] ?? null,
    createElement: () => ({ dataset: {} }),
    body: { appendChild: (script) => scripts.push(script) },
  });
});
afterEach(() => vi.unstubAllGlobals());

describe('Manager browser provider', () => {
  it('starts analytics independently when browser logging is unconfigured', () => {
    mocks.config.enabled = false;
    ManagerProvider();
    mocks.effect();
    expect(mocks.initLogger).not.toHaveBeenCalled();
    expect(scripts).toHaveLength(1);
    expect(scripts[0].dataset.key).toBe('mak_test');
  });
  it('shares a logger and tracker across repeated React mounts', () => {
    ManagerProvider();
    mocks.effect();
    mocks.effect();
    expect(mocks.initLogger).toHaveBeenCalledTimes(1);
    expect(mocks.info).toHaveBeenCalledTimes(1);
    expect(scripts).toHaveLength(1);
  });
  it('still installs analytics when browser logger initialization fails', () => {
    mocks.initLogger.mockImplementationOnce(() => { throw new Error('synthetic logger failure'); });
    ManagerProvider();
    expect(() => mocks.effect()).not.toThrow();
    expect(scripts).toHaveLength(1);
  });
  it('does not insert a script without analytics configuration', () => {
    mocks.tracker.mockReturnValue(null);
    ManagerProvider();
    mocks.effect();
    expect(mocks.initLogger).toHaveBeenCalledTimes(1);
    expect(scripts).toHaveLength(0);
  });
});
