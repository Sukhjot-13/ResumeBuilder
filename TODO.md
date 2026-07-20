---

# Master TODO — Consolidated from audit.md, suggested_changes.md, auth.md, a1.md, README.md, plan.md

## 🔴 CRITICAL — Security & Integrity

- [ ] **Fix `x-user-id` Header Spoofing** (`src/proxy.js`) — Always overwrite client-supplied `x-user-id` header with the authenticated value. Currently trusts the incoming header.
- [ ] **Add CSRF Protection** (`src/proxy.js` + `useApiClient.js`) — Double-submit cookie pattern for non-GET API routes.
- [ ] **Sanitise Special Instructions** (`src/api/generate-content/route.js`) — Apply same injection sanitization as job description to `specialInstructions`.
- [ ] **Add OTP Rate Limiting** (`src/app/api/auth/otp/route.js`) — In-memory cache limiting to ~5 requests per email per window.
- [ ] **Strip webhook operates without verified secret** (`src/lib/stripe.js` + `.env.local`) — `STRIPE_WEBHOOK_SECRET` is commented out. Any POST to `/api/webhooks/stripe` can forge subscription upgrades.
- [ ] **Enforce HTTPS in Production** (`src/proxy.js`) — Redirect HTTP to HTTPS when `env.isProduction`.
- [ ] **Add Idempotency for Stripe Webhooks** (`src/app/api/webhooks/stripe/route.js`) — Check for existing transaction by `payment_intent` before creating a new one.
- [ ] **Return 500 on webhook DB failure** (`src/app/api/webhooks/stripe/route.js`) — Currently returns 200 even when DB save fails; Stripe assumes success.

## 🟠 HIGH PRIORITY

### Auth & Access

- [ ] **Stripe webhook uses `console.*` instead of `logger`** (`src/app/api/webhooks/stripe/route.js`) — Replace 15+ `console.log/warn/error` with `logger.info/warn/error`.
- [ ] **Add handler for `invoice.payment_failed`** — Set subscription status to `past_due`, send alert.
- [ ] **Add handler for `invoice.payment_action_required`** — Notify user about payment action needed.
- [ ] **Listen to `customer.subscription.updated`** — Handle period-end cancellations gracefully.
- [ ] **Add Timeouts to Internal `fetch`** (`src/proxy.js`) — AbortController with 5s timeout for internal auth/subscription calls.
- [ ] **Add Retry Logic for AI Calls** (`src/lib/ai/client.js`) — Wrap runner calls with 2 attempts + exponential backoff.
- [ ] **Validate `x-user-id` Header Format** (`src/proxy.js`) — Ensure it's a non-empty string after injection.

### Permissions & Admin Controls

- [ ] **Store configurable settings in DB (prompts, limits, templates)** — Move hardcoded values from constants.js to MongoDB. Editable from admin dashboard.

### Resume / Cover Letter



## 🟡 MEDIUM PRIORITY

### Features & UX

- [ ] **Nav restructure** (`plan.md`) — Create Tools sub-nav layout: Dashboard | Resumes | Cover Letters | AI Edit under `/tools` route group.
- [ ] **Filter job description for special instructions** — Make sure JD sanitization strips premium feature prompts.
- [ ] **Loading spinner during access checks** — Show spinner until everything is loaded on AI edit page.
- [ ] **Edit resume functionality enhancements** — Think about additional features for the AI edit flow.
- [ ] **Add `tax_behavior` to checkout session** (`src/app/api/checkout/create-session/route.js`)
- [ ] **Add promo code support** (optional) to checkout.
- [ ] **Add monitoring/alerts for webhook failures** (`src/app/api/webhooks/stripe/route.js`)

### Infrastructure

- [ ] **Remove unused import** (`src/proxy.js`) — `import crypto from 'crypto'` is unused.
- [ ] **Cache template list** (`src/app/api/resume/templates/route.js`) — 1-hour in-memory TTL.
- [ ] **Add file size limit for uploads** (`src/app/api/parse-resume/route.js`) — Reject files > 5MB.
- [ ] **Use configuration array for public API routes** (`src/proxy.js`) — Replace hardcoded strings with a configurable prefix list.
- [ ] **Use `req.nextUrl.origin` for internal fetch** (`src/proxy.js`) — Cleaner than constructing from headers.
- [ ] **Refactor/remove legacy `Plan` model** (`src/models/plan.js`)

### Architecture Long-Term

- [ ] **Implement Redis for rate limiting & session store** — Replace in-memory OTP limit, store API key rate limits, cache subscription status.
- [ ] **Separate authentication microservice** — Move JWT generation/validation to dedicated service.
- [ ] **Implement structured logging** — Use correlation IDs (X-Request-ID) with centralized log system.
- [ ] **Write integration tests** — Auth (OTP, token rotation), resume generation (credit deduction, AI, save), Stripe webhook, automation API.
- [ ] **Add graceful shutdown** — Close DB connections on `SIGTERM`.

## ⬜ PENDING — DEPLOY / FUTURE

- [ ] **Worker deployment** — Worker to Render/production. Currently only runs locally.
- [ ] **CAPTCHA handling** — Manual intervention only. Could be addressed later.
- [ ] **Profile sync page** — `/automation/settings/profile` — low priority.
- [ ] **Delete users** — Admin ability to delete users from dashboard.

---

*Generated from: `audit.md`, `suggested_changes.md`, `auth.md`, `a1.md`, `README.md`, `plan.md`*
*Files deleted: `README.md`, `plan.md`*
