# Suggestions Log

## 🟢 Improvements

- **2026-08-22** — Audit remediation pass: ALL critical/high/medium findings from the 2026-08-22 audit fixed in one batch (billing correctness, permission-check args, downgrade credit leak, skills normalization, refresh-rotation grace window, dead server actions deleted, logout revocation, OTP hardening, AI runner timeouts/retries, rate limiting, env boot validation, etc.). Verified: `npm run lint` 0 errors (2 accepted warnings), `npm run build` passes. Details in `docs/audit.md`.
- **2026-08-22 (follow-ups)** — Ideas surfaced while fixing:
  - Move the in-memory rate limiter (`src/lib/rateLimit.js`) to Redis when scaling beyond one instance; same for the OTP per-IP throttle.
  - One-time data migration script: lowercase existing user emails + backfill-clear stale `subscriptionId` on non-subscriber users (H2/M1 cleanup for legacy rows).
  - Add integration tests for checkout flow (both plan-name casings) and PDF template rendering with schema-shaped skills — these would have caught C1/C2/H3.
  - Replace remaining `alert()`s in admin dashboard & download buttons with toasts (accepted polish).
- **2026-08-22** — Full deep-dive audit completed → see `docs/audit.md` (2 critical incl. broken Stripe checkout from Pricing/Profile pages, 8 high incl. always-failing "save as new" permission check + Pro-limit leak after downgrade + blank Skills in 4 templates, 15 medium, 13 low; fix order at bottom of that file).

- **2026-08-21** — Full site audit completed → see `docs/audit.md` (1 critical IDOR in edit-resume-with-ai, 11 high incl. broken nav links + onboarding auth flow + seed permission drift; fix order at bottom of that file).

- **2026-08-21** — Job automation feature + API key management archived from live site into root `automation/` folder (UI pages, API routes, gatekeeper endpoint, 9 models, worker service). Navbar `/automation` links removed. Kept `apiKeyAuth.js`/`ApiKey`/`DailyCount` models since `resolveUserId()` dual-auth is used by active routes. Build verified passing after removal.

## 🔴 Vulnerabilities

- **2026-08-21** — `worker/src/config.js`: `validateConfig()` does not require `DEEPSEEK_API_KEY`, yet the entire apply stage silently no-ops without it. Enforce it at boot.

## 🟡 New Features

- **2026-08-21** — Worker notifications (`worker/src/notifications/index.js`) are a logging stub: implement the actual Resend SDK send when `RESEND_API_KEY` is set.
- **2026-08-21** — `POST /trigger/pause` is a placeholder; implement real queue pausing (e.g., pause BullMQ workers or suspend the scheduler).

## 🟢 Improvements

- **2026-08-21** — `worker/src/queue/processors/apply.processor.js` re-reads `RESUME_BUILDER_URL` / `RESUME_BUILDER_API_KEY` directly from `process.env` instead of using the shared `config` object — consolidate.
- **2026-08-21** — `SAFETY_RULES` in `worker/src/automation/anti-detection.js` (40/day, 8/hour caps, timing ranges) are declarative only; wire them into the processors so rate caps are actually enforced.
- **2026-08-21** — Dead/dormant code: `worker/src/scraper/index.js` aggregator and `worker/src/automation/linkedin-apply.js` are not imported by any processor — either wire up LinkedIn applying or remove.
- **2026-08-21** — Docs relocated per convention: root `architecture.md` → `docs/architecture.md`, root `TODO.md` → `docs/to-do.md`. Stale absolute paths (`/Users/sukhjot/codes/untitled folder 2/...`) fixed to relative paths; worker + env-var sections added.
