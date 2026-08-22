# Automation Archive (removed from active site — 2026-08-21)

The job-automation feature and API-key management were moved out of the Next.js site
into this folder for reference. Nothing was deleted — file contents are unchanged.

## Structure (mirrors original repo paths)

| Archive path | Was originally at | What it is |
|---|---|---|
| `src/app/automation/` | `src/app/automation/` | Automation UI pages (dashboard, jobs, applications, settings) |
| `src/app/api/automation/` | `src/app/api/automation/` | Automation REST endpoints (jobs, sessions, scheduler, criteria, etc.) |
| `src/app/api/gatekeeper/` | `src/app/api/gatekeeper/` | Worker-only AI gatekeeper evaluate endpoint |
| `src/app/api-keys/` + `src/app/api/api-keys/` | same path under `src/app/` | API key management page + CRUD routes |
| `src/models/*.js` | `src/models/` | Application, ApplyInstructions, JobCriteria, JobListing, GatekeeperDecision, GatekeeperRules, NotificationPrefs, PlatformSession, SchedulerSettings models |
| `worker/` | `worker/` | Node.js Express+BullMQ scraper/applier service (own .env, node_modules) |
| `job_automation_system_spec_v2.md` | repo root | Original system spec/design document for the automation pipeline |

## Deliberately KEPT in the live site

- `src/lib/apiKeyAuth.js`, `src/models/ApiKey.js`, `src/models/DailyCount.js` —
  `resolveUserId()` dual auth (JWT/API key) and rate limiting are used by live resume /
  cover-letter / generate routes.
- `src/lib/constants.js` automation permissions & ROUTES entries — inert config data.
- MongoDB collections — untouched; historical automation data is preserved.

## How to restore

1. Move folders/files back to their original paths listed above (`git mv` back).
2. Re-add the two `/automation` links in `src/components/layout/Navbar.js`
   (desktop nav after the Dashboard link + mobile menu).
3. Restart worker: `cd worker && npm run dev`.
