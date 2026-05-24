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

### Resume Storage

- Store generated PDFs in **Supabase Storage** bucket `resumes`
- Key: `resumes/{resumeId}.pdf`
- Generate signed URL valid for 48 hours
- Clean up expired resumes with a daily cron (in the Worker)
- If user is authenticated on the resume site, optionally save permanently

---

### CORS Config (required — Worker calls this cross-origin)

```typescript
// In every API route handler:
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

---

### Rate Limiting

- 100 resume generations per API key per day
- Track usage in Supabase: `api_key_usage (key_id, date, count)`
- Return `429` with `code: RATE_LIMIT_EXCEEDED` when exceeded

---

### Resume Builder Checklist

**Step 0 (MUST DO FIRST)**
- [ ] User provides codebase
- [ ] AI assistant runs audit and outputs audit report
- [ ] Audit report reviewed and refactor plan confirmed

**Refactor**
- [ ] Move resume generation logic to `/lib/resume-generator.ts`
- [ ] Move PDF generation logic to `/lib/pdf-generator.ts`
- [ ] Create `/app/api/resume/generate/route.ts`
- [ ] Create `/app/api/resume/download/[id]/route.ts`
- [ ] Create `/app/api/resume/preview/[id]/route.ts`
- [ ] Create `/app/api/health/route.ts`
- [ ] Create `/app/api/profile/route.ts` (POST save, GET retrieve)
- [ ] Add API key middleware (`/middleware.ts`)
- [ ] Add Supabase storage for resume PDFs
- [ ] Add CORS headers to all API routes
- [ ] Add rate limiting (100/day per key)
- [ ] Add API key management UI (`/app/api-keys/page.tsx`)
- [ ] Add API docs page (`/app/docs/page.tsx`)
- [ ] Verify existing UI still works after refactor
- [ ] Test all endpoints with curl / Postman

---

## SERVICE 2 — JOB ENGINE DASHBOARD (New — Next.js)

### Goal
A user-facing Next.js dashboard for configuring the automation, browsing scraped
jobs, reviewing gatekeeper decisions, and monitoring application history.
This is purely a **frontend + thin API layer** — all heavy work is delegated to the Worker.

---

### Tech Stack

```
Framework:    Next.js 14+ (App Router, TypeScript)
Auth:         NextAuth.js (email/password or Google OAuth)
Database:     Supabase (shared with Worker via same Postgres instance)
UI:           Tailwind CSS + shadcn/ui
Deployment:   Vercel
```

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

Cookies are AES-256 encrypted before storing in Supabase.

---

### Jobs Page (`/jobs`)

Table of all scraped jobs with columns:
- Title, Company, Location, Platform, Posted, Salary
- Gatekeeper: ✅ Apply (92%) / ⚠️ Review (61%) / ❌ Skip (23%)
- Status: Pending / Applied / Skipped / Failed / In Queue
- Actions: [View] [Apply Now] [Skip] [See Gatekeeper Reasoning]

Filters: Platform, Status, Gatekeeper Decision, Date Range, Title search

---

### Job Engine Dashboard Checklist

- [ ] Project setup: Next.js 14 + Supabase + NextAuth + Tailwind + shadcn/ui
- [ ] Auth: login/logout, protected routes
- [ ] Connect to shared Supabase DB (same instance as Worker)
- [ ] Dashboard page with live stats from DB
- [ ] Jobs page: table with filters and gatekeeper decisions
- [ ] Job detail page: full description + gatekeeper reasoning
- [ ] Applications history page with filters
- [ ] Settings: Profile editor (POST to Resume Builder `/api/profile`)
- [ ] Settings: Accounts (cookie paste + save, encrypted storage)
- [ ] Settings: Criteria (job search filters saved to DB)
- [ ] Settings: Gatekeeper rules form
- [ ] Settings: Scheduler form (all fields above)
- [ ] Settings: API keys (store Resume Builder API key in DB)
- [ ] Settings: Notifications preferences
- [ ] Emergency stop button (sets `scheduler.enabled = false` instantly)
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
AI:            Anthropic SDK (Gatekeeper) or OpenAI SDK
Database:      Supabase JS client (reads/writes shared Postgres)
Storage:       Supabase Storage (download resumes from Resume Builder)
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

### Gatekeeper AI (in /src/gatekeeper/)

```typescript
// prompt.ts
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

