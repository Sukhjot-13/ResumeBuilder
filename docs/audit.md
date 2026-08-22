# Site Audit — Deep Dive (2026-08-22)

> ## ✅ REMEDIATION STATUS (2026-08-22)
> **All critical, high, and medium findings below have been FIXED** (C1–C2, H1–H8, M1–M15).
> Low/polish items are fixed except where marked *accepted*. Verified with `npm run lint`
> (0 errors, 2 accepted exhaustive-deps warnings) and `npm run build` (passes).
>
> Summary of changes: plan-key mismatch + PRO-only guard across checkout/webhook/verify-session;
> permission-check arg fix; downgrade now clears `subscriptionId` + `getLimit()` requires live
> subscription; shared `normalizeSkills()` in all 6 templates; refresh-rotation grace window +
> proxy stops hard-clearing cookies on rotation races; dead unscoped server actions deleted;
> logout revokes the refresh token DB-side; cover-letter Regenerate panel on existing letters;
> resume-history gets `user` prop + real preview; email normalization + uniform OTP throttle +
> branded OTP email; subscriptionStatus enum extended; master-upload orphan cleanup + stricter
> validation; dashboard list refresh + inline checkout banner; AI-edit stale preview/selection
> jump fixes; parse-resume metering + YYYY-MM dates + input sanitization; render-pdf rate limit
> + validated import id; AI runner timeouts/token caps/retry; httpOnly subCheckedAt cookie;
> JWT `type` claims asserted at verify; cover-letter `save:false` + empty-master guard; resume
> delete confirm; subscription tab uses real API fields + DOB timezone fix; single shared profile
> fetch (useProfile → AuthContext); stale comments removed; `/test` page deleted; template
> listing unified on the cached API; sanitizer narrowed + truncation logging; education
> `is_current` added to schema; readJson measures bytes; env boot validation via
> `src/instrumentation.js`; suffix heuristic only bumps version-like numbers; ATS instructions
> added to the free-tier prompt.
>
> Still open (manual/process): rotate archived worker secrets & delete `automation/worker/.env`;
> Next.js 16.3.2 staging regression pass; remaining `alert()`s in admin/download components
> (documented as accepted polish).

**Scope:** Full-codebase review of the active site (`src/`): auth/session flow, Stripe billing & credits,
permissions, every API route, all pages/components/hooks, PDF templates, AI stack, and data schema
consistency. Verified with `npm run lint` (0 errors, 3 accepted warnings) and `npm run build` (passes).

**Method:** Line-by-line read of every live file, cross-referenced against `docs/architecture.md`,
tracing each user flow end-to-end (login → onboarding → master resume → generate → save → download;
signup → checkout → webhook → upgrade; admin manage; AI edit).

---

## 🔴 Critical

### ✅ C1. Upgrading from the Pricing page and Profile page is BROKEN — plan name/key mismatch

> ✅ **FIXED 2026-08-22:** Clients send the plan KEY ('PRO'); route also resolves display names case-insensitively.
- **Files:** `src/app/pricing/page.js:111`, `src/app/profile/page.js:208`, vs `src/app/api/checkout/create-session/route.js:23`
- Pricing and Profile send `planName: PLANS.PRO.name` → the string `'Pro'`. The API looks it up as
  `PLANS[planName]` where keys are `'FREE'` / `'PRO'` → `undefined` → **400 "Invalid plan"**.
  The two primary upgrade buttons can never open Stripe checkout.
- Ironically, `PremiumFeatureLock` works because it sends `requiredPlan` = `'PRO'` (uppercase).
- **Impact:** Revenue-blocking — nobody can subscribe from the main surfaces.
- **Fix:** Send the plan KEY (`'PRO'`), or make the route resolve case-insensitively / by `name`.
  Add a regression test hitting create-session with both casings.

### ✅ C2. Latent free-Pro exploit in billing metadata (blocked today only by a crash)

