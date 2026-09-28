# Site Audit

> **Last Updated:** 2026-09-28

> **Scope:** Full-codebase review of the active site (`src/`): auth/session flow, edge middleware proxy, Stripe billing & credits, permissions, all API routes, pages/components/hooks, PDF templates, AI runners & prompt configuration, database models, and error handling. Verified with `npm run lint`, `npm test`, `npm run build`.

---

## 2026-09-28 Security Audit Remediation

Full-codebase security audit. All 11 task groups were remediated in the tree; the
authorization, entitlement, input-handling and audit-trail findings are closed and
covered by tests (23 → 139 tests). Items deliberately left open are listed in
`docs/to-do.md`.

| Severity | Issue | Location | Status |
| :--- | :--- | :--- | :--- | :--- |
| 🔴 **CRITICAL** | **Privilege escalation — a DEVELOPER could self-promote to root ADMIN.** `PUT /api/admin/roles` was guarded only by the developer-tier `manage_roles`, so a DEVELOPER could grant themselves any permission and then PATCH their own account to role `0` (self-promotion was explicitly permitted; only self-demotion was blocked). The only other guard was client-side. | `src/app/api/admin/roles/route.js`, `src/app/api/admin/users/[id]/role/route.js`, `src/lib/constants.js`, `src/lib/roleAuthorization.js` | ✅ Fixed — new root-ADMIN-only `delegate_role_management` permission (non-delegable/admin-only metadata), roleValue `0` refused, no granting a permission you don't hold, rank ceiling, self-escalation guard, audit records |
| 🔴 **CRITICAL** | **User deletion gated on the wrong permission.** `DELETE /api/admin/users/[id]` required `access_admin_panel` (developer-tier) instead of the admin-only `delete_user`, letting any DEVELOPER cascade-delete an account and cancel its Stripe subscription. | `src/app/api/admin/users/[id]/route.js` | ✅ Fixed — requires `delete_user`; id shape validated; rank ceiling; `user.deleted` audit event |
| 🟠 **HIGH** | **verify-session replay = unlimited free credits.** Every call re-ran the upgrade `findByIdAndUpdate` (resetting `creditsUsed` to `0` and forcing role/status to SUBSCRIBER/active) with no consumed-session guard, so a paying user could re-POST their own paid `sessionId` forever, and a cancelled/expired subscriber could revive Pro indefinitely. | `src/app/api/checkout/verify-session/route.js` | ✅ Fixed — single-use via the `Transaction` row (409 on replay, nothing changed), `creditsUsed` reset removed, no reactivation of cancelled/expired subscriptions, audit events |
| 🟠 **HIGH** | **Expired subscribers kept Pro limits.** `SubscriptionService.getLimit` never compared `subscriptionExpiresAt`, so a lapsed subscriber kept Pro credits until the periodic downgrade ran (the proxy only triggers it every 5 minutes, best-effort). `isSubscriptionActive` was dead code. | `src/services/subscriptionService.js`, `src/lib/subscriptionChecker.js` | ✅ Fixed — `getLimit` now requires `isSubscriptionActive`; boundary-exact tests |
| 🟡 **MEDIUM** | **A DB outage broadened access.** `hasPermissionDB` swallowed DB errors and fell back to the compile-time constants, restoring a revoked grant; the 60s role cache was never invalidated after a roles write. | `src/lib/accessControl.js` | ✅ Fixed — fails closed (deny, or a verified last-known-good DB snapshot bounded to 5 minutes), constants used only for an unseeded/empty store; `invalidateRoleCache()` called from the roles PUT |
| 🟡 **MEDIUM** | **Four routes bypassed the 256 KB body guard** (`raw await req.json()`): user profile PUT, resumes POST, resumes/master PUT, auth/verify-token POST. `docs/architecture.md` falsely claimed profile PUT used the guard. | those four routes + `src/app/api/cover-letters/route.js` | ✅ Fixed — all five use `readJson`; doc corrected |
| 🟡 **MEDIUM** | **No audit trail for sensitive mutations** (role/permission rewrites, role changes, credit adjustments/resets, user deletion — stdout only) and **no CSRF defence** on state-changing API routes. | `src/models/AuthorizationEvent.js`, `src/lib/auditLog.js`, `src/lib/csrf.js`, `src/proxy.js` | ✅ Fixed — durable audit model + writer on every admin write and the upgrade; Origin/`Sec-Fetch-Site` allow-list (env-driven, fails closed) on non-GET API requests |
| 🟡 **MEDIUM** | **Prompt injection / dead rate limiting / IP spoofing.** `recipientName` and the profile name were interpolated raw into the cover-letter prompt; `resolveUserId`'s `rateLimit` option was passed by no route (so every API-key call was unmetered); the OTP throttle keyed on the forgeable `x-forwarded-for`. | `src/lib/coverLetter-generator.js`, `src/app/api/generate-cover-letter/route.js`, `src/lib/apiKeyAuth.js`, four AI routes, `src/app/api/auth/otp/route.js` | ✅ Fixed — names sanitized + capped (route and library), daily API-key caps wired, throttle keyed on a hash of the platform IP |
| 🟢 **LOW** | **Token pinning, status codes, unbounded limit, unmetered cover-letter path.** `jwtVerify` ran without an `algorithms` allowlist (HS384/HS512 accepted); `apiPermissionGuard` returned 404 for a missing user and 500 (CastError) for a malformed id while the proxy emitted a bare 401; admin transactions had an unbounded `limit`; `POST /api/cover-letters` charged no credit. | `src/lib/utils.js`, `src/lib/auth-edge.js`, `src/lib/apiPermissionGuard.js`, `src/app/api/admin/transactions/route.js`, `src/app/api/cover-letters/route.js` | ✅ Fixed — HS256 pinned in both verifiers, 401/403 split with machine-readable codes + id-shape validation, limit clamped, cover-letter creation metered with refund |
| 🟢 **LOW** | **UI / accessibility / dead code.** Unlabelled job-description textarea, silently discarded manual-form edits, missing `required` attributes and a `details` field the API never returned, index-as-React-key, Escape handler on a non-focusable `div`, admin Plan column always "Free". Dead code removed: `src/models/plan.js`, `generateApiKey`, `isStripeConfigured`, `sanitizeJobDescriptionWithInfo`, and two unused devDependencies. | see `docs/architecture.md` per-file notes | ✅ Fixed — all items addressed; `isSubscriptionActive` and `checkRateLimit` deliberately kept (now used) |
| 🟢 **LOW** | **Stale documentation.** `docs/to-do.md` listed already-fixed items as open CRITICALs and buried the two genuinely open ones; `docs/suggestions.md` claimed no open vulnerabilities despite the three above; `README.md` linked a purged automation README; two `docs/architecture.md` claims were wrong. | `docs/to-do.md`, `docs/suggestions.md`, `README.md`, `docs/architecture.md` | ✅ Fixed — open-items list regenerated from the tree, Tasks 1–3 logged as vulnerabilities, dead link removed, incorrect claims corrected |

