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
cp .env.example .env.local  # fill in the values below before seeding
node scripts/seed.mjs   # required once per fresh DB (permissions & roles)
npm run dev             # http://localhost:3000
```

Environment variables and fresh-database setup are listed below. The file/function
inventory is in [`docs/architecture.md`](docs/architecture.md).

## Environment variables

Use [`.env.example`](.env.example) as the template for `.env.local`; set the same
variables in this site's hosted project settings. Give Resume Builder its own MongoDB
database and separate access/refresh secrets. Examples contain placeholders only.

### Required app configuration

| Variable | Required for / value |
|---|---|
| `MONGODB_URI` | Startup and persistence; connection string including the new database name, e.g. `resume_builder`. |
| `ACCESS_TOKEN_SECRET` | Startup; random access-token signing secret, at least 32 characters. |
| `REFRESH_TOKEN_SECRET` | Startup; a different random refresh-token signing secret, at least 32 characters. |
| `BREVO_API_KEY` | Working OTP login; Brevo transactional email key. |
| `BREVO_SENDER_EMAIL` | Working OTP login; verified Brevo sender email address. |
| `NEXT_PUBLIC_APP_URL` | Set to the site's public origin for deployed magic links, checkout redirects and CSRF policy. Defaults to `http://localhost:3000` locally. |

Only the database and signing secrets are enforced at boot. Missing email credentials
prevent normal OTP login; missing AI/billing credentials disable those features.

### AI, billing and other optional settings

| Variable | Required for / default |
|---|---|
| `DEEPSEEK_API_KEY` | DeepSeek tasks. **Current code defaults every AI task to `deepseek:deepseek-flash` (DeepSeek V4.1 Flash).** |
| `GEMINI_API_KEY` | Tasks explicitly configured to use the Gemini adapter. Setting the key alone does not switch providers. |
| `STRIPE_SECRET_KEY` | Checkout, subscription portal and Stripe API operations. |
| `STRIPE_WEBHOOK_SECRET` | Verification of Stripe webhooks at `/api/webhooks/stripe`; use the signing secret for that endpoint and environment. |
| `ALLOWED_ORIGINS` | Optional comma-separated additional trusted origins for state-changing requests; no extra origins when unset. |
| `NEXT_PUBLIC_RELEASE` | Browser log release label; defaults to `web`. |
| `GIT_SHA` | Server log release label when platform `VERCEL_GIT_COMMIT_SHA` is unavailable; defaults to `dev`. |

The current task overrides accept `deepseek:MODEL_ID` or `gemini:MODEL_ID`. Use the
exact identifier supported by the provider; model names are not database records.
These are server configuration and require a restart/redeploy after changes.