> ✅ **FIXED 2026-08-22:** create-session rejects any non-PRO plan; webhook and verify-session assert planName === 'PRO' before upgrading.
- **Files:** `create-session/route.js` + `src/app/api/webhooks/stripe/route.js:53-69` + `verify-session/route.js:40-66`
- The webhook upgrades to SUBSCRIBER unconditionally whenever `metadata.planName` is ANY key of
  `PLANS` — including `FREE`. A $0/month subscription that completed would grant full Pro.
  Today this is accidentally prevented because `PLANS.FREE` has no `currency`, so Stripe creation
  for FREE throws a 500 first. That's a one-field-edit away from being exploitable.
- **Fix:** In `create-session` reject any plan other than PRO; in the webhook and `verify-session`
  assert `planName === 'PRO'` before upgrading.

---

## 🟠 High

### ✅ H1. "Save AI edit as new resume" is dead for ALL roles — wrong argument to permission check

> ✅ **FIXED 2026-08-22:** Passes `user` (not `user.role`) to checkPermissionDB.
- **File:** `src/app/api/edit-resume-with-ai/route.js:92`
- `checkPermissionDB(user.role, PERMISSIONS.CREATE_NEW_RESUME_ON_EDIT)` passes the numeric role
  where a **user object** is expected (`accessControl.js:123-128` reads `.role` off it). `(99).role`
  is `undefined` → always returns `false` → **403 "requires a higher plan" even for Pro/Admin**.
  The Profile page checkbox enables it for Pro users, then the server rejects them.
- **Fix:** Pass `user` (as `apiPermissionGuard.js:29` does), not `user.role`.

### ✅ H2. Downgraded subscribers keep the Pro credit limit (200/day instead of 2/day)

> ✅ **FIXED 2026-08-22:** Downgrade clears subscriptionId; getLimit() requires SUBSCRIBER role + live status; UNLIMITED_CREDITS check arg fixed too.
- **Files:** `src/lib/subscriptionChecker.js:20-28` + `src/services/subscriptionService.js:21-25`
- When a subscription expires, `checkAndDowngradeExpiredSubscription` sets role=USER /
  status='expired' but **never clears `subscriptionId`**. `getLimit()` grants Pro credits whenever
  `user.subscriptionId` is truthy — role/status ignored. Result: expired/canceled users get a
  **200-per-day limit** (daily resets apply to non-subscribers) instead of 2/day — a 100× billing leak.
- **Fix:** Clear `subscriptionId` on downgrade (or make `getLimit()` check
  `role === SUBSCRIBER && subscriptionStatus === 'active'` only). Backfill-clean existing users.

### ✅ H3. Skills render BLANK in 4 of 6 PDF templates — schema/template mismatch

> ✅ **FIXED 2026-08-22:** Shared normalizeSkills() helper in resumeFields.js, used by all 6 templates.
- **Files:** `Simple.js:112`, `Modern.js:155`, `Professional.js:142`, `Creative.js:142` read
  `skills.list_of_skills`; but `resumeFields.js:177-193`, the AI prompt schema
  (`generateAIPromptSchema`), ManualResumeForm, and parsed resumes produce an **array of
  `{skill_name, category}`**. Only ClassicTemplate/ClassicTemplate2 normalize both shapes
  (`ClassicTemplate.js:193-205`). Any schema-conformant resume shows an empty Skills section in
  Simple/Modern/Professional/Creative PDFs.
- **Fix:** Extract the Classic templates' normalization into a shared helper and use it everywhere.

### ✅ H4. Random logouts / 401 flapping — concurrent refresh-token rotation race

> ✅ **FIXED 2026-08-22:** 60s rotation grace window (supersededAt on RefreshToken) + proxy keeps cookies when refresh JWT still valid.
- **Files:** `src/proxy.js:46-65`, `src/lib/auth.js:43-91,100-131`
- Access tokens expire after 15 min. The first request that trips expiry rotates the refresh token
  (deletes the DB row, issues a new pair). Any *parallel* request still carrying the old token finds
  nothing in the DB → `handleStolenToken` treats it as theft → auth fails → middleware **clears both
  cookies**. Page loads that fire several API calls at once (dashboard does) can randomly log the
  user out right after the 15-minute mark.