**Explicitly NOT changed (audited CLEAN, out of scope):** JWT + rotating refresh-token scheme,
IDOR scoping on resumes/cover letters, XSS, mass assignment, secret handling, Stripe
signature verification, PDF template allowlisting, and the verify-session userId metadata check.

---

## 2026-09-26 Follow-up Audit (verification + new findings)

Re-verified every 2026-09-11 item against current code — the 10 code items are
**all fixed in the tree** (the `f6e9cd2` commit landed the fixes but `audit.md`
was never updated). Verified: `npm run lint` clean, `npm test` 23/23 green,
`npm run build` green.

| Severity | Issue | Location | Status |
| :--- | :--- | :--- | :--- |
| 🔴 **CRITICAL** | Resume Generation Save Failure & Double Credit Charge | `src/app/api/generate-content/route.js`, `src/app/dashboard/page.js` | ✅ Fixed — uses `ResumeService.createResume` + `addGeneratedResume` |
| 🔴 **CRITICAL** | Missing Proxy Route Guards for `/cover-letters` and `/ai-edit` | `src/proxy.js` | ✅ Fixed — in both `isProtectedRoute` and `config.matcher` |
| 🟠 **HIGH** | Credit Leak on Resume Creation Failure | `src/app/api/resumes/route.js` | ✅ Fixed — try/catch with `refundUsage` |
| 🟠 **HIGH** | AI JSON Parser Fragility with Preambles | `gemini.js`, `deepseek.js` | ✅ Fixed — slices between first `{` and last `}` |
| 🟡 **MEDIUM** | Template Selector Default ID Mismatch | `TemplateViewer.js` | ✅ Fixed — `ClassicTemplate` |
| 🟡 **MEDIUM** | Proxy Internal `fetch` Missing Timeout & Using Raw Host | `src/proxy.js` | ✅ Fixed — `req.nextUrl.origin` + `AbortSignal.timeout(5000)` |
| 🟡 **MEDIUM** | Orphaned Page `/resume-history` | `Navbar.js` | ✅ Fixed — History link in desktop + mobile nav |
| 🟡 **MEDIUM** | Pricing Page Light Mode Inconsistency | `pricing/page.js` | ✅ Fixed — dark `glass-card` theme |
| 🟢 **LOW** | ESLint exhaustive-deps warnings | admin dashboard, cover-letters | ✅ Fixed — `npm run lint` clean |
| 🟢 **LOW** | Vitest ESM Config Warning | `vitest.config.js` | ✅ Fixed 2026-09-26 — renamed to `vitest.config.mjs` |
| 🟢 **LOW** | Direct `req.json()` without size caps | resumes/[id], cover-letters/[id], admin/roles | ✅ Fixed — all three use `readJson`; also migrated `checkout/create-session` to `readJson` 2026-09-26 |
| 🔴 **CRITICAL (new)** | **`next build` crashed without Stripe keys** — `src/lib/stripe.js` threw at import time, breaking build/CI/fresh clones | `src/lib/stripe.js` + 5 consumers | ✅ Fixed 2026-09-26 — lazy `getStripe()` singleton, callers return 503 when unconfigured |
| 🟠 **HIGH (new)** | **`next build` crashed without `MONGODB_URI`** — `src/lib/mongodb.js` threw at import time | `src/lib/mongodb.js` | ✅ Fixed 2026-09-26 — env read moved inside `dbConnect()` |
| 🔴 **CRITICAL (new)** | **Refresh-token grace replay** — `rotateRefreshToken()` reset `supersededAt` on every replay, letting a captured token live forever | `src/lib/auth.js` | ✅ Fixed 2026-09-26 — first `supersededAt` kept |

