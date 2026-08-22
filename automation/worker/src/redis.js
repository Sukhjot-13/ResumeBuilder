import Redis from 'ioredis';
import { config } from './config.js';

export const connection = new Redis({
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password,
  tls: config.redis.tlsEnabled ? {} : undefined,
  maxRetriesPerRequest: null,
  retryStrategy(times) {
    if (times > 3) return null;
    return Math.min(times * 200, 2000);
  },
});

connection.on('error', (err) => console.error('[Redis]', err.message));
connection.on('connect', () => console.log('[Redis] Connected'));