- **Fix:** Single-flight rotation (in-flight promise map keyed by token hash) or a short grace
  period (keep the superseded token valid ~30s), and don't hard-clear cookies on a single miss.

### ✅ H5. Dead server actions expose unscoped mutations (IDOR-class, unused but callable)

> ✅ **FIXED 2026-08-22:** All four server action files deleted; TemplateSelector uses /api/resume/templates.
- **Files:** `src/app/actions/resumeActions.js`, `profileActions.js`, `adminActions.js`
- Nothing imports these except… nothing (`getTemplates.js` is the only used action). But `'use server'`
  exports are RPC endpoints callable by any authenticated client:
  - `resumeActions.deleteResume(resumeId)` deletes **any user's** resume — no ownership scope
    (`updateResumeMetadata`, `setAsMainResume` same problem).
  - `adminActions.deleteUser` has **no cascade** (resumes/tokens/Stripe sub survive — unlike the API
    route which cleans up properly).
  - `profileActions.checkSubscriptionStatus` reads nonexistent field `subscriptionEndDate`.
  - All use constants-only `checkPermission`, bypassing DB-backed revocation.
- **Fix:** Delete all three files (the UI uses the hardened API routes), or scope every operation by
  `userId` before keeping them.

### ✅ H6. Logout doesn't revoke the session server-side

> ✅ **FIXED 2026-08-22:** Logout deletes matching hashed RefreshToken rows before clearing cookies.
- **File:** `src/app/api/auth/logout/route.js` — clears cookies only.
- The refresh-token row lives on for up to 15 days. Anything that captured it (shared machine,
  XSS elsewhere, logs) keeps working after "logout".
- **Fix:** Read the cookie server-side, delete the matching `RefreshToken` doc(s) for that user,
  then clear cookies.

### ✅ H7. "Regenerate" on an existing cover letter does nothing

> ✅ **FIXED 2026-08-22:** Regenerate opens the generation panel on existing letters, pre-filling recipient from the letter.
- **File:** `src/app/cover-letters/[id]/page.js:149-161,176`
- The button clears the form state and scrolls up — but the generation form is rendered only when
  `isNew`. On an existing letter there is no form to scroll to. Feature silently broken.
- **Fix:** Render the generation panel for existing letters too (pre-fill job description from the
  letter if stored, or store it in metadata at generation time).

### ✅ H8. Resume History page: Edit/Delete buttons hidden for everyone + raw-JSON "preview"

> ✅ **FIXED 2026-08-22:** Page passes profile as `user`; modal renders ResumeDisplayView instead of raw JSON.
- **File:** `src/app/resume-history/page.js:95-103,129-131`
- `ResumeList` gets no `user` prop → `PermissionGate` denies → metadata-edit and delete controls
  never render on this page (they work on Dashboard, which passes `user`). And "View" opens a modal
  dumping `JSON.stringify(resume)` instead of using `ResumePreview`/`ResumeDisplayView`.

---

## 🟡 Medium

### ✅ M1. Email case-sensitivity splits accounts

> ✅ **FIXED 2026-08-22:** Emails lowercased+trimmed in both OTP routes (legacy-row migration still advisable).
- **Files:** `otp/route.js:27,43`, `verify-otp/route.js:29`
- Emails are matched/stored verbatim (Mongo default = case-sensitive). `Me@x.com` and `me@x.com`
  become two different users; OTPs requested for one casing can't be verified under another.
  **Fix:** lowercase+trim before lookup/create (and index accordingly); consider a migration.

### ✅ M2. Account-existence oracle via OTP cooldown

> ✅ **FIXED 2026-08-22:** Uniform per-IP+email throttle returns identical 429s regardless of account existence.
- **File:** `otp/route.js:31-33` — the 60-second 429 only fires for existing users, so probing an
  address twice reveals whether an account exists (contradicts the generic responses elsewhere).
