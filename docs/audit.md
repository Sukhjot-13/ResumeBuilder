# Site Audit — Open Items

> The full 2026-08-22 deep-dive audit found 2 critical, 8 high, 15 medium, and 13 low findings.
> **All critical/high/medium findings and all but two low items were fixed on 2026-08-22**
> (local commit `acd747a`): plan-key mismatch + PRO-only billing guard, permission-check args,
> downgrade credit leak, skills normalization in templates, refresh-rotation grace window,
> dead server actions deleted, logout revocation, OTP hardening, AI runner timeouts/retries,
> rate limiting, env boot validation, and more.
>
> Superseded detail is in git history (`docs/audit.md` before this rewrite). This file tracks
> what was open afterwards — most of which has since been completed (see statuses).

**Scope of original review:** Full-codebase review of the active site (`src/`): auth/session flow,
Stripe billing & credits, permissions, every API route, all pages/components/hooks, PDF templates,
AI stack, and data schema consistency. Verified with `npm run lint`, `npm test`, `npm run build`.

---

## Open Items

### 🔴 Action Required (manual)
1. **Rotate archived worker secrets at their providers** (DeepSeek, Resend, etc.) — the local
   `automation/worker/.env` file was deleted on 2026-08-22; rotation in the provider dashboards is
   the only remaining manual step. ⬜ manual

### 🟠 Follow-ups
1. ✅ **DONE 2026-08-22** — Legacy-data migration: `scripts/backfill-users.mjs` lowercases user emails
   and clears stale `subscriptionId` on non-subscribers (idempotent, `--dry-run` supported).
   Applied to the database: 0 email casing conflicts, 2 stale subscriptionIds cleared.
2. ✅ **DONE 2026-08-22** — Automated tests: Vitest set up (`npm test`) with three suites / 15 tests:
   plan resolution for checkout (both casings — C1 regression), skills normalization across every
   historical shape (H3 regression), and real PDF rendering of all 6 templates with schema-shaped
   skills + text extraction assertions. Run via `npx vitest run`; config in `vitest.config.js`.
3. ✅ **DONE 2026-08-22** — All `alert()`s replaced with a shared toast system
   (`src/components/common/ToastProvider.js`, mounted app-wide in `layout.js`). `confirm()` guards
   intentionally retained for destructive actions.

### 🟡 Accepted As-Is (documented, not bugs)
1. Exhaustive-deps lint warnings (fetch-on-mount patterns; currently 2) — intentional; lint otherwise 0 errors.
2. Mixed response envelopes (list/detail GETs unwrapped, mutations enveloped) — deliberate convention, see `docs/architecture.md` → `apiResponse.js`.
3. Index keys on bullet-list inputs in ManualResumeForm — cosmetic.
4. Next.js 16.3.2 upgrade — staging regression pass still pending before deploy. ⬜ needs staging environment

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
  automated regression tests for billing plan resolution, skills rendering, and PDF output;
  lint 0 errors; build clean.
