/**
 * Rejects if the wrapped promise doesn't settle within `ms`.
 * Used to keep hung AI provider calls from pinning request handlers.
 */
export function withTimeout(promise, ms, label = 'AI call') {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}
