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
section of `docs/architecture.md` for the full list.

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
- [`docs/to-do.md`](docs/to-do.md) — task list
- [`docs/suggestions.md`](docs/suggestions.md) — improvement/vulnerability log

## Archived Feature

The job-automation feature (LinkedIn/Indeed auto-apply worker) was moved out of
the active codebase into [`automation/`](automation/README.md). It is kept there
for reference and can be restored following its README.