- **Fix:** Apply the cooldown keyed on client IP/request too, or return a generic delay response for
  unknown addresses as well.

### ✅ M3. `subscriptionStatus` enum can poison user documents → later saves 500

> ✅ **FIXED 2026-08-22:** Enum extended: active/trialing/past_due/unpaid/inactive/expired/canceled/none.
- **Files:** `src/models/User.js:37-41` (enum: active/expired/canceled/none) vs webhook writes of
  `'past_due'`, `'unpaid'`, `'inactive'` (`stripe/route.js:140,157`) via `findByIdAndUpdate`
  (bypasses validators). Any subsequent `user.save()` (e.g. PUT `/api/user/profile:117`) throws a
  ValidationError for those users.
- **Fix:** Extend the enum to include the Stripe statuses the webhook writes.

### ✅ M4. Master-resume upload via PUT /api/user/profile orphans old Resume docs

> ✅ **FIXED 2026-08-22:** Superseded master Resume+metadata deleted on upload unless still referenced; strict validation added.
- **File:** `src/app/api/user/profile/route.js:102-112` — every `{mainResume}` PUT creates a NEW
  Resume document and repoints the user; the previous master row is never deleted (unlike
  `/api/resumes/master` PUT which updates in place). Repeated uploads accumulate garbage.
- Also `isValidResumeContent` only checks "some known key exists" — nearly anything passes.

### ✅ M5. Dashboard list goes stale after a saved generation

> ✅ **FIXED 2026-08-22:** Dashboard calls fetchResumes() when server save returns resumeId.
- **File:** `src/app/dashboard/page.js:86-91` — when the server saves (`resumeId` returned),
  `fetchResumes()` is never called, so the new tailored resume doesn't appear under "Your Saved
  Resumes" until reload. (The client-save path via `createResume` does update the list.)

### ✅ M6. AI Edit page stale preview + selection jump

> ✅ **FIXED 2026-08-22:** Master edits refetch shared profile; cover-letter list refresh preserves selection.
- **File:** `src/app/ai-edit/page.js:85-100,189-193`
  - Editing the **master** resume never refetches the profile, so the preview keeps showing the
    pre-edit content (GET /api/resumes excludes the master).
  - After any cover-letter edit, `fetchCoverLetters()` resets `selectedCoverLetterId` to the FIRST
    letter, so the dropdown jumps off what you just edited.

### ✅ M7. parse-resume: unmetered AI cost + date-format drift

> ✅ **FIXED 2026-08-22:** Credit deduct/refund added; YYYY-MM prompt/schema; extracted text sanitized + bounded.
- **File:** `parse-resume/route.js`, `resumeParsingService.js`
  - No credit deduction and no per-user throttle — free users can burn DeepSeek tokens repeatedly
    with 5MB files (every other AI endpoint deducts a credit).
  - Prompt asks for `YYYY-MM-DD`; the rest of the system standardizes on `YYYY-MM`
    (`FIELD_TYPES.MONTH`). Templates tolerate it today, but the inconsistency invites bugs.
  - Extracted text goes into the prompt unsanitized (self-targeted prompt injection only — low risk,
    worth noting).

### ✅ M8. render-pdf-react: unmetered CPU-heavy rendering + fragile import pattern

> ✅ **FIXED 2026-08-22:** 10 renders/user/min rate limit (src/lib/rateLimit.js); import uses validated id; missing fail import fixed.
- **Files:** `render-pdf-react/route.js`, `pdf-generator.js:30-37`
  - PDF generation costs no credit and has no rate limit — trivial CPU/DoS vector for any free account.
  - Validation uses the stripped id but the dynamic `import()` interpolates the RAW `template`
    string. Safe only because the allowlist runs first — import the validated `templateId` instead
    so the invariant can't regress.

### ✅ M9. AI runners have no timeout/retry/token caps

