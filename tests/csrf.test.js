import { describe, it, expect, beforeEach, vi } from 'vitest';

// T7b — CSRF defence for state-changing API requests, enforced in src/proxy.js
// via checkCsrfRequest(). Driven by the ALLOWED_ORIGINS env var and failing
// CLOSED on any mismatch.

const { checkCsrfRequest, isCsrfExempt, normalizeOrigins } = await import('@/lib/csrf');

const APP_ORIGIN = 'https://app.example.com';
const ALLOWED = [APP_ORIGIN, 'http://localhost:3000'];

function request(method, headers = {}, url = 'https://app.example.com/api/resumes') {
  return new Request(url, { method, headers });
}

async function status(response) {
  if (!response) return null;
  return response.status;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('T7b same-origin state change passes', () => {
  it('allows a same-origin POST with a matching Origin', async () => {
    const res = checkCsrfRequest(
      request('POST', { origin: APP_ORIGIN, 'sec-fetch-site': 'same-origin' }),
      { pathname: '/api/resumes', allowedOrigins: ALLOWED }
    );
    expect(await status(res)).toBe(null);
  });

  it('allows a same-origin POST from a configured secondary origin', async () => {
    const res = checkCsrfRequest(
      request('POST', { origin: 'http://localhost:3000', 'sec-fetch-site': 'same-origin' }),
      { pathname: '/api/resumes', allowedOrigins: ALLOWED }
    );
    expect(await status(res)).toBe(null);
  });

  it('ignores a trailing slash when matching origins', async () => {
    const res = checkCsrfRequest(
      request('POST', { origin: `${APP_ORIGIN}/` }),
      { pathname: '/api/resumes', allowedOrigins: [`${APP_ORIGIN}/`] }
    );
    expect(await status(res)).toBe(null);
  });
});

describe('T7b cross-site requests are refused (fail closed)', () => {
  it('refuses a mismatched Origin', async () => {
    const res = checkCsrfRequest(
      request('POST', { origin: 'https://evil.example.net', 'sec-fetch-site': 'same-origin' }),
      { pathname: '/api/resumes', allowedOrigins: ALLOWED }
    );
    expect(res.status).toBe(403);
    expect((await res.json()).code).toBe('CSRF_BAD_ORIGIN');
  });

  it('reports the cross-site signal first when both indicators are hostile', async () => {
    const res = checkCsrfRequest(
      request('POST', { origin: 'https://evil.example.net', 'sec-fetch-site': 'cross-site' }),
      { pathname: '/api/resumes', allowedOrigins: ALLOWED }
    );
    expect(res.status).toBe(403);
    expect((await res.json()).code).toBe('CSRF_CROSS_SITE');
  });

  it('refuses when there is NO Origin but Sec-Fetch-Site is cross-site', async () => {
    const res = checkCsrfRequest(
      request('POST', { 'sec-fetch-site': 'cross-site' }),
      { pathname: '/api/resumes', allowedOrigins: ALLOWED }
    );
    expect(res.status).toBe(403);
    expect((await res.json()).code).toBe('CSRF_CROSS_SITE');
  });

  it('refuses same-site but cross-origin navigations (Sec-Fetch-Site: same-site)', async () => {
    const res = checkCsrfRequest(
      request('POST', { origin: 'https://attacker.example.org', 'sec-fetch-site': 'same-site' }),
      { pathname: '/api/admin/roles', allowedOrigins: ALLOWED }
    );
    expect(res.status).toBe(403);
  });

  it('refuses a malformed Origin header', async () => {
    const res = checkCsrfRequest(
      request('POST', { origin: 'not a url' }),
      { pathname: '/api/resumes', allowedOrigins: ALLOWED }
    );
    expect(res.status).toBe(403);
    expect((await res.json()).code).toBe('CSRF_BAD_ORIGIN');
  });

  it('refuses an allow-listed request when the allow-list is empty (no silent open)', async () => {
    const res = checkCsrfRequest(
      request('POST', { origin: APP_ORIGIN }),
      { pathname: '/api/resumes', allowedOrigins: [] }
    );
    expect(res.status).toBe(403);
  });

  it('ignores malformed allow-list entries rather than matching everything', () => {
    expect(normalizeOrigins(['https://ok.example', '%%%', '', null, 42])).toEqual([
      'https://ok.example',
    ]);
  });
});

describe('T7b non-browser and non-GET traffic', () => {
  it('never blocks safe methods', () => {
    for (const method of ['GET', 'HEAD', 'OPTIONS']) {
      const res = checkCsrfRequest(
        request(method, { origin: 'https://evil.example.net' }),
        { pathname: '/api/resumes', allowedOrigins: ALLOWED }
      );
      expect(res).toBe(null);
    }
  });

  it('allows a Bearer API-key caller (no ambient cookie authority)', () => {
    const res = checkCsrfRequest(
      request('POST', { authorization: 'Bearer rb_key', 'sec-fetch-site': 'cross-site' }),
      { pathname: '/api/generate-content', allowedOrigins: ALLOWED }
    );
    expect(res).toBe(null);
  });

  it('exempts the Stripe webhook (authenticated by signature, not cookies)', () => {
    expect(isCsrfExempt('/api/webhooks/stripe')).toBe(true);
    const res = checkCsrfRequest(
      request('POST', {}, 'https://app.example.com/api/webhooks/stripe'),
      { pathname: '/api/webhooks/stripe', allowedOrigins: [] }
    );
    expect(res).toBe(null);
  });

  it('does not exempt a look-alike webhook path', () => {
    expect(isCsrfExempt('/api/webhooksX/stripe')).toBe(false);
  });

  it('allows a request with neither Origin nor Sec-Fetch-Site (server-to-server)', () => {
    const res = checkCsrfRequest(
      request('POST', {}),
      { pathname: '/api/auth/verify-token', allowedOrigins: ALLOWED }
    );
    expect(res).toBe(null);
  });
});
