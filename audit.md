# ULTIMATE SINGLE-FILE AUDIT & ACTION PLAN

## ATS-Friendly Resume Builder – Complete Codebase Analysis

**Version:** 1.0
**Date:** 2026-06-21
**Scope:** Entire Monorepo (Frontend + API + Services + Automation)

---

## TABLE OF CONTENTS

1. Executive Summary
2. File Inventory & Responsibility Matrix
3. Module Interdependencies & Data Flow
4. Critical Module Deep-Dive Audit
   - 4.1 `src/proxy.js` (Authentication Middleware)
   - 4.2 `src/lib/auth.js` (Token Management)
   - 4.3 `src/services/subscriptionService.js` (Credits & Limits)
   - 4.4 `src/api/generate-content/route.js` (AI Resume Generation)
   - 4.5 `src/api/webhooks/stripe/route.js` (Payment Processing)
5. Unified Gap Analysis (Logical Gaps & Placeholders)
6. Critical Vulnerabilities Matrix (Security, Performance, Integrity)
7. EXACT RESOLUTION STEPS (Actionable Checklist)
8. Architectural Recommendations
9. Conclusion

---

## 1. EXECUTIVE SUMMARY

The application is a **Next.js 14+ SaaS platform** providing AI-powered resume/cover letter generation, ATS optimization, and job automation. It uses OTP/email authentication, Stripe for subscriptions, a role-based permission system, and an external automation worker.

**✅ Strengths:**

- Excellent separation of concerns (Services, Libs, Models).
- Centralised permission system (`ROLE_PERMISSIONS`) enforced via middleware and API guards.
- Atomic credit deduction prevents race conditions.
- Refresh token rotation implemented securely.
- Single source of truth for resume fields (`resumeFields.js`).

**🚨 Critical & Immediate Vulnerabilities:**

1. **`x-user-id` Header Spoofing** – Attacker can impersonate any user.
2. **Missing CSRF Protection** – State-changing endpoints are vulnerable.
3. **Prompt Injection in AI Instructions** – `specialInstructions` not sanitised.
4. **No Rate Limiting on OTP** – Prone to brute-force/spam.
5. **Missing Timeouts on Internal `fetch`** – Middleware can hang indefinitely.

---

## 2. FILE INVENTORY & RESPONSIBILITY MATRIX

### 2.1 Root Configuration

| File                | Responsibility                                                                |
| ------------------- | ----------------------------------------------------------------------------- |
| `src/proxy.js`      | **Authentication Middleware** – Token validation, rotation, route protection. |
| `src/config/env.js` | Single source of truth for environment variables.                             |

### 2.2 Core Libraries (`src/lib/`)

| File                       | Responsibility                                                                            |
| -------------------------- | ----------------------------------------------------------------------------------------- |
| `accessControl.js`         | Permission checking (`hasPermission`, `checkPermission`).                                 |
| `apiKeyAuth.js`            | API key validation, generation, and rate limiting.                                        |
| `apiPermissionGuard.js`    | `requirePermission` middleware for API routes.                                            |
| `apiResponse.js`           | Standardised JSON responses (`ok`, `fail`, `withErrorHandler`).                           |
| `auth-edge.js`             | Edge‑safe token verification (no DB).                                                     |
| `auth.js`                  | Full auth logic with refresh token rotation.                                              |
| `constants.js`             | `ROLES`, `PERMISSIONS`, `PLANS`, `ROUTES`, `TOKEN_CONFIG`.                                |
| `coverLetter-generator.js` | AI cover letter generation core.                                                          |
| `coverLetterFields.js`     | Schema for cover letter content.                                                          |
| `dateUtils.js`             | Pure date helpers.                                                                        |
| `encryption.js`            | AES‑GCM encryption for automation cookies.                                                |
| `logger.js`                | Centralised logger.                                                                       |
| `mongodb.js`               | Mongoose connection singleton.                                                            |
| `pdf-generator.js`         | React-PDF generation core.                                                                |
| `promptConfig.js`          | Role‑based AI prompt building.                                                            |
| `resume-generator.js`      | Core resume generation using AI.                                                          |
| `resumeFields.js`          | **Single source of truth** – Resume schema, Mongoose schema generation, AI prompt schema. |
| `resumeSchema.js`          | AI prompt schema string (derived from `resumeFields`).                                    |
| `serverAuth.js`            | Helper for server action authentication.                                                  |
| `stripe.js`                | Stripe client initialisation.                                                             |
| `subscriptionChecker.js`   | Subscription expiry check and downgrade.                                                  |
| `utils.js`                 | JWT generation/verification, SHA256 hashing.                                              |