> ✅ **FIXED 2026-08-22:** 60s timeouts + max_tokens 4096 both runners; retry/backoff (max 3) in callAI.
- **Files:** `src/lib/ai/runners/deepseek.js:22-32`, `gemini.js`
- No `AbortController`, no max_tokens, no retry/backoff. A hung provider call pins the route (and
  the deducted credit sits in limbo until the platform kills the request).

### ✅ M10. `subCheckedAt` cookie is client-settable and insecure-flagged

> ✅ **FIXED 2026-08-22:** Cookie now httpOnly + secure-in-production.
- **File:** `src/proxy.js:120` — `httpOnly:false, secure:false` even in production. Anyone can set it
  far in the future to postpone periodic subscription-downgrade checks indefinitely (JWT role still
  bounds access, so impact is limited — but it defeats the 5-min checker by design).
- **Fix:** httpOnly+secure, or move the timestamp server-side.

### ✅ M11. JWTs carry no `type` claim

> ✅ **FIXED 2026-08-22:** type claim embedded at signing, asserted in verifyToken + verifyTokenEdge (legacy tokens tolerated until rotated).
- **Files:** `utils.js:21-35`, `auth-edge.js:5`, `auth.js`
- Token type is chosen by the caller's argument, not asserted from the payload. If access and
  refresh secrets ever coincide (misconfig), tokens become interchangeable. Embed `type` at signing
  and assert it at verification.

### ✅ M12. Cover-letter generation always charges + saves (no `save:false`)

