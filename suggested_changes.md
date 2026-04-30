# Suggested Changes & Improvements

> **Audit Scope:** Security, token handling/storage, code separation, maintainability.
> **Principle:** Every suggestion is scoped so that ONE file change propagates everywhere it is used.

---

## 🔴 CRITICAL — Security Issues (Fix Immediately)

---

### [SEC-1] Real secrets committed in `.env` and `.env.local`

**File:** `.env` and `.env.local`

**Problem:**  
Both files contain real, working credentials — MongoDB URI with username & password, Gemini API key, Brevo API key, Stripe secret key, and token secrets. These are committed in the repo (`.gitignore` uses `.env*` which should protect them, but the `.env` file being present alongside `.env.local` is unusual and risky).

The JWT secrets are also dangerously weak:
```
ACCESS_TOKEN_SECRET=ajosnfkjndfkjsdnfkj   ← Too short, guessable
REFRESH_TOKEN_SECRET=sknfkjsndfjnsdjfndjfn  ← Too short, guessable
```

**Fix:**
1. Immediately rotate **all** exposed secrets (Gemini, MongoDB, Brevo, Stripe) via their respective dashboards.
2. Delete `.env` — use only `.env.local` for local dev and environment variables in production hosting (Vercel, etc.).
3. Replace weak JWT secrets with cryptographically strong 256-bit random strings. Generate with:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
4. Add `STRIPE_WEBHOOK_SECRET` (currently commented out) — the webhook is unprotected without it.

**One-file rule:** The `.env.local` file is the single place to update all secrets. Rotating the secret key in that one file will propagate to `src/lib/utils.js`, `src/lib/auth-edge.js`, and everywhere they are used.

---

### [SEC-2] `accessToken` cookie is NOT `httpOnly`

**File:** `src/app/api/auth/verify-otp/route.js` (lines 54–58)

**Problem:**  
The `accessToken` cookie is set **without** `httpOnly: true`. This means client-side JavaScript can read it, making it vulnerable to XSS token theft. The `refreshToken` is correctly set as `httpOnly`, but the access token is not.

```js
// CURRENT (INSECURE)
response.cookies.set('accessToken', accessToken, {
  path: '/',
  maxAge: 5 * 60,
  secure: process.env.NODE_ENV === 'production',
  // ❌ Missing httpOnly: true
});
```

**Fix:** Add `httpOnly: true` to the `accessToken` cookie:

```js
response.cookies.set('accessToken', accessToken, {
  path: '/',
  maxAge: 5 * 60,
  httpOnly: true,  // ✅ Add this
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax', // ✅ Add this too (see SEC-3)
});
```

**One-file rule:** Change only `src/app/api/auth/verify-otp/route.js`. The proxy and all middleware already read this cookie correctly from the server side.

---

### [SEC-3] Cookies missing `sameSite` attribute (CSRF risk)

**Files:** `src/app/api/auth/verify-otp/route.js` and `src/proxy.js`

**Problem:**  
The cookies set in `verify-otp/route.js` do not have a `sameSite` attribute. Without it, browsers default to `Lax` in most cases but it's not guaranteed across all browsers and configurations, leaving a potential CSRF vector.

The proxy (`proxy.js` line 100–101) does set `sameSite: 'lax'` on rotated cookies — this is inconsistent with the initial cookie creation.

**Fix:** Add `sameSite: 'lax'` to both cookies in `verify-otp/route.js` so cookie attributes are consistent from first creation through all rotations.

**One-file rule:** Change only `src/app/api/auth/verify-otp/route.js`.

---

### [SEC-4] `useApiClient` reads `accessToken` from JavaScript-accessible cookie (XSS attack surface)

**File:** `src/hooks/useApiClient.js`

**Problem:**  
The hook uses `document.cookie` to read the `accessToken` and sends it as an `Authorization: Bearer` header. If the access token cookie is `httpOnly` (the fix from SEC-2), this hook will break — which is actually the correct behaviour. But the current code creates a *second path* for the token to be read and sent, bypassing the server's middleware-based auth.

More importantly: the `Authorization: Bearer` header sent by the client is **never actually checked** by most API routes. The routes read `x-user-id` from the proxy-injected header. This hook sends a token that goes nowhere — it's dead code that creates a misleading security surface.

**Fix:** Remove the `Authorization` header logic from `useApiClient.js`. API routes that need auth are already protected by the middleware proxy which injects `x-user-id`. The hook should just be a simple `fetch` wrapper.

