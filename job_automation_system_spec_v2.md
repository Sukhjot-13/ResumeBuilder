# Job Application Automation Ecosystem — Master Spec v2
> Feed this entire document to your AI coding assistant (Cursor, Claude Code, etc.)
> This is the single source of truth for the entire system.

---

## ⚠️ IMPORTANT — READ THIS FIRST (For the AI Assistant)

Before writing a single line of refactoring code for the Resume Builder,
you MUST audit the existing codebase. Follow this exact process:

### Step 0 — Codebase Audit Protocol (Resume Builder)

When the user provides the Resume Builder codebase, do the following before anything else:

1. **Map the folder structure** — list every file and what it does
2. **Identify the resume generation logic** — find exactly where/how resumes are generated (which file, which function, which AI call)
3. **Identify the PDF generation logic** — find how PDFs are created (puppeteer? react-pdf? jsPDF? html2pdf?)
4. **Identify existing API routes** — list all `/api/*` routes that already exist
5. **Identify the data shape** — what does the current input form collect? Map it to the API schema below
6. **Identify reusable vs replaceable code** — what can stay as-is, what needs to move
7. **List all dependencies** in `package.json` relevant to resume/PDF generation
8. **Check for existing auth** — is there any auth already? NextAuth? Clerk? Custom?
9. **Check for existing DB** — is there a database already connected? What ORM?
10. **Output a written audit report** in this format before touching any code:

```
AUDIT REPORT — Resume Builder Codebase
=======================================
Framework: Next.js [version] with [Pages Router / App Router]
Auth: [none / NextAuth / Clerk / custom]
Database: [none / Supabase / Prisma+Postgres / other]
Resume Generation: [file path] → [function name] → [AI model used]
PDF Generation: [library used] → [file path]
Existing API routes: [list them]
Current input fields: [list what the form collects today]
Key dependencies: [relevant ones]

REFACTOR PLAN:
- Keep as-is: [list files]
- Move to API layer: [list files + where they go]
- Create new: [list new files needed]
- Breaking changes: [list any]
```

**DO NOT start refactoring until this audit report is written and confirmed.**

---

## 🚀 Current Implementation Decisions (Live — Updated 2026-05-24)

This section documents actual decisions made during implementation. Deviations from the original spec below are intentional. Refer here instead of re-reading the full spec every time.

### Database
| Original Spec | Actual | Why |
|---|---|---|
| Supabase (Postgres) | **MongoDB** | App already uses MongoDB. No Postgres at all. |
| Supabase Storage for PDFs | **On-the-fly generation** | Resumes generated per-application, not stored. Simplify for v1. |

### Auth
| Original Spec | Actual | Why |
|---|---|---|
| NextAuth.js for Dashboard | **Custom JWT** (existing `AuthContext` + `requirePermission()`) | Dashboard lives in same app, reuses existing auth. |
| Shared secret / JWT for Worker | **API Keys** — `ApiKey` Mongoose model + `Authorization: Bearer <key>` | Future-proof for service split. Industry standard pattern. |

### Gatekeeper AI
| Original Spec | Actual | Why |
|---|---|---|
| Anthropic/OpenAI SDK in Worker | **Gemini Flash** via `callAI('GATEKEEPER')`, routed through `POST /api/gatekeeper/evaluate` API route | Reuses existing `src/lib/ai/client.js`. Swappable via `AI_TASK_GATEKEEPER=provider:model` env var. |

### Architecture
| Original Spec | Actual | Why |
|---|---|---|
| Separate Next.js app for Dashboard | **Same Next.js app** at `/automation/*` | Reuses auth, DB, deployment. Extract later when needed. |
| CORS headers needed | **Not needed initially** | Same origin. Add when separating services. |

### Resume Modes (planned)
- **Mode A** (Custom): `callAI('RESUME_GENERATION')` with job description + user profile — tailored per job
- **Mode B** (Static): Pre-set profile, same resume for all — faster, less targeted

### Templates
- Exposed via `GET /api/resume/templates` endpoint
- Worker discovers templates dynamically at runtime
- Internal mapping: `"standard"` → `Professional`, `"modern"` → `Modern`, `"classic"` → `ClassicTemplate`, etc.

### Future Separation Plan (Dashboard → own Next.js app)

**Why it's easy:**
- Same MongoDB — just add `MONGODB_URI` to the new app's env vars, both apps read the same collections
- Same JWT auth — stateless tokens. Same `JWT_SECRET` on both apps = same login works on both
- API keys already exist for cross-service calls — no new auth to build

**Steps:**
1. Copy `/app/automation/*` pages + their API routes → new Next.js project
2. Copy Mongoose models (`src/models/`) + DB connection utility → both apps
3. Copy auth utilities (`AuthContext`, `requirePermission`, `jwt.js`, `proxy.js`) → new app
4. Add `MONGODB_URI`, `JWT_SECRET`, `NEXT_PUBLIC_APP_URL` to new app's Vercel env vars
5. Add CORS headers to Resume Builder API routes called by the new Dashboard
6. Deploy both to Vercel

**Nothing changes architecture-wise:**
- Dashboard and Dashboard API routes keep working with same MongoDB collections
- Worker keeps calling Resume Builder API with the same API keys (URL changes to production)
- The split is just file extraction + env var config — no structural rewrite

