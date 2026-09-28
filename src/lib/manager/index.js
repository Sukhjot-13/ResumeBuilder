/**
 * Manager integration — centralized logging + analytics.
 *
 * Everything here is optional: with no MANAGER_* env vars configured the app keeps
 * working and this module becomes a set of no-ops, so local development, CI and
 * previews are never broken by (or dependent on) the observability service.
 *
 * Configure (Vercel or .env.local):
 *   MANAGER_ENDPOINT   https://manager.example.com
 *   MANAGER_APP_ID     resume-builder
 *   MANAGER_LOG_KEY    mlk_…   (server)  or  mck_… (browser)
 *   MANAGER_ANALYTICS_KEY mak_… (tracker)
 *   MANAGER_LOG_SOURCE server | client   (optional, inferred when omitted)
 *
 * See README.md § "Manager integration" for the full contract.
 */
import { initLogger } from './logger.js';

const SOURCE = process.env.MANAGER_LOG_SOURCE === 'client' ? 'client' : 'server';

function env(name) {
  const value = process.env[name];
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
}

export const managerConfig = {
  endpoint: env('MANAGER_ENDPOINT'),
  appId: env('MANAGER_APP_ID'),
  apiKey: env('MANAGER_LOG_KEY'),
  analyticsKey: env('MANAGER_ANALYTICS_KEY'),
  source: SOURCE,
  enabled: Boolean(env('MANAGER_ENDPOINT') && env('MANAGER_APP_ID') && env('MANAGER_LOG_KEY')),
};

const noop = () => {};

const NOOP_LOGGER = {
  trace: noop,
  debug: noop,
  info: noop,
  warn: noop,
  error: noop,
  fatal: noop,
  child: () => NOOP_LOGGER,
  time: noop,
  timeEnd: () => 0,
  withTrace: () => NOOP_LOGGER,
  newTrace: () => '',
  flush: async () => {},
  setContext: noop,
  timeEndAndSend: noop,
};

const GLOBAL_KEY = '__managerServerLogger';
const scope = globalThis;

/**
 * Batch window for routine entries. The SDK's own timer does the batching, so a burst of
 * N log lines becomes one HTTP request instead of N.
 *
 * It is short on purpose: serverless runtimes can freeze timers once a response is sent,
 * so a 5s default could delay (or strand) entries created during a request.
 */
const FLUSH_INTERVAL_MS = 250;

/** Levels that must never wait for the batch window. */
const IMMEDIATE_LEVELS = new Set(['error', 'fatal']);

/**
 * Minimum gap between two urgent flushes. A burst of 50 errors costs one request now and
 * one at the end of the window, not 50.
 */
const URGENT_FLUSH_MIN_GAP_MS = 100;

let lastUrgentFlushAt = 0;
let urgentTimer = null;

/**
 * The logger is created lazily, on first use, and cached on globalThis.
 *
 * Two reasons it is not created during app boot:
 *  - server frameworks compile route handlers and startup hooks into separate module
 *    graphs, so an instance created at boot can be a different object than the one a
 *    request sees;
 *  - a Next.js server (and Vercel functions in particular) can freeze timers once a
 *    response is sent, so a logger that only relies on its background flush timer can
 *    lose entries created outside a request.
 * Creating it on demand inside the request and flushing on every write avoids both.
 */
function cachedLogger() {
  return scope[GLOBAL_KEY] ?? null;
}

/**
 * Creates the server logger on first use and caches it on globalThis so every module
 * instance in the process shares one queue. Safe to call repeatedly.
 * Never throws: an observability outage must not take the app down.
 */
export function startManagerLogger() {
  if (!managerConfig.enabled) {
    return cachedLogger() ?? NOOP_LOGGER;
  }
  const existing = cachedLogger();
  if (existing !== null) {
    return existing;
  }
  try {
    const logger = initLogger({
      endpoint: managerConfig.endpoint,
      appId: managerConfig.appId,
      apiKey: managerConfig.apiKey,
      environment: process.env.NODE_ENV === 'production' ? 'production' : 'development',
      release: process.env.VERCEL_GIT_COMMIT_SHA || process.env.GIT_SHA || 'dev',
      captureConsole: null,
      captureGlobalErrors: false,
      captureFetch: false,
      redactKeys: [
        'password',
        'token',
        'secret',
        'authorization',
        'cookie',
        'apikey',
        'api_key',
        'cvv',
      ],
      sampleRate: process.env.NODE_ENV === 'production' ? { debug: 0.1, trace: 0 } : {},
      flushIntervalMs: FLUSH_INTERVAL_MS,
    });
    scope[GLOBAL_KEY] = logger;
    logger.info('manager_logger_started', { source: 'server' });
    return logger;
  } catch (err) {
    console.warn('[manager] logger failed to start:', err?.message ?? err);
    return NOOP_LOGGER;
  }
}

/** The server logger, created on first use and cached on globalThis. Never null. */
export function getManagerLogger() {
  return cachedLogger() ?? startManagerLogger();
}

/**
 * Emits a server log.
 *
 * Routine levels ride the SDK's 250ms batch window (one request per burst, not per line).
 * error/fatal flush straight away so a crash right after logging cannot strand the entry.
 * Fire-and-forget: never awaits, never throws.
 */
export function managerLog(level, message, meta = {}) {
  if (!managerConfig.enabled) return;
  try {
    const log = getManagerLogger();
    const fn = typeof log[level] === 'function' ? log[level] : log.info;
    fn.call(log, message, meta);
    if (IMMEDIATE_LEVELS.has(level)) {
      scheduleUrgentFlush(log);
    }
  } catch {
    /* observability must never throw */
  }
}

/**
 * Leading-edge flush: send now if the last urgent send was long enough ago, otherwise
 * schedule one for the end of the gap so nothing is stranded.
 */
function scheduleUrgentFlush(log) {
  const send = () => {
    urgentTimer = null;
    lastUrgentFlushAt = Date.now();
    const flushed = log.flush();
    if (flushed && typeof flushed.catch === 'function') {
      flushed.catch(() => {});
    }
  };
  const elapsed = Date.now() - lastUrgentFlushAt;
  if (elapsed >= URGENT_FLUSH_MIN_GAP_MS) {
    send();
    return;
  }
  if (urgentTimer === null) {
    urgentTimer = setTimeout(send, URGENT_FLUSH_MIN_GAP_MS - elapsed);
    if (typeof urgentTimer.unref === 'function') {
      urgentTimer.unref();
    }
  }
}

/** How many entries this client discarded (rate limit / queue overflow). */
export function getManagerDroppedCount() {
  const log = cachedLogger();
  return log !== null && typeof log.droppedCount === 'function' ? log.droppedCount() : 0;
}

/** Records an API route outcome. Call from route handlers and server actions. */
export function logServerEvent(message, meta = {}) {
  managerLog('info', message, meta);
}

/** Records a failure. `error` may be an Error or a plain object. */
export function logServerError(message, error, meta = {}) {
  managerLog('error', message, {
    ...meta,
    error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : error,
  });
}

/** Tracker <script> for the browser, or null when analytics is not configured. */
export function managerTrackerScript() {
  const endpoint = managerConfig.endpoint;
  const appId = managerConfig.appId;
  const analyticsKey = managerConfig.analyticsKey;
  if (!endpoint || !appId || !analyticsKey) return null;
  return {
    src: `${endpoint}/t.js?v=1`,
    appId,
    key: analyticsKey,
  };
}