```js
// SIMPLIFIED useApiClient.js
export function useApiClient() {
  const apiClient = useCallback(async (url, options = {}) => {
    return fetch(url, { ...options, credentials: 'include' });
  }, []);
  return apiClient;
}
```

**One-file rule:** Change only `src/hooks/useApiClient.js`.

---

### [SEC-5] OTP stored in plaintext in the database

**File:** `src/app/api/auth/otp/route.js` and `src/models/User.js`

**Problem:**  
The 6-digit OTP is saved directly as a plaintext string on the `User` document (`user.otp = otp`). If your MongoDB is ever compromised, attackers have valid OTPs. OTPs should be hashed before storage.

**Fix:** Hash the OTP with SHA-256 before saving it, and compare the hash of the submitted OTP during verification.

In `otp/route.js` (generation):
```js
import { sha256 } from '@/lib/utils';
// ...
user.otp = sha256(otp); // Store hashed OTP
```

In `verify-otp/route.js` (verification):
```js
import { sha256 } from '@/lib/utils';
// ...
if (!user || user.otp !== sha256(otp) || Date.now() > user.otpExpires) { ... }
```

**One-file rule:** Two files change, but they are the two ends of one flow (generate & verify). The `sha256` helper already exists in `src/lib/utils.js` — no new utility needed.

---

### [SEC-6] Stripe webhook operates without a verified secret

**File:** `src/app/api/webhooks/stripe/route.js` (line 17–26)  
**File:** `.env.local` (line 8)

**Problem:**  
`STRIPE_WEBHOOK_SECRET` is commented out in `.env.local`. This means `stripe.webhooks.constructEvent(...)` is called with `undefined` as the secret. Stripe's SDK will either throw or fail silently, meaning **any POST to `/api/webhooks/stripe` can forge a subscription upgrade without a real payment.**

This is a critical revenue bypass — anyone can POST a fake `checkout.session.completed` event and get a free subscription.

**Fix:**
1. Get the webhook signing secret from your Stripe Dashboard → Developers → Webhooks.
2. Add it to `.env.local`: `STRIPE_WEBHOOK_SECRET=whsec_...`
3. Add a startup guard in `src/lib/stripe.js` (or a new `src/lib/stripeWebhook.js`):
   ```js
   if (!process.env.STRIPE_WEBHOOK_SECRET) {
     throw new Error('STRIPE_WEBHOOK_SECRET is missing!');
   }
   ```

**One-file rule:** Set the env var in `.env.local`. The guard can be added to `src/lib/stripe.js` (already has a similar pattern for `STRIPE_SECRET_KEY`).

---

### [SEC-7] `/api/admin/users` route is NOT protected by middleware

**File:** `src/app/api/admin/users/route.js` (lines 15–19 — the comment even documents this!)

**Problem:**  
The middleware `config.matcher` in `src/proxy.js` (line 127) includes `/admin/:path*` but **not** `/api/admin/:path*`. The admin API route at `/api/admin/users` is therefore not intercepted by the auth middleware and has no `x-user-id` injected. The route's own comment acknowledges this gap. The route does its own token check as a workaround, but this is inconsistent and easy to miss for future admin routes.

**Fix:** Add `/api/admin/:path*` to the matcher in `src/proxy.js`:

```js
export const config = {
  matcher: [
    '/api/:path*',
    '/dashboard/:path*',
    '/profile/:path*',
    '/onboarding/:path*',
    '/admin/:path*',
    '/login',
    '/resume-history/:path*',
    '/checkout/:path*',
  ],
};
```

`/api/:path*` is already in the matcher (`isProtectedApiRoute` logic handles it), but verify that `/api/admin` isn't accidentally caught by `isPublicApiRoute`. It isn't — so adding to the matcher is the only needed change.

**One-file rule:** Change only `src/proxy.js` — update the `config.matcher` export.

---

### [SEC-8] Token expiry is inconsistent — JWT says `5m`, cookie says `5m`, but `constants.js` says `15m`

**Files:** `src/lib/utils.js` (line 17), `src/app/api/auth/verify-otp/route.js` (line 56), `src/lib/constants.js` (line 224)