### What This Means for Development
- All automation MongoDB models go in the existing `src/models/` folder
- All automation API routes go in `src/app/api/`
- Dashboard pages go in `src/app/automation/`
- Auth is already handled — just use `requirePermission()` and `useAuth()`
- Worker is STILL a separate Node.js service at `/worker` (has Playwright, BullMQ, Redis)

---

## 🗺️ SYSTEM OVERVIEW

Three separate applications working as an ecosystem:

```
┌──────────────────────────────────────────────────────────────────┐
│                        INFRASTRUCTURE                            │
│                                                                  │
│  ┌─────────────────────┐         ┌────────────────────────────┐ │
│  │   Resume Builder    │         │    Job Application Engine  │ │
│  │   (Next.js)         │ ◄──────►│    (Next.js Dashboard)     │ │
│  │   Vercel            │  HTTP   │    Vercel                  │ │
│  └─────────────────────┘         └───────────────┬────────────┘ │
│                                                  │ HTTP         │
│                                  ┌───────────────▼────────────┐ │
│                                  │   Automation Worker        │ │
│                                  │   (Node.js Backend)        │ │
│                                  │   Render / Railway         │ │
│                                  │                            │ │
│                                  │  - Playwright (apply)      │ │
│                                  │  - BullMQ (queue)          │ │
│                                  │  - Cron scheduler          │ │
│                                  │  - Job scraper             │ │
│                                  │  - Gatekeeper AI           │ │
│                                  └────────────────────────────┘ │
│                                                                  │
│  Supabase (shared DB + storage)    Upstash Redis (queue)        │
└──────────────────────────────────────────────────────────────────┘
```

### The Three Services

| Service | Type | Hosted On | Purpose |
|---------|------|-----------|---------|
| **Resume Builder** | Next.js | Vercel | UI + headless API for resume generation |
| **Job Engine Dashboard** | Next.js | Vercel | User dashboard, settings, job browser, logs |
| **Automation Worker** | Node.js | Render | Playwright, BullMQ queue, cron, scraper, gatekeeper |

---

## SERVICE 1 — RESUME BUILDER (Refactor)

### Goal
Refactor the existing Next.js site to expose a proper REST API that the
Automation Worker can call programmatically, while keeping the existing UI working.

> ⚠️ DO NOT start this section until the Codebase Audit (Step 0) is complete.
> The audit will determine exactly which files to touch and how.

---

### Target Architecture (after refactor)

```
/app
  /page.tsx                        ← existing UI — keep, minimal changes
  /docs/page.tsx                   ← NEW: API documentation page
  /api-keys/page.tsx               ← NEW: API key management UI

/app/api
  /health/route.ts                 ← NEW: health check
  /resume
    /generate/route.ts             ← NEW (or refactored): core generation endpoint
    /download/[id]/route.ts        ← NEW: PDF download by resumeId
    /preview/[id]/route.ts         ← NEW: HTML preview by resumeId
    /templates/route.ts            ← NEW: list available templates
  /profile
    /route.ts                      ← NEW: save/get user profile (POST + GET)
    /[id]/route.ts                 ← NEW: get profile by ID
  /api-keys
    /route.ts                      ← NEW: create/list API keys
    /[id]/route.ts                 ← NEW: revoke a key

/lib
  /resume-generator.ts             ← MOVED from wherever it lives now
  /pdf-generator.ts                ← MOVED from wherever it lives now
  /api-key-validator.ts            ← NEW
  /resume-storage.ts               ← NEW

/middleware.ts                     ← NEW: API key auth for /api/* routes
```

---

### API Spec: `POST /api/resume/generate`

**Headers:**
```
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json
```

**Request Body:**
```json
{
  "jobDescription": "string (required)",
  "profileId": "string (optional) — use saved profile",
  "userProfile": {
    "name": "string",
    "email": "string",
    "phone": "string",
    "location": "string",
    "linkedin": "string (optional)",
    "portfolio": "string (optional)",
    "summary": "string",
    "experience": [
      {
        "company": "string",
        "title": "string",
        "startDate": "string",
        "endDate": "string or 'Present'",
        "bullets": ["string"]
      }
    ],
    "education": [
      {
        "institution": "string",
        "degree": "string",
        "year": "string"
      }
    ],
    "skills": ["string"],
    "certifications": ["string (optional)"]
  },
  "templateId": "string (optional, default: 'standard')",
  "format": "pdf | json | html (optional, default: pdf)"
}
```

**Success Response `200`:**
```json
{
  "success": true,
  "resumeId": "uuid-v4",
  "downloadUrl": "https://resume-site.com/api/resume/download/uuid",
  "previewUrl": "https://resume-site.com/api/resume/preview/uuid",
  "expiresAt": "ISO timestamp (48hrs from now)",
  "atsScore": 87,
  "keywordsMatched": ["React", "TypeScript", "Agile"],
  "keywordsMissed": ["Docker", "CI/CD"],
  "generatedAt": "ISO timestamp"
}
```

**Error Response `4xx/5xx`:**
```json
{
  "success": false,
  "error": "string",
  "code": "INVALID_API_KEY | RATE_LIMIT_EXCEEDED | GENERATION_FAILED | ..."
}
```

---

### API Authentication Middleware

