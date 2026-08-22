/**
 * Next.js instrumentation hook — runs once when the server boots.
 * Used to fail fast on missing environment variables instead of
 * discovering them deep inside a request handler.
 */
export async function register() {
  // Only validate in the Node.js server runtime (not edge, not browser)
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

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