> ✅ **FIXED 2026-08-22:** save:false supported; empty master rejected before spending credit.
- **Files:** `generate-cover-letter/route.js:60-74` vs `generate-content` which supports `save:false`.
- Every click persists a document and spends a credit; accidental double-clicks create clutter. Also
  the API happily generates from an empty master resume `{}` (UI guards, API doesn't).

### ✅ M13. One-click permanent delete of resumes (no confirm)

> ✅ **FIXED 2026-08-22:** confirm() guard added before resume delete.
- **File:** `src/components/ResumeList.js:220-228` — cover letters use `confirm()`, resumes delete
  instantly on a single misclick. Inconsistent and lossy.

### ✅ M14. Subscription tab shows guesses, ignores real API fields

> ✅ **FIXED 2026-08-22:** GET profile returns subscriptionStatus/expiresAt/creditsRemaining; tab renders them; DOB local-date formatting.
- **File:** `src/app/profile/page.js:374-459` — GET profile already returns `creditsRemaining`, and
  the DB has `subscriptionStatus`/`subscriptionExpiresAt`, but the tab renders static role-based
  labels ("200/month") regardless of actual usage/expiry. Also DOB round-trips through
  `toISOString()` → off-by-one-day for UTC+ timezones (`profile/page.js:51`).

### ✅ M15. Duplicate profile fetch per page load

> ✅ **FIXED 2026-08-22:** useProfile reads AuthContext; ai-edit consumes AuthContext too — one fetch per page load.
- `AuthContext.js:31-61` and `useProfile.js` both GET `/api/user/profile` on mount → 2 requests per
  page for the same data (also used by ai-edit's own fetch — 3 on that page).

---

## 🔵 Low / Polish

1. **Stale comment block** in `pricing/page.js:27-34` reasoning about Authorization headers/localStorage — ✅ FIXED (both files)
   that no longer applies. Similar leftover comments in `ResumeList.js:48-52`.
2. **`alert()`/`confirm()`** for payment verification (`dashboard/page.js:46-54`) and admin actions — ◐ PARTIAL: dashboard payment flow → inline banner; destructive ops have confirm(); admin/download alert()s accepted for now
   replace with toasts/modals.
3. **`/test` page** is public (not in the proxy matcher) and dev-only — remove or gate it — ✅ FIXED (page deleted; no references).
4. **TemplateSelector** lists raw filenames via an fs server action (`ClassicTemplate2`) while — ✅ FIXED (single canonical API listing; fs action deleted)
   `/api/resume/templates` returns friendly cached names — two listing mechanisms that can drift.
5. **Landing page promises ATS optimization for everyone**, but the free-tier prompt (`promptConfig.js`
   basic) has zero ATS instructions — positioning vs reality gap. — ✅ FIXED (ATS keyword/parseability instructions added to the basic tier)
6. **sanitize.js over-matching**: `act\s+as...` strips legitimate JD text ("act as a mentor"); — ✅ FIXED (pattern narrowed to AI/system identities; truncation logged + WithInfo helper exported)
   silent 8000-char truncation with no notice to the user.
7. **Education `is_current`** referenced in templates but not defined in the schema → "Present" — ✅ FIXED (checkbox added to schema; flows into form/model/prompt automatically)
   logic dead for education; empty end dates render bare "- ".
8. **`readJson` measures `text.length`** (chars) not bytes — multibyte bodies can exceed the stated — ✅ FIXED (measures UTF-8 bytes)
   cap by ~4×; fine as a guard, mislabeled as bytes.
9. **`env.js` performs no startup validation** — missing secrets surface late at runtime deep in a — ✅ FIXED (validateEnv() + src/instrumentation.js boot check)
   request. Fail fast with a boot-time check of required vars.
10. **`incrementSuffix`** renames "Resume 2024" → "Resume 2025" (trailing-digit heuristic, — ✅ FIXED (only 1–2 digit suffixes bump; years get " 1")
    `edit-resume-with-ai/route.js:159-165`).
11. **Admin analytics populate bug** (`adminActions.js:308,355`: `.populate('userId')` but the model — ✅ MOOT (file deleted with H5)
    field is `user`) — moot if the dead actions are deleted (see H5).
12. **OTP email content** is a bare `<h1>Your OTP is 123456</h1>` — poor deliverability/branding and — ✅ FIXED (branded HTML template with expiry notice)
    phishing-suspicious; use a proper template with expiry notice.
13. **No automated tests exist** (no unit/e2e). Regressions like C1/H1/H3 are exactly what a few — ⬜ STILL OPEN
    integration tests would catch.

---

## ✅ What's solid (verified during this audit)

- Magic-byte verification + MIME allowlist + size cap on resume uploads; template allowlist before
  dynamic import; body-size guards (`readJson`) on AI/PDF routes.
- Deduct-first/refund-on-failure credit accounting with atomic `$inc` conditions; negative-credit
  clamp on refunds/admin adjustments.
- Ownership-scoped resume/cover-letter CRUD in the live API routes (IDOR fixes holding).
- Stripe webhook: signature verification, idempotent transaction upserts, paid-through-period
  cancellation handling, generic error surfaces.
- OTP: hashed storage, atomic attempt counter, resend cooldown, lockout-forces-new-code.
- Response-envelope convention documented and mostly followed; lint 0 errors; build clean.

---

## Suggested fix order

> ✅ **COMPLETED 2026-08-22** — all steps below were executed in one pass (see remediation status at top).

1. **C1 + C2** (billing correctness) — small diffs, revenue-critical.
2. **H1** (one-line fix), **H2** (limit logic), **H3** (skills normalization helper).
3. **H5** (delete dead server actions) + **H6** (logout revocation) + **M3** (enum).
4. **H4** rotation race — needs a little design care (grace period).
5. UX batch: **H7, H8, M5, M6, M12, M13, M14**.
6. Abuse-prevention batch: **M7, M8, M9, M2** + per-IP throttling.
7. Polish/low items opportunistically.

---

## Carried over from the 2026-08-21 audit (still open)

### 🔴 Action Required (manual)
- Rotate archived worker secrets, then delete `automation/worker/.env` (gitignored, never committed). — ⬜ still manual

### 🟡 Accepted As-Is (documented, not bugs)
1. Exhaustive-deps lint warnings (fetch-on-mount patterns; now 2 after ai-edit refactor) — intentional; lint otherwise 0 errors.
2. Mixed response envelopes (list/detail GETs unwrapped, mutations enveloped) — deliberate.
3. Index keys on bullet-list inputs in ManualResumeForm — cosmetic.
4. Next.js 16.3.2 upgrade — staging regression pass still pending before deploy.