```typescript
// middleware.ts
import { NextRequest, NextResponse } from 'next/server';

export async function middleware(req: NextRequest) {
  // Only protect /api/* routes (not /api/health)
  if (req.nextUrl.pathname.startsWith('/api/') &&
      !req.nextUrl.pathname.startsWith('/api/health')) {

    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized', code: 'NO_API_KEY' }, { status: 401 });
    }

    // Validate key against DB (Supabase)
    const valid = await validateApiKey(token);
    if (!valid) {
      return NextResponse.json({ error: 'Invalid API key', code: 'INVALID_API_KEY' }, { status: 403 });
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*'],
};
```

---

### Resume Storage (v1 — On-the-fly, no storage)

- **v1**: Resumes are generated per-application, returned to the Worker, and submitted immediately. Not stored in DB.
- **Future**: If storage is needed, add MongoDB GridFS or S3-compatible storage.

---

### CORS Config (required for Worker — Worker calls this cross-origin)

```typescript
// In every Worker-facing API route:
export async function OPTIONS() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': process.env.WORKER_ORIGIN ?? '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    },
  });
}
```
> **Note**: Not needed while Worker is same-origin. Add when separating.

---

### Rate Limiting

- 100 resume generations per API key per day
- Track usage in MongoDB: `api_key_usage` model `(key_id, date, count)`
- Return `429` with `code: RATE_LIMIT_EXCEEDED` when exceeded

---

### Resume Builder Checklist

**Step 0 (MUST DO FIRST)**
- [x] User provides codebase
- [x] AI assistant runs audit and outputs audit report
- [x] Audit report reviewed and refactor plan confirmed

**Shared Infrastructure (in existing Next.js app)**
- [ ] Add automation Mongoose models (ApiKey, JobListing, Application, etc.)
- [ ] Create `/app/api/gatekeeper/evaluate/route.ts` — Worker calls this
- [ ] Create `/app/api/resume/templates/route.ts` — list templates
- [ ] Create `/app/api/health/route.ts`
- [ ] Add API key middleware for Worker-facing routes
- [ ] Add API key management routes + UI (`/app/api-keys/`)
- [ ] Add rate limiting (100/day per key)
- [ ] Add API docs page (`/app/docs/page.tsx`)

---

## SERVICE 2 — JOB ENGINE DASHBOARD (New — Next.js)

### Goal
A user-facing Next.js dashboard for configuring the automation, browsing scraped
jobs, reviewing gatekeeper decisions, and monitoring application history.
This is purely a **frontend + thin API layer** — all heavy work is delegated to the Worker.

---

### Tech Stack

```
Framework:    Next.js (same app — not separate)
Auth:         Custom JWT (existing — not NextAuth)
Database:     MongoDB (existing — not Supabase)
UI:           Tailwind CSS (existing — no new shadcn/ui)
Deployment:   Vercel (same deploy)
```

> All Dashboard pages go under `/app/automation/` in the existing Next.js app.

---

### Pages

```
/                            ← Landing page / login
/dashboard                   ← Stats overview + live queue status
/jobs                        ← Browse scraped jobs, see gatekeeper decisions
/jobs/[id]                   ← Individual job detail + gatekeeper reasoning
/applications                ← Full application history with filters
/applications/[id]           ← Individual application detail

/settings
  /settings/profile          ← Resume profile editor (syncs to Resume Builder)
  /settings/accounts         ← LinkedIn + Indeed session/cookie management
  /settings/criteria         ← Job search filters (titles, location, salary, etc.)
  /settings/gatekeeper       ← Gatekeeper AI rules + confidence threshold
  /settings/scheduler        ← Automation schedule, daily caps, timing windows
  /settings/api-keys         ← Resume Builder API key input
  /settings/notifications    ← Email/in-app notification preferences
```

---

### Dashboard Stats (fetch from Supabase)

```
Today:    Applied: 12  |  Skipped: 34  |  Failed: 1  |  In Queue: 8
This Week: Applied: 47  |  Skipped: 120  |  Success Rate: 97%
Queue Status: [RUNNING] Next run in 1hr 23min
LinkedIn session: ✅ Valid   Indeed session: ⚠️ Expires soon
```

---

### Settings — Scheduler Page (`/settings/scheduler`)

This is the user-controlled automation schedule. Settings are saved to Supabase
and read by the Worker on every cron tick.

```typescript
interface SchedulerSettings {
  enabled: boolean;                    // master on/off switch
  platforms: {
    linkedin: boolean;
    indeed: boolean;
  };
  timeWindow: {
    startHour: number;                 // 0-23, e.g. 9 = 9am
    endHour: number;                   // 0-23, e.g. 18 = 6pm
    timezone: string;                  // e.g. 'America/Toronto'
  };
  activeDays: {                        // which days to run
    monday: boolean;
    tuesday: boolean;
    wednesday: boolean;
    thursday: boolean;
    friday: boolean;
    saturday: boolean;
    sunday: boolean;
  };
  limits: {
    maxPerDay: number;                 // hard cap e.g. 20
    maxPerWeek: number;                // hard cap e.g. 80
    maxPerRun: number;                 // per cron tick e.g. 5
    minDelayBetweenApps: number;       // seconds, e.g. 60
    maxDelayBetweenApps: number;       // seconds, e.g. 180
  };
  gatekeeperThreshold: number;         // 0-100, only auto-apply if confidence >= this
  reviewQueueThreshold: number;        // 0-100, jobs below this go to manual review
  pauseOnError: boolean;               // stop automation if an application fails
  pauseOnSessionExpiry: boolean;       // stop if LinkedIn/Indeed session expires
}
```

