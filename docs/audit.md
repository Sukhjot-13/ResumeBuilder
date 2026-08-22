# Site Audit — Open Items

> The full 2026-08-22 deep-dive audit found 2 critical, 8 high, 15 medium, and 13 low findings.
> **All critical/high/medium findings and all but two low items were fixed on 2026-08-22**
> (local commit `acd747a`): plan-key mismatch + PRO-only billing guard, permission-check args,
> downgrade credit leak, skills normalization in templates, refresh-rotation grace window,
> dead server actions deleted, logout revocation, OTP hardening, AI runner timeouts/retries,
> rate limiting, env boot validation, and more.
>
> Superseded detail is in git history (`docs/audit.md` before this rewrite). This file now tracks
> **only what is still open**, plus items accepted as-is.

**Scope of original review:** Full-codebase review of the active site (`src/`): auth/session flow,
Stripe billing & credits, permissions, every API route, all pages/components/hooks, PDF templates,
AI stack, and data schema consistency. Verified with `npm run lint` (0 errors, 2 accepted warnings)
and `npm run build` (passes).

---

## ⬜ Open Items

### 🔴 Action Required (manual)
1. **Rotate archived worker secrets**, then delete `automation/worker/.env` (gitignored, never committed).

### 🟠 Follow-ups (recommended)
1. **Legacy-data migration** — lowercase existing user emails (M1 fix only normalizes new writes) and backfill-clear stale `subscriptionId` on non-subscriber users so the H2 credit-limit fix covers pre-fix rows.
2. **Automated tests** — no unit/e2e tests exist. Regressions like the old C1/H1/H3 are exactly what a few integration tests would catch (checkout with both plan-name casings; PDF template rendering with schema-shaped skills).
3. **Replace remaining `alert()`s** in admin dashboard and download buttons with toasts/modals (dashboard payment flow already converted to an inline banner).

### 🟡 Accepted As-Is (documented, not bugs)
1. Exhaustive-deps lint warnings (fetch-on-mount patterns; currently 2) — intentional; lint otherwise 0 errors.
2. Mixed response envelopes (list/detail GETs unwrapped, mutations enveloped) — deliberate convention, see `docs/architecture.md` → `apiResponse.js`.
3. Index keys on bullet-list inputs in ManualResumeForm — cosmetic.
4. Next.js 16.3.2 upgrade — staging regression pass still pending before deploy.

---

## ✅ What's solid (verified during the 2026-08-22 audit)

- Magic-byte verification + MIME allowlist + size cap on resume uploads; template allowlist before
  dynamic import (now imports the validated id); byte-measured body-size guards (`readJson`) on
  AI/PDF routes.
- Deduct-first/refund-on-failure credit accounting with atomic `$inc` conditions; negative-credit
  clamp on refunds/admin adjustments; parse-resume now metered too.
- Ownership-scoped resume/cover-letter CRUD in the live API routes (IDOR fixes holding).
- Stripe webhook: signature verification, PRO-only upgrade guard, idempotent transaction upserts,
  paid-through-period cancellation handling, generic error surfaces.
- OTP: hashed storage, atomic attempt counter, resend cooldown + uniform IP+email throttle
  (no account-existence oracle), lockout-forces-new-code, email normalization.
- Auth: JWT `type` claims asserted at verify; refresh rotation has a grace window; logout revokes
  server-side.
- AI stack: provider timeouts, token caps, retry/backoff; prompt-injection sanitization on job
  descriptions and parsed resume text.
- Boot-time env validation (`src/instrumentation.js`); response-envelope convention documented;
  lint 0 errors; build clean.