### 2.3 AI Runners (`src/lib/ai/`)

| File                  | Responsibility                                             |
| --------------------- | ---------------------------------------------------------- |
| `client.js`           | Unified AI client routing to providers (Gemini, DeepSeek). |
| `config.js`           | Task-to-provider/model mapping.                            |
| `runners/gemini.js`   | Gemini API caller.                                         |
| `runners/deepseek.js` | DeepSeek API caller.                                       |

### 2.4 Database Models (`src/models/`)

| Model                   | Responsibility                                           |
| ----------------------- | -------------------------------------------------------- |
| `User.js`               | User account, role, credits, subscriptions, resume refs. |
| `Resume.js`             | Resume content (dynamic schema).                         |
| `ResumeMetadata.js`     | Resume metadata (jobTitle, companyName).                 |
| `CoverLetter.js`        | Cover letter content and metadata.                       |
| `Transaction.js`        | Stripe payment/subscription records.                     |
| `ApiKey.js`             | API keys for automation worker.                          |
| `DailyCount.js`         | Rate limiting counters.                                  |
| `JobListing.js`         | Scraped job listings.                                    |
| `Application.js`        | Job applications submitted.                              |
| `GatekeeperDecision.js` | AI evaluation decisions per job.                         |
| `GatekeeperRules.js`    | User filtering rules.                                    |
| `JobCriteria.js`        | Job search criteria.                                     |
| `SchedulerSettings.js`  | Automation schedule.                                     |
| `PlatformSession.js`    | Encrypted cookies for LinkedIn/Indeed.                   |
| `NotificationPrefs.js`  | Notification preferences.                                |
| `ApplyInstructions.js`  | Custom AI instructions for applying.                     |
| `refreshToken.js`       | Refresh tokens for JWT rotation.                         |
| `Plan.js`               | (Legacy – not actively used).                            |

### 2.5 Services Layer (`src/services/`)

| Service                         | Responsibility                                       |
| ------------------------------- | ---------------------------------------------------- |
| `userService.js`                | CRUD for users, role, credits, resume associations.  |
| `resumeService.js`              | CRUD for resumes and metadata.                       |
| `subscriptionService.js`        | Credit limits, tracking, daily reset logic.          |
| `aiResumeEditorService.js`      | AI edit of resume content.                           |
| `aiCoverLetterEditorService.js` | AI edit of cover letter content.                     |
| `resumeParsingService.js`       | Extract text from PDF/DOCX and call AI to structure. |

### 2.6 API Routes (`src/app/api/`)

| Path                                  | Purpose                                                        |
| ------------------------------------- | -------------------------------------------------------------- |
| `/api/actions/*`                      | Server Actions for admin, profile, resume.                     |
| `/api/admin/*`                        | Admin endpoints (users, transactions, credits).                |
| `/api/auth/*`                         | OTP send, verify, logout, token rotation, subscription check.  |
| `/api/automation/*`                   | Jobs, applications, criteria, gatekeeper, scheduler, sessions. |
| `/api/checkout/*`                     | Stripe checkout, portal, session verification.                 |
| `/api/cover-letters/*`                | CRUD for cover letters.                                        |
| `/api/edit-resume-with-ai/route.js`   | AI edit with credit deduction.                                 |
| `/api/gatekeeper/evaluate/route.js`   | AI job evaluation.                                             |
| `/api/generate-content/route.js`      | Generate tailored resume.                                      |
| `/api/generate-cover-letter/route.js` | Generate cover letter.                                         |
| `/api/health/route.js`                | Health check.                                                  |
| `/api/parse-resume/route.js`          | Parse PDF/DOCX via AI.                                         |
| `/api/render-pdf-react/route.js`      | Generate PDF blob.                                             |
| `/api/resumes/*`                      | Resume CRUD, master resume handling.                           |
| `/api/user/profile/route.js`          | Get/update profile.                                            |
| `/api/webhooks/stripe/route.js`       | Stripe webhook handler.                                        |
| `/api/api-keys/*`                     | API key management.                                            |

### 2.7 Frontend Pages (`src/app/`)

