/**
 * Next.js instrumentation hook — runs once when the server boots.
 * Used to fail fast on missing environment variables instead of
 * discovering them deep inside a request handler.
 */
export async function register() {
  // Only validate in the Node.js server runtime (not edge, not browser)
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  // NOTE: the Manager server logger is created lazily on first use inside the request
  // that needs it (see src/lib/manager/index.js). Creating it here would bind it to
  // this module instance, which route handlers do not share.

  try {
    const { default: env, validateEnv } = await import('@/config/env');

    const { missing, warnings } = validateEnv({ throwOnError: true });

    for (const warning of warnings) {
      console.warn(`[env] ${warning}`);
    }

    if (env.isDevelopment && warnings.length === 0) {
      console.log('[env] All environment variables validated.');
    }
  } catch (err) {
    console.error(`[env] Startup validation failed: ${err.message}`);
    throw err;
  }
}