---

## 2026-09-11 Deep-Dive System Audit Summary

| Severity | Issue | Impact | Location | Status |
| :--- | :--- | :--- | :--- | :--- |
| 🔴 **CRITICAL** | **Resume Generation Save Failure & Double Credit Charge** | Generated resumes fail to save due to a Mongoose `CastError` on `metadata` (`ObjectId` vs object). The frontend falls back to `createResume()`, triggering a **double credit deduction** or failing with 403 if the user only had 1 credit. | `src/app/api/generate-content/route.js`<br>`src/app/dashboard/page.js` | 🔴 Open |
| 🔴 **CRITICAL** | **Missing Proxy Route Guards for `/cover-letters` and `/ai-edit`** | Unauthenticated users can load `/cover-letters`, `/cover-letters/[id]`, and `/ai-edit` directly without edge proxy redirects to `/login`. | `src/proxy.js` | 🔴 Open |
| 🟠 **HIGH** | **Credit Leak on Resume Creation Failure** | In `POST /api/resumes`, credits are deducted before creation, but not refunded if database creation fails. | `src/app/api/resumes/route.js` | 🟠 Open |
| 🟠 **HIGH** | **AI JSON Parser Fragility with Preambles** | `parseGeminiJson` and `parseDeepSeekJson` only trim after the last `}`, but do not strip preambles before the first `{`, throwing parse errors on conversational AI responses. | `src/lib/ai/runners/gemini.js`<br>`src/lib/ai/runners/deepseek.js` | 🟠 Open |
| 🟡 **MEDIUM** | **Template Selector Default ID Mismatch** | `TemplateViewer` defaults to `"ClassicTemplate.js"`, whereas `/api/resume/templates` provides `"ClassicTemplate"`. The dropdown displays "Professional" while the preview renders "Classic". | `src/components/preview/TemplateViewer.js` | 🟡 Open |
| 🟡 **MEDIUM** | **Proxy Internal `fetch` Missing Timeout & Using Raw Host** | Calls to `/api/auth/verify-token` and `/api/auth/check-subscription` inside `src/proxy.js` can hang without a timeout signal, and construct URLs using raw headers rather than `req.nextUrl.origin`. | `src/proxy.js` | 🟡 Open |
| 🟡 **MEDIUM** | **Orphaned Page: `/resume-history` Unreachable via Navigation** | `/resume-history` has no navigational links anywhere in the navbar or application UI. | `src/components/layout/Navbar.js` | 🟡 Open |
| 🟡 **MEDIUM** | **Pricing Page Light Mode Theme Inconsistency** | `/pricing` is hardcoded with light Tailwind styling (`bg-gray-50`, white cards), clashing with the dark glassmorphic theme across the rest of the application. | `src/app/pricing/page.js` | 🟡 Open |
| 🟢 **LOW** | **ESLint Missing Dependencies Warnings** | Two `useEffect` exhaustive-deps warnings in `admin/dashboard/page.js` and `cover-letters/page.js`. | `src/app/admin/dashboard/page.js`<br>`src/app/cover-letters/page.js` | 🟢 Open |
| 🟢 **LOW** | **Vitest ESM Config Warning** | `vitest.config.js` triggers a Node/Vite CommonJS warning when loaded as `.js`. | `vitest.config.js` | 🟢 Open |
| 🟢 **LOW** | **Direct `req.json()` Calls Without Size Caps** | Inconsistent body reading in several mutation routes returning 500 on malformed JSON instead of 400. | `src/app/api/resumes/[id]/route.js`<br>`src/app/api/cover-letters/[id]/route.js`<br>`src/app/api/admin/roles/route.js` | 🟢 Open |