| Page                      | Purpose                                             |
| ------------------------- | --------------------------------------------------- |
| `admin/dashboard/page.js` | Admin dashboard UI.                                 |
| `ai-edit/page.js`         | AI edit interface.                                  |
| `automation/*`            | Automation dashboard, jobs, applications, settings. |
| `checkout/*/page.js`      | Success/cancel pages.                               |
| `cover-letters/`          | List and detail pages.                              |
| `dashboard/page.js`       | Main dashboard (generation).                        |
| `login/page.js`           | Login via OTP.                                      |
| `onboarding/page.js`      | Collect name/DOB.                                   |
| `pricing/page.js`         | Pricing display.                                    |
| `profile/page.js`         | Profile, manual resume, AI edit.                    |
| `resume-history/page.js`  | List of generated resumes.                          |
| `api-keys/page.js`        | API key management.                                 |
| `page.js`                 | Landing page.                                       |
| `layout.js`               | Root layout with AuthProvider.                      |

### 2.8 Components & Hooks (`src/components/`, `src/hooks/`, `src/context/`)

| Path                                         | Purpose                                                                   |
| -------------------------------------------- | ------------------------------------------------------------------------- |
| `components/common/`                         | `PermissionGate`, `PremiumFeatureLock`, `AccessDenied`, `LoadingSpinner`. |
| `components/cover-letter/`                   | Cover letter PDF template.                                                |
| `components/home/`                           | JD input, special instructions, template selector.                        |
| `components/layout/`                         | Navbar, Footer.                                                           |
| `components/preview/`                        | Template viewer, PDF views, display views.                                |
| `components/profile/`                        | ManualResumeForm, ResumeUpload.                                           |
| `components/resume-templates/pdf-templates/` | 6 React-PDF templates (Classic, Modern, etc.).                            |
| `components/ResumeList.js`                   | Resume card list.                                                         |
| `hooks/useApiClient.js`                      | Fetch wrapper with credentials.                                           |
| `hooks/useProfile.js`                        | Fetch user profile.                                                       |
| `hooks/useResumes.js`                        | Resume CRUD operations.                                                   |
| `context/AuthContext.js`                     | Auth state provider.                                                      |

---

## 3. MODULE INTERDEPENDENCIES & DATA FLOW

### 3.1 Authentication Flow

[User] → Login (OTP) → /api/auth/verify-otp → JWT tokens (HttpOnly cookies)
[Subsequent Request] → proxy.js validates access token → inject x-user-id
[Token Expired] → proxy.js calls /api/auth/verify-token (refresh rotation)
[Subscription Check] → proxy.js calls /api/auth/check-subscription (every 5 min)

text

### 3.2 Resume Generation Flow

[UI] → /api/generate-content → requirePermission (checks role)
→ sanitise job description (strip injection patterns)
→ generateResume (core) → buildPromptForRole (role-based prompt)
→ callAI (Gemini/DeepSeek) → parse JSON
→ subscriptionService.trackUsage (deduct credit)
→ save to Resume model → return to UI

text

### 3.3 Automation Flow

[Worker] → API Key (Bearer token) → resolveUserId (validates API key)
→ /api/automation/jobs (CRUD) → /api/gatekeeper/evaluate (AI)
→ /api/automation/applications (store results)
→ sync with JobListing status

text

### 3.4 Payment Flow

[User] → /api/checkout/create-session → Stripe Checkout
[Stripe] → Redirect to /checkout/success
[Stripe] → Webhook to /api/webhooks/stripe:

checkout.session.completed → User role → SUBSCRIBER, set expiry, reset credits.

invoice.payment_succeeded → Renew expiry, reset credits.

customer.subscription.deleted → Downgrade to USER.

text

---

## 4. CRITICAL MODULE DEEP-DIVE AUDIT

### 4.1 `src/proxy.js` – Authentication Middleware

**Purpose:** Intercepts all protected routes, validates JWT, rotates tokens, checks subscriptions, injects `x-user-id`.

**Key Logic:**

1. Categorises route (`isApiRoute`, `isProtectedRoute`, `isAdminRoute`, etc.).
2. Bypasses public routes and API key (Bearer) requests.
3. Reads `accessToken`/`refreshToken` from cookies.
4. Calls `verifyAuthEdge` to validate access token.
5. If access token expired, calls `/api/auth/verify-token` to rotate.
6. Checks subscription status (cached every 5 min).
7. Constructs response: redirect/401 or injects `x-user-id` header.
8. Sets new cookies if tokens rotated.

