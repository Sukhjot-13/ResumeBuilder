---

# Master TODO

> Regenerated from the current tree on 2026-09-28 after the security-audit
> remediation. Every item below was re-verified against the code, not carried
> over from a previous list. Closed items live in `docs/audit.md` (status
> tables) and `docs/architecture.md` (per-file notes).

## 🔴 CRITICAL — Security & Integrity

_(none open — the 2026-09-28 audit's three critical/high authorization and
entitlement findings are fixed and covered by tests; see `docs/audit.md`.)_

## 🟠 HIGH PRIORITY

### Auth & Access

- [ ] **Enforce HTTPS in production** (`src/proxy.js`) — Redirect HTTP to HTTPS
      when `env.isProduction`. Still open: no HSTS header and no redirect, so a
      first-visit plaintext request is possible. Depends on TLS termination at
      the host.
- [ ] **Set a CORS policy explicitly** — the app currently relies on the
      *absence* of any `Access-Control-Allow-Origin` header rather than a
      deliberate policy. Combined with the new CSRF allow-list this is defence in
      depth, but an explicit deny-by-default CORS config would make the
      invariant reviewable.

### Billing

- [ ] **Move all entitlement writes to the signed webhook** — `PUT /api/admin/users/[id]/role`
      still grants a manual 30-day Pro window and resets credits on promotion.
      That is an intentional admin capability, but it bypasses Stripe entirely;
      consider an auditable "manual grant" record if it is ever used in anger.

## 🟡 MEDIUM PRIORITY

### Features & UX

- [ ] **Surface `ALLOWED_ORIGINS` misconfiguration** — a wrong value silently
      403s same-origin writes from a second host. Consider logging the effective
      allow-list at boot.
- [ ] **Add `tax_behavior` to the checkout session** (`src/app/api/checkout/create-session/route.js`)
- [ ] **Add promo code support** (optional) to checkout
- [ ] **Add monitoring/alerts for webhook failures** (`src/app/api/webhooks/stripe/route.js`)

### Infrastructure

- [ ] **Replace the in-memory audit/role caches with a shared store** — the role
      snapshot, the AuthorizationEvent writer's dedupe and the OTP throttle are
      per-process, so they do not survive a multi-instance or serverless
      deployment. `invalidateRoleCache()` currently invalidates one process only.
- [ ] **Implement Redis for rate limiting & session store** — replace the in-memory
      OTP limit, store API key rate limits, cache subscription status
- [ ] **Graceful shutdown** — close DB connections on `SIGTERM`

### Architecture Long-Term

- [ ] **Separate authentication microservice** — move JWT generation/validation
      to a dedicated service
- [ ] **Implement structured logging** — correlation ids exist on audit records
      (`X-Request-Id`); they are not yet threaded through every logger call
- [ ] **Integration tests against a real Mongo instance** — current route tests
      mock Mongoose, so query-shape regressions are only caught by inspection

## ⬜ PENDING — DEPLOY / FUTURE

- [ ] **CAPTCHA handling** — manual intervention only; could be addressed later
- [ ] **Rotate archived worker secrets at external providers** (DeepSeek, Resend)
      if the purged automation folder is ever restored

---

## Closed on 2026-09-28 (were listed as open, verified fixed in the tree)

`x-user-id` header spoofing · CSRF protection · special-instruction sanitization ·
OTP rate limiting · Stripe webhook secret verification · webhook idempotency ·
500 on webhook DB failure · `invoice.payment_failed` / `customer.subscription.updated`
handlers · internal-fetch timeouts · AI retry logic · upload size cap ·
`x-forwarded-for` validation · legacy `Plan` model.