---

## Detailed Findings & Technical Analysis

### 1. 🔴 Resume Generation Save Failure & Double Credit Charging
- **Location:** `src/app/api/generate-content/route.js` (lines 76-86), `src/app/dashboard/page.js` (lines 96-101)
- **Root Cause:**
  In `POST /api/generate-content`:
  ```javascript
  const resumeDoc = await Resume.create({
    userId: user._id,
    content: tailoredData.resume || tailoredData,
    metadata: tailoredData.metadata || undefined,
  });
  ```
  In `models/resume.js`, `metadata` is an `ObjectId` referencing `ResumeMetadata`. `tailoredData.metadata` is a plain JavaScript object `{ jobTitle, companyName }`. Mongoose throws `CastError: Cast to ObjectId failed for value "{ jobTitle: ... }"`.
  The error is caught at line 83 (`catch (saveErr)`), logged, and swallowed. `resumeId` remains `null`.
  On the client (`src/app/dashboard/page.js` line 99), since `resumeId` is null and `saveResume` is true, it falls back to:
  ```javascript
  await createResume(resume, metadata);
  ```
  `createResume` sends `POST /api/resumes`, which **deducts another credit** at line 65 (`SubscriptionService.trackUsage(userId, 1)`).
  - If the user had 1 credit: the initial generation spends it; the fallback save fails with `403 Insufficient credits`, and the generated resume is lost.
  - If the user had multiple credits: they are billed 2 credits for a single resume generation.
- **Remediation:**
  1. In `POST /api/generate-content`, use `ResumeService.createResume(user._id, tailoredData.resume || tailoredData, tailoredData.metadata)` which properly creates both the `Resume` and `ResumeMetadata` documents.
  2. Call `await UserService.addGeneratedResume(user._id, resumeDoc._id)` so the resume appears in `user.generatedResumes`.
  3. Return `resumeId = resumeDoc._id.toString()`.

---

### 2. 🔴 Missing Route Guards for `/cover-letters` and `/ai-edit`
- **Location:** `src/proxy.js` (lines 21, 171-180)
- **Root Cause:**
  `isProtectedRoute` lists:
  ```javascript
  ['/dashboard', '/profile', '/onboarding', '/resume-history', '/checkout']
  ```
  And `config.matcher` mirrors this list. `/cover-letters`, `/cover-letters/:path*`, `/ai-edit`, and `/ai-edit/:path*` are absent.
  Unauthenticated requests load `/cover-letters` and `/ai-edit` without proxy intervention. `/cover-letters/page.js` does not redirect to `/login` on mount, displaying an empty state with failing API requests.
- **Remediation:**
  Add `/cover-letters/:path*` and `/ai-edit/:path*` to both `isProtectedRoute` and `config.matcher` in `src/proxy.js`.

---

### 3. 🟠 Credit Leak on Manual Resume Creation Failure
- **Location:** `src/app/api/resumes/route.js` (lines 65-82)
- **Root Cause:**
  Credits are deducted before creation via `SubscriptionService.trackUsage(userId, 1)`. If `ResumeService.createResume` or `UserService.addGeneratedResume` throws an error (e.g. database disconnect or schema error), no credit refund is performed in a catch block (unlike `/api/generate-content` and `/api/edit-resume-with-ai`).