**Errors & Gaps:**

- ❌ **Does NOT overwrite existing `x-user-id` header** (Critical spoofing risk).
- ❌ **No CSRF protection** for state-changing requests.
- ❌ **No timeout** on internal `fetch` calls (can hang).
- ❌ **Silent failure** on token rotation (user logged out without warning).

---

### 4.2 `src/lib/auth.js` – Token Management

**Purpose:** JWT generation, verification, and secure refresh token rotation.

**Key Functions:**

- `verifyAccessToken()` – uses `jose` to verify signature/expiry.
- `rotateRefreshToken(refreshToken, reqInfo)` – validates token, checks DB, deletes used token, creates new pair, stores new refresh token in DB.

**Errors & Gaps:**

- ✅ Implements proper rotation (deletes old tokens, uses hashed DB storage).
- ✅ `handleStolenToken` deletes all user refresh tokens on theft.
- ❌ No retry logic on DB operations.

---

### 4.3 `src/services/subscriptionService.js` – Credits & Limits

**Purpose:** Calculate credit limits, track usage, reset daily limits.

**Key Functions:**

- `getLimit(user)` – returns `Infinity` for admins, `PRO` limits for subscribers, else `FREE`.
- `trackUsage(userId, amount)` – atomic increment with `findOneAndUpdate` condition.
- `checkAndResetDailyLimits(user)` – resets creditsUsed to 0 if new day (free users).

**Errors & Gaps:**

- ✅ Atomic update prevents race conditions.
- ✅ Uses `Infinity` correctly for admins.
- ❌ Monthly reset for subscribers relies on Stripe webhook; if webhook fails, credits are not reset.

---

### 4.4 `src/api/generate-content/route.js` – AI Resume Generation

**Purpose:** Generate tailored resume from job description.

**Key Logic:**

1. Resolves user (API key or JWT).
2. Requires `GENERATE_RESUME` permission.
3. Sanitises job description (regex injection patterns).
4. Calls `generateResume` with role-based prompt.
5. Deducts credit via `trackUsage`.
6. Saves resume if `save=true`.

**Errors & Gaps:**

- ✅ Injection sanitisation for job description.
- ❌ **Special instructions are NOT sanitised** – arbitrary text sent to AI (prompt injection risk).
- ❌ No file size limit on incoming payload.

---

### 4.5 `src/api/webhooks/stripe/route.js` – Payment Processing

**Purpose:** Handle Stripe webhooks for subscription lifecycle.

**Key Logic:**

1. Verifies webhook signature using `stripe.webhooks.constructEvent`.
2. Handles `checkout.session.completed`, `invoice.payment_succeeded`, `customer.subscription.deleted`.
3. Updates user role, expiry, resets credits.
4. Creates `Transaction` record.

**Errors & Gaps:**

- ✅ Signature verification is correct.
- ❌ **No idempotency check** – duplicate events could create duplicate transactions.
- ❌ If database update fails, webhook returns 200 (Stripe assumes success) – should return 500 to retry.

---

## 5. UNIFIED GAP ANALYSIS (Logical Gaps & Placeholders)

### 5.1 Explicit Placeholders

- None (no `TODO` or `FIXME` comments remain).

### 5.2 Implicit Gaps

- **Hardcoded Public API Routes** in `proxy.js` – new public routes must be manually added.
- **No OTP Rate Limiting** – vulnerable to abuse/spam.
- **No File Upload Size Limit** – `/api/parse-resume` could be overwhelmed with huge files.
- **No Cookie Domain Attribute** – may cause issues if app runs on subdomains.
- **No Retry Logic** for AI calls (rate limits, transient failures).
- **No Idempotency in Webhooks** – risk of duplicate processing.
- **No Audit Log** for admin actions (role changes, credit adjustments).
- **No Graceful Shutdown** – DB connections remain open on server stop.
- **Inconsistent Subscription Check** – if check fails, stale role persists until next attempt.
- **No Cache for Template List** – reads filesystem every time.

---

## 6. CRITICAL VULNERABILITIES MATRIX

### 6.1 Security Risks