**UI Elements:**
- Master toggle (big ON/OFF switch at top)
- Time window: "Apply between [9:00 AM] and [6:00 PM]" — time pickers
- Timezone selector
- Days of week: checkboxes Mon–Sun
- Max applications per day: number input + slider (1–50)
- Max applications per week: number input
- Delay between applications: range slider "1 min — 3 min"
- Gatekeeper threshold: slider "Only apply if AI confidence ≥ [75]%"
- Review queue threshold: slider "Send to my review if confidence is [40–75]%"
- Emergency stop button (immediately pauses all automation)

---

### Settings — Accounts Page (`/settings/accounts`)

```
LinkedIn Account
  Status: ✅ Session valid (refreshed 2 days ago)
  [Re-authenticate] button → opens instructions modal

  Instructions modal:
  1. Open LinkedIn in your browser
  2. Open DevTools → Application → Cookies
  3. Copy all cookies as JSON
  4. Paste below and click Save

  [Cookie JSON textarea]
  [Save Session] button

Indeed Account
  (same pattern)
```

Cookies are AES-256 encrypted before storing in MongoDB.

---

### Jobs Page (`/jobs`)

Table of all scraped jobs with columns:
- Title, Company, Location, Platform, Posted, Salary
- Gatekeeper: ✅ Apply (92%) / ⚠️ Review (61%) / ❌ Skip (23%)
- Status: Pending / Applied / Skipped / Failed / In Queue
- Actions: [View] [Apply Now] [Skip] [See Gatekeeper Reasoning]

Filters: Platform, Status, Gatekeeper Decision, Date Range, Title search

---

### Automation Dashboard Checklist (in same Next.js app at `/app/automation/`)

> **No project setup needed** — same app, same auth, same DB, same deployment.
> Pages go at `/automation/jobs`, `/automation/jobs/[id]`, etc.

- [ ] Dashboard page (`/automation`) with live stats from MongoDB
- [ ] Jobs page (`/automation/jobs`): table with filters and gatekeeper decisions
- [ ] Job detail page (`/automation/jobs/[id]`): full description + gatekeeper reasoning
- [ ] Applications history page (`/automation/applications`) with filters
- [ ] Application detail page (`/automation/applications/[id]`)
- [ ] Settings: Accounts (`/automation/settings/accounts`) — cookie paste + save, AES-256 encrypted in MongoDB
- [ ] Settings: Criteria (`/automation/settings/criteria`) — job search filters saved to MongoDB
- [ ] Settings: Gatekeeper rules (`/automation/settings/gatekeeper`) — rules form
- [ ] Settings: Scheduler (`/automation/settings/scheduler`) — schedule form
- [ ] Settings: API keys (`/automation/settings/api-keys`) — API key management
- [ ] Settings: Profile (`/automation/settings/profile`) — resume profile
- [ ] Settings: Notifications (`/automation/settings/notifications`)
- [ ] Emergency stop button (sets `scheduler.enabled = false` in MongoDB)
- [ ] Real-time queue status indicator (poll Worker `/health` endpoint)

---

## SERVICE 3 — AUTOMATION WORKER (New — Node.js Backend)

### Goal
A standalone Node.js service that runs the heavy lifting:
Playwright automation, job scraping, BullMQ job queue, cron scheduler,
and Gatekeeper AI. Runs on Render (or Railway — your choice).

This is NOT a Next.js app. It's a plain **Express + Node.js** service.

---

### Tech Stack

```
Runtime:       Node.js 20+
Framework:     Express.js (thin HTTP layer for health + trigger endpoints)
Automation:    Playwright + playwright-extra + puppeteer-extra-plugin-stealth
Queue:         BullMQ + Upstash Redis (or self-hosted Redis on Render)
Scheduler:     node-cron (triggers queue jobs on schedule)
AI:            Calls this app's POST /api/gatekeeper/evaluate (Gemini Flash)
Database:      MongoDB (reads/writes via this app's API — Worker doesn't connect directly to DB)
Storage:       N/A for v1 (on-the-fly resume generation)
Encryption:    Node.js crypto (AES-256-GCM for cookie decryption)
Deployment:    Render (Web Service, always-on)
Language:      TypeScript
```

---

### Folder Structure

```
/worker
  /src
    /index.ts                  ← Express app entry point
    /config.ts                 ← All env vars + constants
    /db.ts                     ← Supabase client
    /redis.ts                  ← Upstash Redis / BullMQ setup

    /scheduler
      /cron.ts                 ← node-cron: triggers scrape + apply jobs
      /settings.ts             ← Reads scheduler settings from DB

    /scraper
      /linkedin.ts             ← LinkedIn job scraper (Playwright)
      /indeed.ts               ← Indeed job scraper (API + fallback scraper)
      /index.ts                ← Unified scraper interface

    /gatekeeper
      /index.ts                ← Gatekeeper AI endpoint + prompt logic
      /prompt.ts               ← System prompt + user prompt builder

    /automation
      /browser.ts              ← Playwright browser setup (stealth, cookies)
      /linkedin-apply.ts       ← LinkedIn Easy Apply automation
      /indeed-apply.ts         ← Indeed Apply automation
      /anti-detection.ts       ← Delays, mouse simulation, rate limits

    /queue
      /workers.ts              ← BullMQ worker definitions
      /jobs.ts                 ← Job type definitions
      /processors
        /scrape.processor.ts   ← Process: scrape new jobs
        /gate.processor.ts     ← Process: run gatekeeper on new jobs
        /generate.processor.ts ← Process: call Resume Builder API
        /apply.processor.ts    ← Process: submit application via Playwright

    /resume-client
      /index.ts                ← HTTP client for Resume Builder API

    /notifications
      /index.ts                ← Email notifications (Resend or Nodemailer)

    /routes
      /health.ts               ← GET /health — status check
      /trigger.ts              ← POST /trigger/scrape, /trigger/apply (manual)
      /queue.ts                ← GET /queue/status

  /package.json
  /tsconfig.json
  /.env
  /render.yaml                 ← Render deployment config
```

