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

  // Automation
  cookieEncryptionKey: process.env.COOKIE_ENCRYPTION_KEY,
  workerUrl: process.env.WORKER_URL || 'http://localhost:3001',
};

export default env;
