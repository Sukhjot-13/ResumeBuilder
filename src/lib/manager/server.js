import { after } from 'next/server';
import { AsyncLocalStorage } from 'node:async_hooks';
import { flushManagerLogs, managerConfig } from './index.js';
import { traceIdFromHeaders } from './logger.js';

// Shared across development reloads, but each concurrent request has its own value.
const requestContext = globalThis.__managerRequestContext ??= new AsyncLocalStorage();

/** Adopt a browser trace, or create a fresh trace for a request without one. */
export function withManagerRequest(request, handler) {
  if (!managerConfig.enabled) return handler();
  const traceId = traceIdFromHeaders(request?.headers) || crypto.randomUUID();
  return requestContext.run(traceId, handler);
}

/** Logging calls inside a wrapped route inherit its trace without mutating the root logger. */
export function getManagerRequestTrace() {
  return requestContext.getStore() ?? '';
}

/** Keep queued logs alive after a Next.js response, including failed requests. */
export function scheduleManagerFlush() {
  if (!managerConfig.enabled) return;
  try {
    after(flushManagerLogs);
  } catch {
    // Standalone scripts/tests have no Next.js request context; the SDK timer remains.
  }
}