---

### Core Automation Pipeline

The Worker runs this pipeline. Each step is a separate BullMQ job type.

```
CRON TICK (every 2hrs, within user's time window)
│
▼
[SCRAPE JOB]
  Read user's criteria from DB
  Scrape LinkedIn + Indeed for matching jobs
  Deduplicate (skip already seen jobs)
  Save new raw job listings to DB
  → Enqueue one [GATE JOB] per new listing
│
▼
[GATE JOB] (per listing)
  Read user's gatekeeper rules from DB
  Call Gatekeeper AI (Claude/GPT) with job + rules
  Save decision to DB (apply / skip / review)
  If apply=true AND confidence >= threshold:
    → Enqueue [GENERATE JOB]
  If confidence in review range:
    → Mark as "needs review", notify user
  If apply=false:
    → Mark as skipped, log reason
│
▼
[GENERATE JOB] (per approved listing)
  Read user's saved profileId from DB
  Call Resume Builder API: POST /api/resume/generate
  Save resumeId + downloadUrl to DB
  → Enqueue [APPLY JOB]
│
▼
[APPLY JOB] (per generated resume)
  Check: is automation still enabled? (read DB)
  Check: within time window? daily cap not exceeded?
  If any check fails → requeue for later or abort
  Decrypt LinkedIn/Indeed session cookies from DB
  Launch Playwright with stealth + injected cookies
  Navigate to job apply URL
  Fill form fields (name, email, phone, resume upload)
  Submit application
  Log result to DB (success / failed + error message)
  Update daily application count
```

---

### Scheduler Logic (in cron.ts)

```typescript
import cron from 'node-cron';
import { getSchedulerSettings } from './settings';
import { scrapeQueue, applyQueue } from '../queue/jobs';

// Run every 30 minutes — but only actually do work if within user's window
cron.schedule('*/30 * * * *', async () => {
  const settings = await getSchedulerSettings();

  if (!settings.enabled) return; // master switch off

  const now = new Date();
  const hour = now.getHours(); // use user's timezone
  const day = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();

  const withinHours = hour >= settings.timeWindow.startHour &&
                      hour < settings.timeWindow.endHour;
  const withinDays = settings.activeDays[day];

  if (!withinHours || !withinDays) return; // outside schedule

  // Check daily cap
  const todayCount = await getApplicationCountToday();
  if (todayCount >= settings.limits.maxPerDay) return;

  // Kick off scrape → gate → generate → apply pipeline
  await scrapeQueue.add('scrape', { userId: settings.userId });
});
```

---

### Anti-Detection Rules (enforce in ALL Playwright scripts)

```typescript
// /src/automation/anti-detection.ts

export const SAFETY_RULES = {
  // Browser
  headless: false,                     // NEVER headless — detected immediately
  useStealthPlugin: true,              // playwright-extra stealth

  // Rate limits (always check against DB before applying)
  maxApplicationsPerDay: 40,           // absolute hard cap — never exceed
  maxApplicationsPerHour: 8,           // burst protection

  // Timing (randomized — never mechanical)
  delayBetweenApplications: {
    min: 60_000,                       // 1 minute minimum
    max: 180_000,                      // 3 minutes maximum
  },
  delayBetweenClicks: {
    min: 800,
    max: 2500,
  },
  delayBetweenKeystrokes: {
    min: 50,
    max: 150,
  },

  // Human simulation
  randomMouseMovements: true,
  scrollBeforeClick: true,
  randomViewportSize: true,            // vary 1280–1920 width
};

// Helper: random delay
export const randomDelay = (min: number, max: number) =>
  new Promise(r => setTimeout(r, min + Math.random() * (max - min)));
```

---

### Gatekeeper AI (in Worker's /src/gatekeeper/ — but prompt lives in the API route)

> **Actual implementation**: The Gatekeeper AI lives in `POST /api/gatekeeper/evaluate` on the Next.js app.
> The Worker's `/src/gatekeeper/` is an HTTP client that calls that endpoint.
> The prompt content below is still valid — it's used in the API route.

```typescript
// prompt.ts — reference for the prompt used in /api/gatekeeper/evaluate
export const SYSTEM_PROMPT = `
You are a job application gatekeeper. Evaluate job listings against
the user's rules and decide whether they should apply.

Rules for evaluation:
- Experience gaps of 1 year are acceptable. 3+ years gap = reject.
- "Must have" vs "nice to have" — distinguish these in job descriptions.
- If salary is listed and below user's minimum, reject.
- Respect all excluded companies and keywords strictly.
- Apply custom instructions literally and carefully.

