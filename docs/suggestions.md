# Suggestions Log

## 🟢 Improvements

- **2026-09-21 (FIXED):** Login form — email input had no padding (bare `app-input` class sets no padding); added explicit padding/typography. OTP now auto-submits at 6 digits with double-submit guard, digit-only filtering, paste support, code cleared on failure, resend button with 60s cooldown, mobile numeric keyboard + one-time-code autofill.
- **2026-09-21:** Login further ideas (not implemented): per-digit OTP boxes with auto-advance/paste-split; visible 5:00 expiry countdown (code expires in 5 min per OTP_CONFIG); error shake animation + attempt counter ("3 of 5 attempts"); "remember this device" 30-day refresh cookie; magic-link alternative alongside the code.

- **2026-09-11 (FIXED):** `/api/auth/verify-token` and `rotateRefreshToken()` now return `role`, preventing admin users from getting bounced from `/admin/*` to `/dashboard` on access token rotation. Also fixed `verifyTokenEdge` import in `src/proxy.js`.
- **2026-08-22 (evening) — ROOT-CAUSE FIX for "random logouts"**: the app shared generic cookie names (`accessToken` / `refreshToken` / `subCheckedAt`) with ANOTHER localhost project (`finance-app` on port 3000 vs this app on 3002). Cookies are scoped by host, not port, so using both apps clobbered each other's session cookies; each app's JWTs then failed the other's signature verification (`JWSSignatureVerificationFailed` in dev logs) → proxy cleared cookies → forced re-login. Evidence: 3 manual OTP logins in one day with ZERO rotation-created token rows. Fix: app-specific cookie names via new `COOKIE_NAMES` constant (`ats_accessToken`, `ats_refreshToken`, `ats_subCheckedAt`) applied across proxy.js, serverAuth.js, verify-otp and logout routes. Verified end-to-end against live dev server: transparent rotation on expiry, 6-way parallel rotation burst (StrictMode twins), page navs with expired access, foreign cookies ignored, logout revocation + cookie clearing — all pass; lint/tests/build green. One-time effect for existing users: they must log in once more (old-named cookies are simply ignored).
- **2026-08-22** — Audit remediation pass: ALL critical/high/medium findings from the 2026-08-22 audit fixed in one batch (billing correctness, permission-check args, downgrade credit leak, skills normalization, refresh-rotation grace window, dead server actions deleted, logout revocation, OTP hardening, AI runner timeouts/retries, rate limiting, env boot validation, etc.). Verified: `npm run lint` 0 errors (2 accepted warnings), `npm run build` passes. Details in `docs/audit.md`.
- **2026-08-22 (follow-ups — IMPLEMENTED same day):** ✅ Redis-backed rate limiting remains an idea only when scaling beyond one instance (`src/lib/rateLimit.js` + OTP throttle are in-memory). ✅ Data migration shipped as `scripts/backfill-users.mjs` (email casing + stale subscriptionId cleanup) and applied. ✅ Automated tests shipped: Vitest with 15 regression tests (checkout plan resolution, skills normalization, PDF template rendering) via `npm test`. ✅ All `alert()`s replaced by shared toasts (`src/components/common/ToastProvider.js`).
- **2026-08-22** — Full deep-dive audit completed → see `docs/audit.md` (2 critical incl. broken Stripe checkout from Pricing/Profile pages, 8 high incl. always-failing "save as new" permission check + Pro-limit leak after downgrade + blank Skills in 4 templates, 15 medium, 13 low; fix order at bottom of that file).

- **2026-08-21** — Full site audit completed → see `docs/audit.md` (1 critical IDOR in edit-resume-with-ai, 11 high incl. broken nav links + onboarding auth flow + seed permission drift; fix order at bottom of that file).

- **2026-08-21** — Job automation feature + API key management archived from live site into root `automation/` folder (UI pages, API routes, gatekeeper endpoint, 9 models, worker service). Navbar `/automation` links removed. Kept `apiKeyAuth.js`/`ApiKey`/`DailyCount` models since `resolveUserId()` dual-auth is used by active routes. Build verified passing after removal.

## 🔴 Vulnerabilities

- **2026-08-22 (found during logout investigation, not yet fixed):** `rotateRefreshToken()` (`src/lib/auth.js`) resets `supersededAt` to "now" every time a superseded token is re-presented within the 60s grace window — a token replayed at <60s intervals never expires (unbounded session extension for a captured token). Consider keeping the FIRST superseded timestamp (or capping total replays).
- **2026-08-21** — `worker/src/config.js`: `validateConfig()` does not require `DEEPSEEK_API_KEY`, yet the entire apply stage silently no-ops without it. Enforce it at boot.

## 🟡 New Features

- **2026-08-21** — Worker notifications (`worker/src/notifications/index.js`) are a logging stub: implement the actual Resend SDK send when `RESEND_API_KEY` is set.
- **2026-08-21** — `POST /trigger/pause` is a placeholder; implement real queue pausing (e.g., pause BullMQ workers or suspend the scheduler).

## 🟢 Improvements

- **2026-08-21** — `worker/src/queue/processors/apply.processor.js` re-reads `RESUME_BUILDER_URL` / `RESUME_BUILDER_API_KEY` directly from `process.env` instead of using the shared `config` object — consolidate.
- **2026-08-21** — `SAFETY_RULES` in `worker/src/automation/anti-detection.js` (40/day, 8/hour caps, timing ranges) are declarative only; wire them into the processors so rate caps are actually enforced.
- **2026-08-21** — Dead/dormant code: `worker/src/scraper/index.js` aggregator and `worker/src/automation/linkedin-apply.js` are not imported by any processor — either wire up LinkedIn applying or remove.
- **2026-08-21** — Docs relocated per convention: root `architecture.md` → `docs/architecture.md`, root `TODO.md` → `docs/to-do.md`. Stale absolute paths (`/Users/sukhjot/codes/untitled folder 2/...`) fixed to relative paths; worker + env-var sections added.
