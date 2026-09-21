# Suggestions Log

> Convention: only open, not-yet-implemented items live here. Anything fixed
> is recorded in `docs/architecture.md` (per-file history) and removed below.

## 🔴 Vulnerabilities

- **Refresh-token grace replay:** `rotateRefreshToken()` (`src/lib/auth.js`) resets `supersededAt` to "now" every time a superseded token is re-presented within the 60s grace window — a token replayed at <60s intervals never expires (unbounded session extension for a captured token). Consider keeping the FIRST superseded timestamp (or capping total replays).
- **Archived worker:** `automation/worker/src/config.js` `validateConfig()` does not require `DEEPSEEK_API_KEY`, yet the entire apply stage silently no-ops without it. Enforce it at boot if the worker is ever restored.

## 🟡 New Features

- **Archived worker:** notifications (`automation/worker/src/notifications/index.js`) are a logging stub: implement the actual Resend SDK send when `RESEND_API_KEY` is set.
- **Archived worker:** `POST /trigger/pause` is a placeholder; implement real queue pausing (e.g., pause BullMQ workers or suspend the scheduler).

## 🟢 Improvements

- **Archived worker:** `apply.processor.js` re-reads `RESUME_BUILDER_URL` / `RESUME_BUILDER_API_KEY` directly from `process.env` instead of using the shared `config` object — consolidate if restored.
- **Archived worker:** `SAFETY_RULES` in `automation/anti-detection.js` (40/day, 8/hour caps, timing ranges) are declarative only; wire them into the processors so rate caps are actually enforced.
- **Archived worker:** dead/dormant code — `automation/worker/src/scraper/index.js` aggregator and `automation/worker/src/automation/linkedin-apply.js` are not imported by any processor — either wire up LinkedIn applying or remove.