**Problem:**  
There are **three different places** defining the access token lifetime:
- `TOKEN_CONFIG.ACCESS_TOKEN_EXPIRY = '15m'` in `constants.js` — not used anywhere!
- `generateAccessToken` in `utils.js` hardcodes `.setExpirationTime('5m')`
- The cookie `maxAge` in `verify-otp/route.js` hardcodes `5 * 60` (5 minutes)
- The cookie `maxAge` in `proxy.js` (line 100) also hardcodes `5 * 60`

The constant exists but is completely ignored. If you ever want to change the access token expiry, you have to find and update 3+ places manually.

Similarly `REFRESH_TOKEN_EXPIRY_DAYS = 15` in constants, but `verify-otp/route.js` line 29 hardcodes `15 * 24 * 60 * 60` independently.

**Fix:** Use `TOKEN_CONFIG` from `constants.js` everywhere:

In `src/lib/utils.js`:
```js
import { TOKEN_CONFIG } from '@/lib/constants';
// ...
.setExpirationTime(TOKEN_CONFIG.ACCESS_TOKEN_EXPIRY) // '15m' or '5m' — one place to change
```

In `src/app/api/auth/verify-otp/route.js`:
```js
import { TOKEN_CONFIG } from '@/lib/constants';
const refreshTokenMaxAge = TOKEN_CONFIG.REFRESH_TOKEN_EXPIRY_MS / 1000;
// cookie maxAge: TOKEN_CONFIG.ACCESS_TOKEN_EXPIRY_SECONDS (add this to constants)
```

Add to `constants.js`:
```js
export const TOKEN_CONFIG = {
  ACCESS_TOKEN_EXPIRY: '15m',
  ACCESS_TOKEN_EXPIRY_SECONDS: 15 * 60,
  REFRESH_TOKEN_EXPIRY_DAYS: 15,
  REFRESH_TOKEN_EXPIRY_MS: 15 * 24 * 60 * 60 * 1000,
  TYPE_ACCESS: 'access',
  TYPE_REFRESH: 'refresh',
};
```

**One-file rule:** Add the missing constants to `src/lib/constants.js`. Then update `src/lib/utils.js` and `src/app/api/auth/verify-otp/route.js` to import from constants. Three files, but `constants.js` becomes the **one** source of truth for all future changes.

---

## 🟠 IMPORTANT — Architecture & Code Separation Issues

---

### [ARCH-1] `/api/user/profile` bypasses the middleware auth pattern

**File:** `src/app/api/user/profile/route.js`