- **Remediation:**
  Wrap creation in a try/catch and call `await SubscriptionService.refundUsage(userId, 1)` if an error occurs.

---

### 4. 🟠 AI JSON Parser Fragility with Preambles
- **Location:** `src/lib/ai/runners/gemini.js` (lines 42-51), `src/lib/ai/runners/deepseek.js` (lines 58-67)
- **Root Cause:**
  Both `parseGeminiJson` and `parseDeepSeekJson` clean markdown code fences and slice `clean.substring(0, lastBrace + 1)`. If the LLM generates any leading conversational text before the opening `{` (e.g. `"Certainly! Here is your resume JSON:"`), the preamble remains at the start of the string, causing `JSON.parse` to fail and throw an `AI parse error`.
- **Remediation:**
  Extract the JSON payload by slicing between `clean.indexOf('{')` and `clean.lastIndexOf('}') + 1`.

---

### 5. 🟡 Template Selector Default ID Mismatch
- **Location:** `src/components/preview/TemplateViewer.js` (line 8) vs `src/app/api/resume/templates/route.js`
- **Root Cause:**
  `TemplateViewer.js` sets `DEFAULT_TEMPLATE_ID = "ClassicTemplate.js"`.
  However, `/api/resume/templates` returns template objects with `id: "ClassicTemplate"` (without `.js`).
  Because the select value doesn't match any option, the browser displays the first option ("Professional"), but state remains `"ClassicTemplate.js"`.
- **Remediation:**
  Set `DEFAULT_TEMPLATE_ID = "ClassicTemplate"` in `TemplateViewer.js`.

---

### 6. 🟡 Proxy Internal `fetch` Missing Timeout & Using Raw Host
- **Location:** `src/proxy.js` (lines 50-56, 87-95)
- **Root Cause:**
  Internal fetches to `/api/auth/verify-token` and `/api/auth/check-subscription` construct URLs using `${protocol}://${host}` and lack a timeout signal. If MongoDB stalls, the middleware hangs indefinitely, blocking all user requests.
- **Remediation:**
  Use `req.nextUrl.origin` and `signal: AbortSignal.timeout(5000)`.

---

### 7. 🟡 Orphaned Page: `/resume-history` Unreachable via Navigation
- **Location:** `src/components/layout/Navbar.js`
- **Root Cause:**
  `/resume-history` has a full page implementation and route guard, but is not linked in `Navbar.js`. Users cannot navigate to it without manually typing the URL.
- **Remediation:**
  Add a "History" link to `Navbar.js` for authenticated users.

---

### 8. 🟡 Pricing Page Light Mode Theme Inconsistency
- **Location:** `src/app/pricing/page.js`
- **Root Cause:**
  `/pricing` uses `bg-gray-50` with white cards and dark text, whereas every other page uses dark glassmorphism (`bg-slate-900`, `glass-card`).
- **Remediation:**
  Update `/pricing/page.js` to match the glassmorphic dark palette.

---

### 9. 🟢 Low & Code Health Items
1. **ESLint Exhaustive-Deps Warnings:** `fetchUsers` in `src/app/admin/dashboard/page.js` and `fetchLetters` in `src/app/cover-letters/page.js` need `useCallback` or in-effect definition.
2. **Vitest ESM Warning:** Rename `vitest.config.js` to `vitest.config.mjs` to eliminate the CommonJS warning.
3. **Inconsistent `req.json()` Body Parsing:** Standardize on `readJson(req)` in `src/app/api/resumes/[id]/route.js` (PATCH), `src/app/api/cover-letters/[id]/route.js` (PATCH), and `src/app/api/admin/roles/route.js` (PUT).

---

## Status of Previous Audit Items (2026-08-22)

- ✅ **JWT Token Rotation & Grace Window:** Verified working with 60s grace window in `src/lib/auth.js`.
- ✅ **Role Propagation on Rotation:** `/api/auth/verify-token` returns `role` (commit `ba23c4f`).
- ✅ **Stripe Webhook Signature & Idempotency:** Implemented with `stripe.webhooks.constructEvent` and `Transaction.findOneAndUpdate` upsert.
- ✅ **OTP Security:** Hashed storage with sha256, 5-attempt lockout, 60s resend cooldown.
- ✅ **PDF Template Skills Normalization:** Verified passing 6/6 template tests.
- ⬜ **Manual Action:** Rotate archived worker secrets at external providers (DeepSeek, Resend) if ever deployed.