```typescript
export async function generateResume(
  jobDescription: string,
  profileId: string
): Promise<ResumeResult> {
  const response = await fetch(`${process.env.RESUME_BUILDER_URL}/api/resume/generate`, {
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
- [ ] Install: express, bullmq, playwright, playwright-extra, puppeteer-extra-plugin-stealth, node-cron, @supabase/supabase-js, @anthropic-ai/sdk, ioredis
- [ ] Set up Supabase client (shared DB with Dashboard)
- [ ] Set up Redis connection (Upstash or Render Redis)
- [ ] Set up BullMQ queues: scrapeQueue, gateQueue, generateQueue, applyQueue

**Scheduler**
- [ ] Cron job (every 30min) reads settings from DB
- [ ] Time window check (hour + day of week + timezone)
- [ ] Daily cap check before starting any run
- [ ] Settings hot-reload (re-read DB each tick, no restart needed)

**Scraper**
- [ ] LinkedIn scraper (Playwright, reads criteria from DB)
- [ ] Indeed scraper (Publisher API or Playwright fallback)
- [ ] Deduplication (skip jobs already in DB)
- [ ] Save raw listings to `job_listings` table

**Gatekeeper**
- [ ] Anthropic/OpenAI API call with system + user prompt
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

## DATABASE SCHEMA (Supabase — shared by Dashboard + Worker)

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

### Resume Builder (Vercel)
```env
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=xxx
SUPABASE_ANON_KEY=xxx
OPENAI_API_KEY=sk-...          # or ANTHROPIC_API_KEY
WORKER_ORIGIN=https://your-worker.onrender.com
NEXT_PUBLIC_APP_URL=https://your-resume-site.vercel.app
```

### Job Engine Dashboard (Vercel)
```env
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=xxx
NEXTAUTH_SECRET=random-32-char-string
NEXTAUTH_URL=https://your-dashboard.vercel.app
WORKER_URL=https://your-worker.onrender.com
RESUME_BUILDER_URL=https://your-resume-site.vercel.app
```

### Automation Worker (Render)
```env
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=xxx
UPSTASH_REDIS_URL=redis://xxx
UPSTASH_REDIS_TOKEN=xxx
RESUME_BUILDER_URL=https://your-resume-site.vercel.app
RESUME_BUILDER_API_KEY=your-api-key
ANTHROPIC_API_KEY=sk-ant-...   # for Gatekeeper
COOKIE_ENCRYPTION_KEY=32-char-random-string   # AES-256 key
RESEND_API_KEY=xxx             # for email notifications
PORT=3001
```

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

## BUILD ORDER (Phases)

### Phase 0 — Codebase Audit
- [ ] User provides Resume Builder codebase
- [ ] AI runs audit, outputs report
- [ ] Confirm refactor plan

### Phase 1 — Resume Builder Refactor
- [ ] Refactor per audit plan
- [ ] Add API endpoints + auth
- [ ] Deploy to Vercel
- [ ] Test API with curl

### Phase 2 — Supabase Setup
- [ ] Create Supabase project
- [ ] Run all SQL schema above
- [ ] Set up Storage bucket for resumes
- [ ] Test DB connection from both Next.js apps

### Phase 3 — Job Engine Dashboard
- [ ] Project setup + auth
- [ ] Settings pages (accounts, criteria, gatekeeper, scheduler)
- [ ] Connect to Supabase
- [ ] Deploy to Vercel (even before Worker is ready)

### Phase 4 — Automation Worker Core
- [ ] Project setup (Node.js + TypeScript + Express)
- [ ] BullMQ + Redis setup
- [ ] Cron scheduler reading from DB
- [ ] Gatekeeper AI (test with sample jobs)
- [ ] Resume Builder API client

### Phase 5 — Scraper
- [ ] LinkedIn scraper (Playwright)
- [ ] Indeed scraper
- [ ] Deduplication
- [ ] Test: run scraper, see jobs in DB, see them in Dashboard

### Phase 6 — Playwright Automation
- [ ] Browser + stealth setup
- [ ] Cookie injection
- [ ] LinkedIn Easy Apply
- [ ] Indeed Apply
- [ ] Full end-to-end test (1 application manually triggered)

### Phase 7 — Scheduler + Automation
- [ ] Cron wired to full pipeline
- [ ] All limit checks enforced
- [ ] Test full run end-to-end with scheduler enabled

### Phase 8 — Polish
- [ ] Notifications (email on session expiry, errors, weekly summary)
- [ ] Dashboard real-time stats
- [ ] Emergency stop from Dashboard
- [ ] Error handling everywhere

---

## NOTES FOR AI CODING ASSISTANT

- **Resume Builder:** DO NOT touch until audit is complete. Audit first, plan, confirm, then refactor.
- **Architecture:** Next.js (Vercel) for both UI apps. Plain Node.js + Express for the Worker. Do not put Playwright or BullMQ in Next.js.
- **TypeScript everywhere** — all three services.
- **Single Supabase instance** — both Next.js apps and the Worker all read/write the same DB.
- **Cookies are sensitive** — always AES-256-GCM encrypt before DB, decrypt in Worker only. Never log decrypted cookies.
- **Never exceed rate limits** — check `daily_counts` table BEFORE every application attempt.
- **Gatekeeper is in the Worker** — not a Next.js API route. The Dashboard only reads gatekeeper decisions from the DB, it doesn't call the AI directly.
- **Scheduler settings are hot** — Worker reads them from DB every cron tick. No restart needed when user changes settings.
- **Render deployment** — Worker must install Playwright browser deps during build, not start. Add `npx playwright install chromium --with-deps` to build command.
- **Never hardcode credentials** — 100% env vars.
- **The Dashboard talks to the Worker** via HTTP (health, trigger, pause endpoints). Keep this interface minimal — DB is the main communication channel.
