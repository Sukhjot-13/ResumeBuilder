# ATS-Friendly Resume Builder (ResumeAI)

AI-powered resume builder: paste a job description and get an ATS-optimized,
tailored resume generated from your master resume. Includes AI cover letters,
an AI resume editor with natural-language instructions, PDF export across six
templates, and subscription billing via Stripe.

## Tech Stack

- **Next.js 16** (App Router) + **React 19** + Tailwind CSS v4
- **MongoDB** via Mongoose · **Stripe** subscriptions · Brevo email OTP auth
- **DeepSeek / Gemini** AI providers (per-task routing, see `src/lib/ai/config.js`)
- JWT access/refresh tokens in HttpOnly cookies, rotated at the edge (`src/proxy.js`)

## Getting Started

```bash
npm install
node scripts/seed.mjs   # required once per fresh DB (permissions & roles)
npm run dev             # http://localhost:3000
```

Environment variables live in `.env.local` — see the Environment Variables
section of `docs/architecture.md` for the full list. `ALLOWED_ORIGINS` is
optional and controls which origins may make state-changing API calls.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run start` | Serve production build |
| `npm run lint` | ESLint |
| `node scripts/seed.mjs` | Seed permissions/roles collections |

## Documentation

- [`docs/architecture.md`](docs/architecture.md) — every file's purpose and functions, env vars
- [`docs/audit.md`](docs/audit.md) — site audit findings and open items
- [`docs/to-do.md`](docs/to-do.md) — open task list
- [`docs/suggestions.md`](docs/suggestions.md) — improvement/vulnerability log

## Manager integration (optional)

This app can send its logs and page analytics to **Manager**, your personal project control
center. With no `MANAGER_*` variables set nothing changes: the integration is a set of
no-ops, so local development, CI and previews are never affected.

### What gets wired up

- **Every existing `logger.*` call** is forwarded automatically — `src/lib/logger.js` fans out
  to Manager, so route handlers, server actions and services keep logging exactly as before
  and the entries also land in Manager. No per-route changes.
- **Unhandled crashes and rejections in the browser** are captured by the SDK.
- **Analytics**: one script tag is injected client-side, tracking pageviews (SPA routes
  included), click targets, referrers and UTM params.

### Configuration

| Variable | Required for | Value |
|---|---|---|
| `MANAGER_ENDPOINT` | logs + analytics | base URL of your Manager deployment |
| `MANAGER_APP_ID` | logs + analytics | project slug in Manager |
| `MANAGER_LOG_KEY` | logs | `mlk_…` (server) or `mck_…` (browser) |
| `MANAGER_ANALYTICS_KEY` | analytics | `mak_…` |
| `MANAGER_LOG_SOURCE` | optional | `server` (default) or `client` |

Set them in `.env.local` locally and in the Vercel project settings for deployments. See
`.env.example` for the full block.

### Refresh the vendored SDK

`src/lib/manager/logger.js` is the whole SDK in one file (zero dependencies). To update it:

```bash
curl -fsSL -H "x-manager-key: $MANAGER_LOG_KEY" \
  "https://your-manager-host/api/sdk/logger?format=js" -o src/lib/manager/logger.js
```

Use `?format=js` for this JavaScript project (TypeScript projects use the default `.ts`).
The key is read from the `x-manager-key` header, never a URL. Commit the refreshed file so
everyone on the team gets the same version.

### Verify it works

```bash
npm run manager:check   # needs MANAGER_ENDPOINT, MANAGER_LOG_KEY, MANAGER_ANALYTICS_KEY
```

It posts one log and one event through the real endpoints, asserts the right key kinds are
accepted and the wrong ones are refused, then hits this app's own `/api/health`. Anything the
app logs shows up under *Project → Logs* in Manager within a second or two.

### Notes

- Server logs are flushed on every write, not on the SDK's 5-second timer: serverless
  runtimes can freeze timers after a response is sent, which would silently drop entries.
- Process-level `uncaughtException` capture is intentionally **off**; Next.js owns process
  error handling. Report errors from your error boundary instead.
- The integration never throws into a request: if Manager is unreachable, the app behaves as
  if logging were disabled.