| ID     | Risk                                                 | Severity     | Affected Module                           |
| ------ | ---------------------------------------------------- | ------------ | ----------------------------------------- |
| **S1** | `x-user-id` Header Spoofing                          | **Critical** | `proxy.js`                                |
| **S2** | Missing CSRF Protection                              | **Critical** | All API routes                            |
| **S3** | Prompt Injection (Special Instructions)              | **High**     | `generate-content`, `edit-resume-with-ai` |
| **S4** | No OTP Rate Limiting                                 | **High**     | `/api/auth/otp`                           |
| **S5** | Bearer Token Bypass (if route omits `resolveUserId`) | **High**     | All API key routes                        |
| **S6** | Cookie `secure` flag depends on `env.isProduction`   | **Medium**   | `proxy.js`, `auth/verify-otp`             |
| **S7** | No HTTPS Redirect                                    | **Medium**   | `proxy.js`                                |

### 6.2 Performance & Reliability Risks

| ID     | Risk                            | Severity   | Affected Module         |
| ------ | ------------------------------- | ---------- | ----------------------- |
| **P1** | No Timeouts on Internal `fetch` | **High**   | `proxy.js`              |
| **P2** | No Retry for AI Calls           | **Medium** | `lib/ai/client.js`      |
| **P3** | No Idempotency in Webhooks      | **High**   | `api/webhooks/stripe`   |
| **P4** | No File Size Limit for Uploads  | **Low**    | `/api/parse-resume`     |
| **P5** | Template List Un-cached         | **Low**    | `/api/resume/templates` |

### 6.3 Data Integrity Risks

| ID     | Risk                           | Severity   | Affected Module       |
| ------ | ------------------------------ | ---------- | --------------------- |
| **D1** | Webhook DB failure returns 200 | **High**   | `api/webhooks/stripe` |
| **D2** | No Database Transactions       | **Medium** | All services          |

---

## 7. EXACT RESOLUTION STEPS (Actionable Checklist)

### 🔴 CRITICAL (Fix Immediately)

#### 1. Fix `x-user-id` Header Spoofing

**File:** `src/proxy.js`

**Change this:**

```js
const requestHeaders = new Headers(req.headers);
requestHeaders.set('x-user-id', authResult.userId);
To:

js
const requestHeaders = new Headers(req.headers);
// Security: Always overwrite client-supplied x-user-id
requestHeaders.set('x-user-id', authResult.userId);
2. Add CSRF Protection
File: src/proxy.js

Add middleware block for non-GET API routes:

js
if (isApiRoute && !isPublicApiRoute && req.method !== 'GET' && req.method !== 'HEAD') {
  const csrfToken = req.headers.get('x-csrf-token');
  const cookieCsrf = req.cookies.get('csrfToken')?.value;
  if (!csrfToken || !cookieCsrf || csrfToken !== cookieCsrf) {
    return new NextResponse(JSON.stringify({ error: 'Invalid CSRF token' }), { status: 403 });
  }
}
Client-side: In useApiClient, read csrfToken cookie and add header.

3. Sanitise Special Instructions
File: src/api/generate-content/route.js

Apply the same sanitisation as job description:

js
const sanitisedSpecial = sanitizeJobDescription(rawSpecialInstructions || '');
4. Add OTP Rate Limiting
File: src/app/api/auth/otp/route.js

Implement a simple in-memory cache (or Redis):

js
const rateLimit = new Map(); // key: email, value: { count, resetTime }
if (rateLimit.has(email)) {
  const entry = rateLimit.get(email);
  if (Date.now() < entry.resetTime && entry.count >= 5) {
    return fail('Too many OTP requests. Please wait.', 429);
  }
}
5. Enforce HTTPS in Production
File: src/proxy.js

Add at the top:

js
if (env.isProduction && req.nextUrl.protocol === 'http:') {
  const url = new URL(req.url);
  url.protocol = 'https:';
  return NextResponse.redirect(url);
}
🟠 HIGH PRIORITY (Next Sprint)
6. Add Timeouts to Internal Fetch
File: src/proxy.js

js
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 5000);

try {
  const res = await fetch(url, { signal: controller.signal });
} catch (error) {
  if (error.name === 'AbortError') {
    console.error('Request timed out');
  }
} finally {
  clearTimeout(timeoutId);
}
7. Implement Webhook Idempotency
File: src/api/webhooks/stripe/route.js

Before creating a transaction:

js
const existing = await Transaction.findOne({ stripePaymentId: session.payment_intent });
if (existing) {
  console.log('Duplicate webhook event, ignoring');
  return ok({ received: true });
}
8. Add Retry Logic for AI Calls
File: src/lib/ai/client.js

Wrap the runner call with a retry loop (2 attempts, exponential backoff):

js
for (let attempt = 0; attempt < 2; attempt++) {
  try {
    return await runner.run(...);
  } catch (err) {
    if (attempt === 0) await new Promise(r => setTimeout(r, 1000));
    else throw err;
  }
}
9. Validate x-user-id Header Format
File: src/proxy.js

js
if (!authResult.userId || typeof authResult.userId !== 'string') {
  // treat as unauthenticated
}
🟡 MEDIUM PRIORITY (Backlog)
10. Remove Unused Import
File: src/proxy.js

diff
- import crypto from 'crypto';
11. Cache Template List
File: src/app/api/resume/templates/route.js

Cache in memory with 1-hour TTL.

12. Add File Size Limit
File: src/app/api/parse-resume/route.js

Check file.size before processing (e.g., limit 5MB).

13. Add Audit Logging
Create src/models/AuditLog.js and log admin actions (role changes, credit adjustments, user deletions).

14. Use Configuration Array for Public API Routes
File: src/proxy.js

js
const PUBLIC_API_PREFIXES = ['/api/auth', '/api/webhooks'];
const isPublicApiRoute = PUBLIC_API_PREFIXES.some(p => pathname.startsWith(p));
15. Use req.nextUrl.origin for Internal Fetch
File: src/proxy.js

diff
- const protocol = req.headers.get('x-forwarded-proto') || 'http';
- const host = req.headers.get('host');
- const url = `${protocol}://${host}/api/auth/verify-token`;
+ const url = `${req.nextUrl.origin}/api/auth/verify-token`;
8. ARCHITECTURAL RECOMMENDATIONS
8.1 Implement Redis for Rate Limiting & Session Store
Replace in-memory OTP limit with Redis for persistence across server restarts.

