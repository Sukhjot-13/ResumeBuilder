import { ok, withErrorHandler } from '@/lib/apiResponse';

const TEMPLATES = [
  { id: 'standard', name: 'Professional', component: 'Professional' },
  { id: 'modern', name: 'Modern', component: 'Modern' },
  { id: 'classic', name: 'Classic', component: 'ClassicTemplate' },
  { id: 'classic2', name: 'Classic 2', component: 'ClassicTemplate2' },
  { id: 'creative', name: 'Creative', component: 'Creative' },
  { id: 'simple', name: 'Simple', component: 'Simple' },
];

// In-memory cache: recompute only once per hour
let cachedResult = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

export const GET = withErrorHandler(async () => {
  const now = Date.now();
  if (!cachedResult || now - cacheTimestamp > CACHE_TTL_MS) {
    cachedResult = TEMPLATES.map(({ id, name }) => ({ id, name }));
    cacheTimestamp = now;
  }
  return ok(cachedResult);
});
