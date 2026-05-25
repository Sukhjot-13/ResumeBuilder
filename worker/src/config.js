import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',

  resumeBuilderUrl: process.env.RESUME_BUILDER_URL || 'http://localhost:3000',
  resumeBuilderApiKey: process.env.RESUME_BUILDER_API_KEY || '',

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    tlsEnabled: process.env.REDIS_TLS_ENABLED === 'true',
  },

  cookieEncryptionKey: process.env.COOKIE_ENCRYPTION_KEY || '',
  resendApiKey: process.env.RESEND_API_KEY || '',

  scrapeIntervalMs: 2 * 60 * 60 * 1000,
};

export function validateConfig() {
  const errors = [];
  if (!config.resumeBuilderApiKey) errors.push('RESUME_BUILDER_API_KEY is required');
  if (!config.cookieEncryptionKey) errors.push('COOKIE_ENCRYPTION_KEY is required');
  return errors;
}
