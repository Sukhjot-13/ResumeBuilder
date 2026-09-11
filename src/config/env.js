/**
 * Environment Variable Config — Single Source of Truth
 *
 * Never use process.env.X directly anywhere in the codebase.
 * Import this file instead: import env from '@/config/env'
 *
 * Benefit: renaming a variable only requires a change here.
 */

const env = {
  // Auth
  accessTokenSecret: process.env.ACCESS_TOKEN_SECRET,
  refreshTokenSecret: process.env.REFRESH_TOKEN_SECRET,

  // Database
  mongodbUri: process.env.MONGODB_URI,

  // AI
  geminiApiKey: process.env.GEMINI_API_KEY,
  deepseekApiKey: process.env.DEEPSEEK_API_KEY,

  // Stripe
  stripeSecretKey: process.env.STRIPE_SECRET_KEY,
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET,

  // Email (Brevo)
  brevoApiKey: process.env.BREVO_API_KEY,
  brevoSenderEmail: process.env.BREVO_SENDER_EMAIL,

  // App
  appUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  isProduction: process.env.NODE_ENV === 'production',
  isDevelopment: process.env.NODE_ENV === 'development',
};

// ---------------------------------------------------------------------------
// Boot-time validation
// ---------------------------------------------------------------------------
const REQUIRED_VARS = [
  'ACCESS_TOKEN_SECRET',
  'REFRESH_TOKEN_SECRET',
  'MONGODB_URI',
];

const FEATURE_VARS = [
  { any: ['DEEPSEEK_API_KEY', 'GEMINI_API_KEY'], label: 'AI generation (DeepSeek or Gemini)' },
  { single: 'STRIPE_SECRET_KEY', label: 'Stripe billing' },
  { single: 'BREVO_API_KEY', label: 'OTP email delivery' },
];

/**
 * Validates required environment variables. Call at server boot
 * (see src/instrumentation.js) so misconfigurations fail fast instead of
 * surfacing deep inside a request.
 * @param {{ throwOnError?: boolean }} opts
 * @returns {{ missing: string[], warnings: string[] }}
 */
export function validateEnv(opts = {}) {
  const missing = REQUIRED_VARS.filter((name) => !process.env[name]);

  const warnings = [];
  for (const feature of FEATURE_VARS) {
    const names = feature.any || [feature.single];
    if (!names.some((n) => process.env[n])) {
      warnings.push(`${feature.label} will not work — none of ${names.join(', ')} set`);
    }
  }

  if (opts.throwOnError && missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  return { missing, warnings };
}

export default env;