Store API key rate limits in Redis.

Cache subscription status to reduce DB hits.

8.2 Separate Authentication Service
Move JWT generation/validation to a dedicated microservice to reduce coupling.

This is a longer-term goal but improves security and scalability.

8.3 Implement Structured Logging
Use pino or winston with correlation IDs (X-Request-ID).

Send logs to a centralised system (e.g., Datadog, ELK) for easier debugging.

8.4 Write Integration Tests
Critical flows:

Authentication (OTP, token rotation).

Resume generation (credit deduction, AI call, save).

Stripe webhook (simulate events).

Automation API (with API key auth).

8.5 Add Graceful Shutdown
js
process.on('SIGTERM', async () => {
  await mongoose.disconnect();
  process.exit(0);
});
8.6 Update .env.example
Document all required environment variables:

text
ACCESS_TOKEN_SECRET=
REFRESH_TOKEN_SECRET=
MONGODB_URI=
GEMINI_API_KEY=
DEEPSEEK_API_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
BREVO_API_KEY=
BREVO_SENDER_EMAIL=
COOKIE_ENCRYPTION_KEY=
WORKER_URL=
NEXT_PUBLIC_APP_URL=
9. CONCLUSION
The codebase is well-structured and follows modern Next.js patterns with a clear separation of concerns. The permission system, service layer, and AI integration are implemented thoughtfully.

However, several critical security vulnerabilities exist due to:

Trusting the x-user-id header from the client.

Missing CSRF protection.

Unsanitised AI special instructions.

Lack of OTP rate limiting.

With the fixes provided in Section 7, the application can be made production‑ready and secure. The architectural recommendations (Section 8) will further improve scalability and maintainability over time.

End of Audit Document

```

Summary of All Payment Fixes (Consolidated)
Priority Fix File
🔴 Critical Add idempotency check before creating transaction. api/webhooks/stripe/route.js
🔴 Critical Return 500 on DB failure (not 200). api/webhooks/stripe/route.js
🔴 Critical Add handler for invoice.payment_failed – set status past_due, send alert. api/webhooks/stripe/route.js
🟠 High Add handler for invoice.payment_action_required. api/webhooks/stripe/route.js
🟠 High Listen to customer.subscription.updated to handle period-end cancellations gracefully. api/webhooks/stripe/route.js
🟡 Medium Add tax_behavior to checkout session. api/checkout/create-session/route.js
🟡 Medium Add promo code support (optional). api/checkout/create-session/route.js
🟡 Medium Add monitoring/alerts for webhook failures. api/webhooks/stripe/route.js
🟡 Low Remove or refactor legacy Plan model. models/plan.js
