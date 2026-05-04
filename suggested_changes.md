# Suggested Changes & Improvements

> **Audit Scope:** Security, token handling/storage, code separation, maintainability.
> **Principle:** Every suggestion is scoped so that ONE file change propagates everywhere it is used.

---

## ⏳ PENDING — Stripe (Do When Stripe Is Ready)

These items touch Stripe functionality which is still in progress. Revisit once Stripe integration is complete.

---

### [SEC-6] Stripe webhook operates without a verified secret

**File:** `src/lib/stripe.js` + `.env.local`

**Problem:**  
`STRIPE_WEBHOOK_SECRET` is commented out in `.env.local`. `stripe.webhooks.constructEvent(...)` is called with `undefined` — meaning **any POST to `/api/webhooks/stripe` can forge a subscription upgrade without a real payment.** This is a critical revenue bypass.

**Fix:**

1. Get the webhook signing secret from Stripe Dashboard → Developers → Webhooks.
2. Add to `.env.local`: `STRIPE_WEBHOOK_SECRET=whsec_...`
3. Add a startup guard in `src/lib/stripe.js`:
   ```js
   if (!process.env.STRIPE_WEBHOOK_SECRET) {
     throw new Error("STRIPE_WEBHOOK_SECRET is missing!");
   }
   ```

**One-file rule:** Set env var in `.env.local`. Guard goes in `src/lib/stripe.js`.

---

### [ARCH-4] Stripe webhook uses raw `console.*` throughout

**File:** `src/app/api/webhooks/stripe/route.js`

**Problem:**  
The webhook handler has 15+ `console.log/warn/error` calls instead of the project's `logger`. Payment events are exactly the type of events that need structured, searchable audit logging.

**Fix:** Replace all `console.*` calls with `logger.info`, `logger.warn`, `logger.error` from `@/lib/logger`.

**One-file rule:** Change only `src/app/api/webhooks/stripe/route.js`.

---

### [MAINT-3] Subscription checked on EVERY request — potential DB overhead

**File:** `src/proxy.js`

**Problem:**  
For every authenticated request, the proxy makes an additional HTTP call to `/api/auth/check-subscription` which hits MongoDB. Most of the time the subscription hasn't changed.

**Fix (short-term):** Add a short-lived `subChecked` cookie so the check only runs once per session rather than per-request. Or embed subscription expiry in the JWT payload.

**One-file rule:** Change only `src/proxy.js`.

---

<!-- also  -->

<!--  -->

make it so that more than 1 device login is allowed
right now it is not allowing multiple device login it will logout from other device on login from other device

<!--  -->

delete users

<!--  -->

all the controls abouts permissions can be done from the admin dashboard
the permissions should be stored in the database and should be checked before performing any action right now the permissions are hardcoded in the constants.js file but before doing it make sure we are using proper method to check permissions or can we use a more better approach for it .

<!--  -->

everything like prompts , limits , templates , etc should be controlled from the admin dashboard and they should be stored in the database and should be checked before performing any action right now the prompts , limits , templates , etc are hardcoded in the constants.js file but before doing it make sure we are using proper method to check permissions or can we use a more better approach for it .

<!--  -->

for more things that might need to be changed constantly , we should have a proper way to change it right now everthing is hardcorded it should be stored in db and can be edited from the admin dashboard and make sure it is done in the proper way and if can be done using a better approach let me know.

<!--  -->

<!--  -->

## ✅ COMPLETED

All items below have been implemented.

| ID      | Description                                                                 | File Changed                                                  |
| ------- | --------------------------------------------------------------------------- | ------------------------------------------------------------- |
| SEC-1   | Deleted `.env` with real secrets; `.env.local` is local-only                | `.env` deleted                                                |
| SEC-2   | `accessToken` cookie now has `httpOnly: true`                               | `verify-otp/route.js`                                         |
| SEC-3   | All cookies now have `sameSite: 'lax'` consistently                         | `verify-otp/route.js`                                         |
| SEC-4   | `useApiClient` no longer reads cookies via JS or sends Bearer token         | `useApiClient.js`                                             |
| SEC-5   | OTP hashed with SHA-256 before DB storage; hash compared on verify          | `otp/route.js` + `verify-otp/route.js`                        |
| SEC-7   | `/api/:path*` in middleware matcher covers `/api/admin/*`                   | `proxy.js`                                                    |
| SEC-8   | Token expiry unified in `TOKEN_CONFIG` — one place to change                | `constants.js`, `utils.js`, `verify-otp/route.js`, `proxy.js` |
| ARCH-1  | `/api/user/profile` now reads `x-user-id` from middleware header            | `profile/route.js`                                            |
| ARCH-2  | `/api/checkout/create-session` now reads `x-user-id` from middleware header | `create-session/route.js`                                     |
| ARCH-3  | `subscriptionChecker` uses `logger` instead of `console.log`                | `subscriptionChecker.js`                                      |
| ARCH-6  | `verify-token` route no longer leaks internal error messages to client      | `verify-token/route.js`                                       |
| ARCH-7  | `PermissionGate` fails closed when user is null                             | `PermissionGate.js`                                           |
| ARCH-8  | `serverAuth.js` passes `null` IP instead of fake `'server-action'` string   | `serverAuth.js`                                               |
| MAINT-1 | OTP expiry defined in `OTP_CONFIG` constant                                 | `constants.js` + `otp/route.js`                               |
| MAINT-2 | Gemini model names defined as constants in `geminiService.js`               | `geminiService.js`                                            |
| MAINT-4 | MongoDB connection clears failed promise so next call retries               | `mongodb.js`                                                  |
| MAINT-5 | TTL index on `refreshToken.expiresAt` for automatic cleanup                 | `refreshToken.js`                                             |
| MAINT-6 | Removed dynamic `import()` calls from hot-path auth functions               | `auth.js`                                                     |