The default `deepseek-flash` identifier selects DeepSeek V4.1 Flash
([official model documentation](https://api-docs.deepseek.com/quick_start/pricing/)).
Flash requests explicitly disable thinking mode to preserve the site's existing
chat/JSON behavior; other explicit model overrides retain their provider defaults.

| Variable | AI task |
|---|---|
| `AI_TASK_RESUME_GENERATION` | Resume generation. |
| `AI_TASK_COVER_LETTER_GENERATION` | Cover-letter generation. |
| `AI_TASK_AI_EDIT` | AI editing (currently shared by resume and cover-letter editing). |
| `AI_TASK_RESUME_PARSING` | Uploaded resume parsing. |
| `AI_TASK_GATEKEEPER` | Gatekeeper/validation. |

To use Gemini for all current tasks, set `GEMINI_API_KEY` and assign all five overrides
to `gemini:YOUR_SUPPORTED_MODEL_ID`. Task routing currently comes from code and
environment overrides; there is no runtime admin model selector in this branch.

```dotenv
MONGODB_URI=mongodb+srv://USER:PASSWORD@CLUSTER/resume_builder?retryWrites=true&w=majority
ACCESS_TOKEN_SECRET=REPLACE_WITH_RANDOM_ACCESS_SECRET
REFRESH_TOKEN_SECRET=REPLACE_WITH_DIFFERENT_REFRESH_SECRET
BREVO_API_KEY=REPLACE_WITH_BREVO_KEY
BREVO_SENDER_EMAIL=noreply@example.com
NEXT_PUBLIC_APP_URL=https://your-resume-host
DEEPSEEK_API_KEY=REPLACE_WITH_DEEPSEEK_KEY
# GEMINI_API_KEY=
# STRIPE_SECRET_KEY=
# STRIPE_WEBHOOK_SECRET=
# ALLOWED_ORIGINS=
# AI_TASK_RESUME_GENERATION=gemini:YOUR_SUPPORTED_MODEL_ID
# AI_TASK_COVER_LETTER_GENERATION=gemini:YOUR_SUPPORTED_MODEL_ID
# AI_TASK_AI_EDIT=gemini:YOUR_SUPPORTED_MODEL_ID
# AI_TASK_RESUME_PARSING=gemini:YOUR_SUPPORTED_MODEL_ID
# AI_TASK_GATEKEEPER=gemini:YOUR_SUPPORTED_MODEL_ID
```

Generate each signing secret separately with `openssl rand -hex 32`. Secrets and
provider credentials remain server-side. `NEXT_PUBLIC_*` values are included in browser
output at build time, so changes require a rebuild/redeploy.

### Local tools and framework values

| Variable | Purpose |
|---|---|
| `APP_ORIGIN` | `manager:check` target Resume Builder origin; defaults to `http://localhost:3000`. |
| `MANAGER_MODULE` | Delivery measurement script's integration-module override; defaults to `../src/lib/manager/index.js`. |
| `MEASURE_CHUNK` | Measurement entries per paced chunk; defaults to `20`. |
| `MEASURE_GAP_MS` | Measurement delay between chunks; defaults to `100` ms. |
| `TEST_LOGIN_BYPASS` | Existing temporary local-only testing switch: exact `local-only`. Leave unset in deployments; production refuses the bypass. |

The Manager checker also uses the project keys in the integration section below.
`NODE_ENV`, `NEXT_RUNTIME` and `VERCEL_GIT_COMMIT_SHA` are supplied by the framework/platform.
`AUTH_SECRET`, `OPENAI_API_KEY` and `RESEND_API_KEY` are not used by this app.

### Fresh database setup

After setting the new `MONGODB_URI`, run `node scripts/seed.mjs` from this folder to
populate 31 permissions and the ADMIN/DEVELOPER/SUBSCRIBER/USER roles. The seed does not
create an admin user. For your initial root account, sign in normally to create your
user, then set only that trusted user document's `role` to `0` through database
administration. Other users start as USER (`100`). Plans and initial credit defaults
come from code; no plan or credit rows need manual seeding on an empty database.

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
| `MANAGER_ENDPOINT` | Server logs | Manager's origin, not this site's URL or an ingest path. |
| `MANAGER_APP_ID` | Server logs | Project slug: `resume-builder`. |
| `MANAGER_LOG_KEY` | Server logs | That project's server key (`mlk_`), always server-only. |
| `NEXT_PUBLIC_MANAGER_ENDPOINT` | Browser logs and analytics | Same Manager origin. |
| `NEXT_PUBLIC_MANAGER_APP_ID` | Browser logs and analytics | Same project slug: `resume-builder`. |
| `NEXT_PUBLIC_MANAGER_CLIENT_KEY` | Browser logs | That project's public client key (`mck_`). |
| `NEXT_PUBLIC_MANAGER_ANALYTICS_KEY` | Browser analytics | That project's public analytics key (`mak_`); analytics is independent of the client log key. |
| `MANAGER_ANALYTICS_KEY` | `manager:check` | Same analytics key as the public value; the browser tracker reads the public variable. |
| `MANAGER_LOG_SOURCE` | Optional legacy source hint | Defaults to `server`; leave unset for this server integration. Manager derives actual ingest source from key kind. |

Create the `resume-builder` project and its three keys in Manager first. Use a separate
project/key set for Finance. Missing configuration disables the relevant channel.

```dotenv
MANAGER_ENDPOINT=https://your-manager-host
MANAGER_APP_ID=resume-builder
MANAGER_LOG_KEY=mlk_REPLACE_ME
MANAGER_ANALYTICS_KEY=mak_REPLACE_ME
NEXT_PUBLIC_MANAGER_ENDPOINT=https://your-manager-host
NEXT_PUBLIC_MANAGER_APP_ID=resume-builder
NEXT_PUBLIC_MANAGER_CLIENT_KEY=mck_REPLACE_ME
NEXT_PUBLIC_MANAGER_ANALYTICS_KEY=mak_REPLACE_ME
```

Set them in `.env.local` locally and in the hosted project settings for deployment.
Public variables require rebuilding; never place the `mlk_` server key in a public
variable. Standalone Node checker/measurement scripts read the shell environment and
**do not load `.env.local` themselves**; supply their variables in the shell.

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

- Routine server logs batch with a 250 ms window; urgent errors trigger a bounded
  immediate flush. Route completion schedules delivery with Next.js `after`, keeping
  it alive when serverless runtimes freeze response-time timers.
- Process-level `uncaughtException` capture is intentionally **off**; Next.js owns process
  error handling. Report errors from your error boundary instead.
- The integration never throws into a request: if Manager is unreachable, the app behaves as
  if logging were disabled.