**Problem:**  
This is the only API route that independently calls `verifyAuth(...)` and reads tokens from cookies directly — bypassing the middleware proxy that injects `x-user-id`. Every other protected API route reads `req.headers.get('x-user-id')`. This route is a separate, parallel auth path that:
- Is harder to maintain (auth changes in the middleware must also be copied here)
- Does not benefit from token rotation (cookies aren't updated in the response)
- Creates confusion: "why does this route work differently?"

**Fix:** The profile route should follow the same pattern as all other routes — read `x-user-id` from headers. Move the `/api/user/profile` route so it is covered by the middleware matcher (it already is via `/api/:path*`) and remove the manual `verifyAuth` call.

```js
// BEFORE (profile/route.js)
const authResult = await verifyAuth({ accessToken, refreshToken }, reqInfo);
if (authResult.ok) { const userId = authResult.userId; ... }

// AFTER (profile/route.js)
const userId = req.headers.get('x-user-id');
if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
// proceed directly
```

**One-file rule:** Change only `src/app/api/user/profile/route.js`.

---

### [ARCH-2] `/api/checkout/create-session` does its own manual token verification

**File:** `src/app/api/checkout/create-session/route.js` (lines 15–24)

**Problem:**  
This route manually reads the `Authorization: Bearer` header OR falls back to the `accessToken` cookie and calls `verifyToken()` directly. This is a third distinct auth pattern in the codebase (middleware inject → profile manual verify → checkout manual verify).

The comment in the code even says: *"Note: In a real app, use a robust way to get user from session/token"* — this is the hint that it was never properly integrated.

**Fix:** Remove all manual token logic and read `x-user-id` from headers (injected by middleware), matching every other protected route.

```js
// BEFORE
let token = req.headers.get('authorization')?.split(' ')[1];
if (!token) { token = req.cookies.get('accessToken')?.value; }
const payload = await verifyToken(token, 'access');
const userId = payload.userId;

// AFTER
const userId = req.headers.get('x-user-id');
if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
```

**One-file rule:** Change only `src/app/api/checkout/create-session/route.js`.

---

### [ARCH-3] `subscriptionChecker.js` uses `console.log` instead of `logger`

**File:** `src/lib/subscriptionChecker.js` (line 25)

**Problem:**  
The entire project uses the centralized `logger` service (`src/lib/logger.js`), but `subscriptionChecker.js` has a stray `console.log`. This breaks the "single place to change logging" principle — if you switch to a remote logging service, this line will be missed.

```js
// Line 25 - CURRENT
console.log(`⏰ User ${user._id} subscription expired, downgraded to USER (role 100)`);
```

**Fix:**
```js
import { logger } from '@/lib/logger';
// ...
logger.info('User subscription expired, downgraded to USER', { userId: user._id });
```

**One-file rule:** Change only `src/lib/subscriptionChecker.js`.

---

### [ARCH-4] Stripe webhook uses raw `console.log/error` throughout

**File:** `src/app/api/webhooks/stripe/route.js`

**Problem:**  
The webhook handler has 15+ `console.log`, `console.warn`, and `console.error` calls (lines 22, 24, 33, 39, 48, 63, 70, 73, 93, 94, 96, etc.) instead of using the project's `logger`. This is critical for a webhook handler since payment events are exactly the type of events you want in a structured, searchable audit log.

**Fix:** Replace all `console.*` calls with `logger.info`, `logger.warn`, `logger.error` from `@/lib/logger`. This also means payment events automatically get ISO timestamps, structured JSON format, and can be routed to a database in the future by changing only `logger.js`.

**One-file rule:** Change only `src/app/api/webhooks/stripe/route.js`.

---

### [ARCH-5] `verify-otp/route.js` has hardcoded magic numbers for token expiry

**File:** `src/app/api/auth/verify-otp/route.js` (line 29)

**Problem:**  
```js
const refreshTokenExpirationSeconds = 15 * 24 * 60 * 60; // 15 days in seconds
```
This is duplicated from `TOKEN_CONFIG.REFRESH_TOKEN_EXPIRY_MS` in `constants.js`. If the refresh token lifetime changes, it must be updated in both places. (Covered partly by SEC-8 — address together.)

---

### [ARCH-6] `verify-token` route leaks internal error messages to clients

**File:** `src/app/api/auth/verify-token/route.js` (line 32)

**Problem:**  
```js
return NextResponse.json({ error: error.message || 'Token verification failed' }, { status: 401 });
```
`error.message` from internal JWT errors or DB errors gets sent directly to the client. This can leak information about your internal implementation ("User not found", "Expired refresh token", "jwt malformed", etc.).

**Fix:** Use a generic message for the client while logging the real error server-side:
```js
logger.error('Token rotation failed', error);
return NextResponse.json({ error: 'Authentication failed' }, { status: 401 });
```

**One-file rule:** Change only `src/app/api/auth/verify-token/route.js`.

---

### [ARCH-7] `PermissionGate` fails open when `user` or `permission` is missing

**File:** `src/components/common/PermissionGate.js` (lines 27–30)

**Problem:**  
```js
// If no user or no permission specified, render children (fail open for UX, API will block)
if (!user || !permission) {
  return children; // ← Renders protected content if user is null
}
```
The comment says "API will block" — which is true, but this is a UI security smell. If a page forgets to pass `user`, the gated content becomes visible. A developer looking at the UI might mistakenly believe the user has access and then proceed to add additional UI logic based on that assumption.

**Fix:** Fail closed by default — render nothing if user is missing. Only fail open if there's no `permission` (meaning the gate is not configured yet):
```js
if (!permission) return children; // Gate not configured, pass through
if (!user) return null;           // No user = deny, don't render gated UI
```

**One-file rule:** Change only `src/components/common/PermissionGate.js`.

---

### [ARCH-8] `serverAuth.js` passes hardcoded strings as `ip` and `userAgent` for server actions

**File:** `src/lib/serverAuth.js` (lines 21)

**Problem:**  
```js
{ ip: 'server-action', userAgent: 'server-action' }
```
These are stored in the `RefreshToken` document in MongoDB every time a server action rotates a token, polluting the audit trail with meaningless values. The token rotation records will show all server-action refreshes as coming from the same fake IP/UA.

**Fix:** Pass `null` or omit these fields for server actions, and update the `rotateRefreshToken` function to handle optional `ip` / `userAgent`:
```js
await getAuthenticatedUser(); // internally passes { ip: null, userAgent: 'server' }
```

**One-file rule:** Change only `src/lib/serverAuth.js` — update the `reqInfo` object.

---

## 🟡 IMPROVEMENT — Maintainability & Future-Proofing

---

### [MAINT-1] OTP expiry duration is hardcoded in two places

**File:** `src/app/api/auth/otp/route.js` (line 15)

**Problem:**  
```js
const otpExpires = Date.now() + 5 * 60 * 1000; // 5 minutes
```
This magic number (5 minutes) is not in `constants.js`. If you want to change OTP validity (e.g., to 10 minutes), you'd need to know to look inside this route file.

**Fix:** Add to `constants.js`:
```js
export const OTP_CONFIG = {
  EXPIRY_MS: 5 * 60 * 1000, // 5 minutes
  LENGTH: 6,
};
```
Then use `OTP_CONFIG.EXPIRY_MS` in `otp/route.js`.

**One-file rule:** Add constants to `src/lib/constants.js`. The OTP route imports them.

---

### [MAINT-2] Gemini model name is hardcoded in `geminiService.js`

**File:** `src/services/geminiService.js` (lines 17, 21)

**Problem:**  
```js
getGeminiClient().getGenerativeModel({ model: "gemini-pro" })
getGeminiClient().getGenerativeModel({ model: "gemini-flash-latest" })
```
Model names are hardcoded strings scattered in functions. If Google deprecates a model, you'd need to hunt through all callers.

**Fix:** Add model constants to `constants.js` or `geminiService.js` itself:
```js
const GEMINI_MODELS = {
  PRO: 'gemini-1.5-pro-latest',
  FLASH: 'gemini-1.5-flash-latest',
};
```

**One-file rule:** Change only `src/services/geminiService.js` — add the constants at the top and use them below. All callers use `getGeminiModel()` / `getGeminiFlashModel()` already, so they don't need to change.

---

### [MAINT-3] `check-subscription` API is called on EVERY request via proxy — potential performance issue

**File:** `src/proxy.js` (lines 52–75)

**Problem:**  
For every single authenticated request (page load, API call, etc.), the proxy makes an **additional HTTP call** to `/api/auth/check-subscription` which hits MongoDB to check if the subscription expired. This means every request results in at least 2 DB queries (token rotation + subscription check).

For most requests, the subscription won't have expired. This is unnecessary overhead on every request.

**Fix (suggested approach):** Instead of checking every request, embed the subscription expiry timestamp inside the JWT access token payload at generation time. On each request, the middleware just reads the expiry from the already-verified token — zero extra DB query.

Or as a simpler short-term fix: only run the subscription check once per session (e.g., store a `subscriptionChecked` flag in a short-lived cookie).

**One-file rule for short-term fix:** Change only `src/proxy.js` — add a guard to skip the check if a `subChecked` cookie is present and not expired.

---

### [MAINT-4] `mongodb.js` has no connection error handling or reconnection logic

**File:** `src/lib/mongodb.js`

**Problem:**  
If the initial MongoDB connection fails, `cached.promise` rejects and is never cleared. Any subsequent call to `dbConnect()` will return the same rejected promise forever (until the server restarts), causing all DB operations to silently fail with a confusing error.

**Fix:**
```js
if (!cached.promise) {
  cached.promise = mongoose.connect(MONGODB_URI, opts).catch((err) => {
    cached.promise = null; // ← Clear so it retries next call
    throw err;
  });
}
```

**One-file rule:** Change only `src/lib/mongodb.js`.

---

### [MAINT-5] `refreshToken` model is missing a TTL index for automatic expiry cleanup

**File:** `src/models/refreshToken.js`

**Problem:**  
The `expiresAt` field is checked in application code, but there's no MongoDB TTL index to automatically delete expired tokens. Over time, the `refreshtokens` collection will grow indefinitely with expired records that are never cleaned up, which is both a storage and privacy concern.

**Fix:** Add a TTL index to the schema:
```js
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
```
MongoDB will automatically delete documents when `expiresAt` is in the past.

**One-file rule:** Change only `src/models/refreshToken.js`.

---

### [MAINT-6] `auth.js` uses a dynamic `import()` inside a hot function path

**File:** `src/lib/auth.js` (lines 65, 121)

**Problem:**  
```js
const User = (await import('@/models/User')).default;     // line 65
const { verifyToken } = await import('@/lib/utils');      // line 121
```
Dynamic imports inside `rotateRefreshToken` and `verifyAuth` — functions called on every authenticated request — are unnecessary. These modules don't have circular dependency issues that would require lazy loading. Static imports at the top of the file are resolved once; dynamic imports re-evaluate the import statement every call.

**Fix:** Move these to static imports at the top of `auth.js`:
```js
import User from '@/models/User';
import { verifyToken, hashToken, generateAccessToken, generateRefreshToken } from '@/lib/utils';
```

**One-file rule:** Change only `src/lib/auth.js`.

---

## 📋 Summary Priority Order

| # | ID | Severity | Description | File(s) to Change |
|---|-----|----------|-------------|-------------------|
| 1 | SEC-1 | 🔴 Critical | Rotate exposed secrets, strengthen JWT secrets | `.env.local` |
| 2 | SEC-6 | 🔴 Critical | Add Stripe webhook secret (revenue bypass) | `.env.local`, `src/lib/stripe.js` |
| 3 | SEC-2 | 🔴 Critical | `accessToken` cookie not `httpOnly` | `src/app/api/auth/verify-otp/route.js` |
| 4 | SEC-7 | 🔴 Critical | `/api/admin/*` not covered by middleware | `src/proxy.js` |
| 5 | SEC-4 | 🔴 High | `useApiClient` reads cookie via JS (XSS risk) | `src/hooks/useApiClient.js` |
| 6 | SEC-5 | 🔴 High | OTP stored in plaintext | `src/app/api/auth/otp/route.js` + `verify-otp/route.js` |
| 7 | SEC-8 | 🟠 High | Token expiry defined in 3 places | `src/lib/constants.js` + 2 consumers |
| 8 | SEC-3 | 🟠 Medium | Cookies missing `sameSite` | `src/app/api/auth/verify-otp/route.js` |
| 9 | ARCH-1 | 🟠 Medium | `/api/user/profile` has its own auth path | `src/app/api/user/profile/route.js` |
| 10 | ARCH-2 | 🟠 Medium | `/api/checkout/create-session` has its own auth path | `src/app/api/checkout/create-session/route.js` |
| 11 | ARCH-6 | 🟠 Medium | Internal errors leaked to client | `src/app/api/auth/verify-token/route.js` |
| 12 | ARCH-4 | 🟠 Medium | Webhook uses `console.*` not `logger` | `src/app/api/webhooks/stripe/route.js` |
| 13 | ARCH-7 | 🟡 Low | `PermissionGate` fails open when user is null | `src/components/common/PermissionGate.js` |
| 14 | ARCH-3 | 🟡 Low | `subscriptionChecker` uses `console.log` | `src/lib/subscriptionChecker.js` |
| 15 | ARCH-8 | 🟡 Low | Fake IP/UA stored in token audit log | `src/lib/serverAuth.js` |
| 16 | MAINT-5 | 🟡 Low | No TTL index on refresh tokens | `src/models/refreshToken.js` |
| 17 | MAINT-6 | 🟡 Low | Dynamic imports in hot path | `src/lib/auth.js` |
| 18 | MAINT-4 | 🟡 Low | MongoDB no retry on failed connection | `src/lib/mongodb.js` |
| 19 | MAINT-1 | 🟡 Low | OTP expiry hardcoded | `src/lib/constants.js` + `otp/route.js` |
| 20 | MAINT-2 | 🟡 Low | Gemini model names hardcoded | `src/services/geminiService.js` |
| 21 | MAINT-3 | 🟡 Low | Subscription checked on every request | `src/proxy.js` |

---

## ✅ What's Already Done Well

- **Refresh token rotation** — tokens are invalidated after use, and all tokens for a user are wiped if a stolen token is detected. This is textbook secure token rotation.
- **Refresh tokens are hashed** — only SHA-256 hashes stored in DB, raw token only ever in cookies.
- **`requirePermission` + `isPermissionError` pattern** — most API routes use this consistently.
- **Centralized `logger.js`** — good design, just needs to be used everywhere consistently.
- **`TOKEN_CONFIG` in `constants.js`** — the right idea, just not wired up yet.
- **Service layer pattern** — `ResumeService`, `UserService`, `SubscriptionService` all properly separate business logic from routes.
- **Atomic credit deduction** — `subscriptionService.trackUsage` uses `findOneAndUpdate` with a condition to prevent race conditions. Solid.
- **`PermissionGate` component** — clean abstraction for UI-level permission rendering.