Return ONLY valid JSON, no other text, no markdown:
{
  "apply": boolean,
  "confidence": number (0-100),
  "reason": "1-2 sentences",
  "flags": [{ "type": "warning|info|block", "message": "string" }],
  "keywordsFound": ["string"],
  "keywordsMissing": ["string"]
}
`;

export const buildPrompt = (job: JobListing, rules: GatekeeperRules) => `
USER RULES:
${JSON.stringify(rules, null, 2)}

JOB:
Title: ${job.title}
Company: ${job.company}
Location: ${job.location}
Salary: ${job.salary ?? 'Not disclosed'}
Easy Apply: ${job.isEasyApply}
Platform: ${job.platform}

Full Description:
${job.description}

Evaluate and return JSON.
`;
```

---

### Express Routes (thin HTTP layer)

```typescript
// GET /health
{
  "status": "ok",
  "queue": { "waiting": 4, "active": 2, "completed": 847 },
  "scheduler": { "enabled": true, "nextRun": "2024-01-15T14:30:00Z" },
  "sessions": { "linkedin": "valid", "indeed": "expired" },
  "todayCount": 12,
  "dailyCap": 20
}

// POST /trigger/scrape   ← Dashboard can call this for manual scrape
// POST /trigger/apply    ← Dashboard can manually trigger an apply run
// GET /queue/status      ← Live queue depth for dashboard widget
// POST /pause            ← Emergency stop from dashboard
```

---

### Resume Builder Client (in /src/resume-client/)

**v1 approach**: Worker calls existing `POST /api/generate-content` (already generates tailored resumes).
Adds `Authorization: Bearer <api-key>` header. The API route checks: if API key present → verify key, if not → use existing cookie auth.

```typescript
export async function generateResume(
  jobDescription: string,
  profileId: string
): Promise<ResumeResult> {
  const response = await fetch(`${process.env.RESUME_BUILDER_URL}/api/generate-content`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.RESUME_BUILDER_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ jobDescription, profileId }),
  });

  if (!response.ok) {
    throw new Error(`Resume generation failed: ${response.status}`);
  }

  return response.json();
}
```

---

### Worker Checklist

**Setup**
- [ ] Init Node.js + TypeScript project
- [ ] Install: express, bullmq, playwright, playwright-extra, puppeteer-extra-plugin-stealth, node-cron, ioredis, mongodb (mongoose)
- [ ] Set up HTTP client to this app's API (for DB reads/writes via API routes)
- [ ] Set up Redis connection (Upstash or Render Redis)
- [ ] Set up BullMQ queues: scrapeQueue, gateQueue, generateQueue, applyQueue

**Scheduler**
- [ ] Cron job (every 30min) reads settings from this app's API
- [ ] Time window check (hour + day of week + timezone)
- [ ] Daily cap check before starting any run
- [ ] Settings hot-reload (re-read API each tick, no restart needed)

**Scraper**
- [ ] LinkedIn scraper (Playwright, reads criteria from this app's API)
- [ ] Indeed scraper (Publisher API or Playwright fallback)
- [ ] Deduplication (skip jobs already in DB — call API to check)
- [ ] Save raw listings via this app's API

**Gatekeeper**
- [ ] HTTP call to this app's `POST /api/gatekeeper/evaluate`
- [ ] JSON response parsing with fallback handling
- [ ] Save decisions to `gatekeeper_decisions` table
- [ ] Review queue routing (confidence in 40-74 range)

**Resume Generation**
- [ ] HTTP client for Resume Builder API
- [ ] Retry logic (3 attempts, exponential backoff)
- [ ] Save resumeId + downloadUrl to DB

**Playwright Automation**
- [ ] Browser setup with stealth plugin
- [ ] Cookie decryption + injection
- [ ] Session validity check before each run
- [ ] LinkedIn Easy Apply flow
- [ ] Indeed Apply flow
- [ ] Error handling: catch failed applications, log error, continue
- [ ] Anti-detection delays enforced on every action
- [ ] Daily cap enforcement (check DB before each application)

**Notifications**
- [ ] Session expired alert (email)
- [ ] Daily cap reached alert
- [ ] Application failed alert (if pauseOnError = true)
- [ ] Weekly summary email

**Deployment (Render)**
- [ ] `render.yaml` config (Web Service, always-on)
- [ ] All env vars set in Render dashboard
- [ ] Health check endpoint for Render monitoring
- [ ] Playwright browser deps installed (`playwright install chromium`)

---

## DATABASE SCHEMA (Reference Design — Using MongoDB, not Supabase)

> **NOTE**: The original spec used Supabase (Postgres). All of this is implemented as **MongoDB Mongoose models** instead.
> The SQL below is kept as a reference for the data structure. Each table maps to a Mongoose schema.
> MongoDB models go in `src/models/` (e.g. `JobListing.js`, `Application.js`, etc.).

```sql
-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PLATFORM SESSIONS (LinkedIn / Indeed cookies)
-- ============================================================
CREATE TABLE platform_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  platform TEXT NOT NULL,              -- 'linkedin' | 'indeed'
  cookies_encrypted TEXT NOT NULL,     -- AES-256-GCM encrypted JSON
  last_refreshed TIMESTAMPTZ,
  is_valid BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- USER RESUME PROFILE
-- ============================================================
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  profile_json JSONB NOT NULL,         -- full resume profile object
  resume_builder_profile_id TEXT,      -- ID on the Resume Builder site
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- JOB SEARCH CRITERIA
-- ============================================================
CREATE TABLE job_criteria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  titles TEXT[],                       -- ['Frontend Developer', 'React Engineer']
  locations TEXT[],
  remote BOOLEAN DEFAULT TRUE,
  hybrid BOOLEAN DEFAULT TRUE,
  on_site BOOLEAN DEFAULT FALSE,
  min_salary INTEGER,
  max_salary INTEGER,
  platforms TEXT[],                    -- ['linkedin', 'indeed']
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SCHEDULER SETTINGS
-- ============================================================
CREATE TABLE scheduler_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) UNIQUE,
  enabled BOOLEAN DEFAULT FALSE,
  start_hour INTEGER DEFAULT 9,
  end_hour INTEGER DEFAULT 18,
  timezone TEXT DEFAULT 'America/Toronto',
  active_days JSONB DEFAULT '{"monday":true,"tuesday":true,"wednesday":true,"thursday":true,"friday":true,"saturday":false,"sunday":false}',
  max_per_day INTEGER DEFAULT 20,
  max_per_week INTEGER DEFAULT 80,
  max_per_run INTEGER DEFAULT 5,
  min_delay_seconds INTEGER DEFAULT 60,
  max_delay_seconds INTEGER DEFAULT 180,
  gatekeeper_threshold INTEGER DEFAULT 75,
  review_queue_threshold INTEGER DEFAULT 40,
  pause_on_error BOOLEAN DEFAULT TRUE,
  pause_on_session_expiry BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- GATEKEEPER RULES
-- ============================================================
CREATE TABLE gatekeeper_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  target_titles TEXT[],
  exclude_companies TEXT[],
  exclude_keywords TEXT[],
  required_keywords TEXT[],
  min_salary INTEGER,
  allow_remote BOOLEAN DEFAULT TRUE,
  allow_hybrid BOOLEAN DEFAULT TRUE,
  allow_on_site BOOLEAN DEFAULT FALSE,
  seniority_levels TEXT[],
  exclude_seniority_levels TEXT[],
  custom_instructions TEXT,            -- plain English rules
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SCRAPED JOB LISTINGS
-- ============================================================
CREATE TABLE job_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  platform TEXT NOT NULL,              -- 'linkedin' | 'indeed'
  external_id TEXT,                    -- platform's own job ID (dedup)
  title TEXT NOT NULL,
  company TEXT NOT NULL,
  location TEXT,
  salary TEXT,
  description TEXT,
  apply_url TEXT,
  is_easy_apply BOOLEAN DEFAULT FALSE,
  posted_date TIMESTAMPTZ,
  scraped_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'pending',       -- pending|approved|skipped|applied|failed|review
  UNIQUE(platform, external_id, user_id)
);

-- ============================================================
-- GATEKEEPER DECISIONS
-- ============================================================
CREATE TABLE gatekeeper_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES job_listings(id),
  apply BOOLEAN NOT NULL,
  confidence INTEGER,
  reason TEXT,
  flags JSONB,
  keywords_found TEXT[],
  keywords_missing TEXT[],
  overridden_by_user BOOLEAN DEFAULT FALSE,
  override_decision BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SUBMITTED APPLICATIONS
-- ============================================================
CREATE TABLE applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES job_listings(id),
  user_id UUID REFERENCES users(id),
  resume_id TEXT,                      -- resumeId from Resume Builder
  resume_url TEXT,                     -- downloadUrl from Resume Builder
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'submitted',     -- submitted|failed|pending
  error_message TEXT,
  platform TEXT
);

-- ============================================================
-- API KEY USAGE (for Resume Builder rate limiting)
-- ============================================================
CREATE TABLE api_key_usage (
  key_id TEXT NOT NULL,
  date DATE NOT NULL,
  count INTEGER DEFAULT 0,
  PRIMARY KEY (key_id, date)
);

-- ============================================================
-- DAILY APPLICATION COUNTS (Worker reads/writes)
-- ============================================================
CREATE TABLE daily_counts (
  user_id UUID REFERENCES users(id),
  date DATE NOT NULL,
  count INTEGER DEFAULT 0,
  PRIMARY KEY (user_id, date)
);
```

---

## ENVIRONMENT VARIABLES

### Resume Builder + Dashboard (Vercel — same app)
```env
# MongoDB (existing — already set)
MONGODB_URI=mongodb://...
MONGODB_DB=resume-builder

# AI (existing — already set)
GEMINI_API_KEY=xxx

# Worker (add when Worker is deployed)
WORKER_ORIGIN=https://your-worker.onrender.com
NEXT_PUBLIC_APP_URL=https://your-resume-site.vercel.app
```

### Automation Worker (Render)
```env
UPSTASH_REDIS_URL=redis://xxx
UPSTASH_REDIS_TOKEN=xxx
RESUME_BUILDER_URL=https://your-resume-site.vercel.app
RESUME_BUILDER_API_KEY=your-api-key
COOKIE_ENCRYPTION_KEY=32-char-random-string   # AES-256-GCM key
RESEND_API_KEY=xxx             # for email notifications (future)
PORT=3001
```

> **Note**: No Supabase env vars needed. No Anthropic/OpenAI keys — Gatekeeper runs on this app via Gemini.

---

## DEPLOYMENT PLAN

### Resume Builder → Vercel
- Standard Next.js deploy, nothing special
- Add all env vars in Vercel dashboard
- Enable Vercel Blob (or use Supabase Storage)

### Job Engine Dashboard → Vercel
- Standard Next.js deploy
- Add all env vars

### Automation Worker → Render

Create `render.yaml` in worker root:
```yaml
services:
  - type: web
    name: job-automation-worker
    env: node
    buildCommand: npm install && npx playwright install chromium --with-deps && npm run build
    startCommand: npm start
    plan: starter                      # $7/month, always-on
    healthCheckPath: /health
    envVars:
      - key: NODE_ENV
        value: production
      # (set all others in Render dashboard, not here)
```

**Important for Render:** Playwright needs system deps. The build command above
installs Chromium. If it fails, add this to build command:
```
npx playwright install-deps chromium && npx playwright install chromium
```

---

## BUILD ORDER (Phases — Updated)

### Phase 0 — Codebase Audit ✅ (DONE)
- [x] User provides Resume Builder codebase
- [x] AI runs audit, outputs report
- [x] Confirm refactor plan

### Phase 1 — Shared Infrastructure (in existing Next.js app)
- [ ] Add automation Mongoose models (ApiKey, JobListing, Application, etc.)
- [ ] Create `POST /api/gatekeeper/evaluate` — Gatekeeper AI route
- [ ] Create `GET /api/resume/templates` — Templates endpoint
- [ ] Create `GET /api/health` — Health check
- [ ] Add API key auth support to existing `/api/generate-content` (supports both cookie + Bearer)
- [ ] Add API key middleware + management UI (`/api-keys`)
- [ ] Add rate limiting on generation endpoint
- [ ] Add API docs page (`/docs`)
- [ ] Add encryption utilities (AES-256-GCM for cookies)

### Phase 2 — Automation Dashboard (in existing Next.js app at `/automation/*`)
- [ ] Dashboard page with stats from MongoDB
- [ ] Settings: Accounts (cookie paste, encrypted storage)
- [ ] Settings: Criteria (job search filters)
- [ ] Settings: Gatekeeper rules
- [ ] Settings: Scheduler
- [ ] Settings: API keys management
- [ ] Settings: Notifications
- [ ] Jobs page with filters + gatekeeper decisions
- [ ] Job detail page + gatekeeper reasoning
- [ ] Applications history

### Phase 3 — Automation Worker Core
- [ ] Project setup (Node.js + TypeScript + Express at `/worker`)
- [ ] BullMQ + Redis setup
- [ ] HTTP client for this app's API (generate-content, gatekeeper, etc.)
- [ ] Cron scheduler (reads settings via API)
- [ ] LinkedIn scraper (Playwright)
- [ ] Indeed scraper
- [ ] Browser + stealth setup
- [ ] LinkedIn Easy Apply
- [ ] Indeed Apply
- [ ] Anti-detection rules
- [ ] Full end-to-end pipeline (scrape → gate → generate → apply)

### Phase 4 — Polish & Separation Prep
- [ ] Notifications (email alerts)
- [ ] Emergency stop
- [ ] CORS headers (when separating)
- [ ] API documentation
- [ ] 2 resume modes (custom per job + static profile)

## NOTES FOR AI CODING ASSISTANT

### Audit ✅ (Already Done)
- **Codebase audit is complete** — see `a1.md` for full report.
- **Shared libs are already extracted** — `src/lib/ai/`, `src/lib/resume-generator.js`, `src/lib/pdf-generator.js` exist and are in use.

### Architecture Decisions
- **Dashboard is in the same Next.js app** (at `/automation/*`), not a separate Vercel deploy. Reuses existing custom JWT auth.
- **MongoDB is the database**, not Supabase/Postgres. All automation data goes into Mongoose models in `src/models/`.
- **Gatekeeper AI runs in the Next.js app** at `POST /api/gatekeeper/evaluate`, not in the Worker. Worker calls this endpoint via HTTP. This keeps all AI config in one place (`src/lib/ai/config.js`).
- **Worker does NOT connect directly to MongoDB** — it reads/writes through this app's API routes (via Bearer API key auth). This is important for security: the Worker only has the API key, not DB credentials.
- **Resumes are generated on-the-fly** — no PDF storage for v1. The Worker gets the generated content/PDF and submits it immediately.
- **API keys** for Worker → App auth. `ApiKey` Mongoose model + middleware.

### Worker Details
- Plain Node.js + Express (NOT Next.js).
- Has Playwright, BullMQ, Redis — these don't belong in Next.js.
- Calls this app's API for: resume generation, gatekeeper evaluation, DB reads/writes.
- Scheduled via node-cron, reads settings through this app's API (hot-reload each tick).
- **Cookies are sensitive** — always AES-256-GCM encrypt before storing in MongoDB, decrypt in Worker only. Never log decrypted cookies.
- **Never exceed rate limits** — check daily count BEFORE every application attempt.
- **Render deployment** — must install Playwright browser deps during build, not start. Add `npx playwright install chromium --with-deps` to build command.
- **Never hardcode credentials** — 100% env vars.

### Future Separation Prep
- When splitting Dashboard into its own app: extract `/automation/*` pages + relevant API routes + MongoDB models.
- API key auth already supports cross-origin — no auth rewrite needed.
- Add CORS headers at separation time, not before.
- The DB section currently shows SQL schema as a reference design. MongoDB models mirror this structure.
