# Architecture Documentation

Maintained inventory of every file in the codebase: purpose + all functions per file.
Covers the Next.js app (`src/`), `tests/`, `scripts/`, `public/`, and root configs. The job-automation feature (UI pages, API routes, models, and the `worker/` service) was archived on 2026-08-21 into the root `automation/` folder and then **fully purged on 2026-09-11** (commit `d957d4a`) — the `automation/` folder no longer exists; see git history for the original inventory.

---

## Docs

### `docs/architecture.md` — This file: always-current file/function inventory + env vars (updated on every change per `AGENTS.md`).

### `docs/suggestions.md` — Improvement / feature / vulnerability log (date-stamped entries; open items only).

### `AGENTS.md` (repo root) — Repo-local AI behavior guidelines: architecture-docs conventions (`docs/` location, per-file purpose + functions, Env Vars section), testing rules, PermissionGate standard (§1–27), commit workflow.

### `docs/audit.md` — Site audit report (open items)

The 2026-08-22 full-codebase audit's critical/high/medium findings (and nearly all low items) were
**fixed on 2026-08-22** — see git history for the original detailed findings and remediation notes.
The file now tracks only what remains open: manual actions, recommended follow-ups (legacy-data
migration, automated tests, toast migration), accepted-as-is items, and a "what's solid" summary.

### `docs/to-do.md` — Consolidated master task list

Single source of truth for all pending work. Organized by priority: 🔴 Critical (security/integrity), 🟠 High (auth, permissions, features), 🟡 Medium (UX, infrastructure, architecture), ⬜ Pending (deploy/future). Supersedes the now-deleted `audit.md`, `suggested_changes.md`, `auth.md`, `a1.md`, `README.md`, `plan.md`.

- Entries sourced from: audit findings, security vulnerabilities, feature requests, nav restructure plan, AI edit improvements, Stripe webhook enhancements, admin dashboard controls, infrastructure improvements.


---

## Users

### `src/app/resume-history/page.js` — Page route displaying the user's resume history, including master resume and all generated tailored resumes, with delete and preview capabilities.

- `ResumeHistoryPage (default export)` — Page component that fetches user profile/mainResume and all generated resumes on mount, renders a ResumeList (passing the shared `profile` as `user` so permission-gated Edit/Delete render), and includes a modal overlay rendering the tailored resume via ResumeDisplayView (no more raw JSON). Fixed 2026-09-28: the preview overlay is focusable (`tabIndex={-1}` via `previewDialogRef`) and focused on open, so its Escape handler actually fires — a `onKeyDown` on a non-focusable `div` never received key events.

### `src/components/common/AccessDenied.js` — A simple access denied UI component that shows a restriction message without an upgrade/upsell prompt.

- `AccessDenied (default export)` — Stateless component rendering a centered card with a lock icon (customizable), a title, and a message to inform the user they lack permission.

### `src/components/common/LoadingSpinner.js` — A reusable animated loading spinner component.

- `LoadingSpinner (default export)` — Stateless component rendering a centered spinning circle with a blue border.

### `src/components/common/PermissionGate.js` — A wrapper component that conditionally renders children based on user permissions, with configurable fallback behaviors.

- `PermissionGate (default export)` — Component that checks a user's permission via checkPermission(). If granted, renders children. If denied, renders nothing (hidden fallback), an AccessDenied (simple fallback), or a PremiumFeatureLock (default/compact fallback) with the permission's metadata. Returns null (deny) when permission prop is missing/null — prevents accidental unauthenticated access.

### `src/components/common/PremiumFeatureLock.js` — A reusable UI component that locks premium features behind an upgrade prompt with a Stripe checkout flow.

- `PremiumFeatureLock (default export)` — Component displaying a lock icon, feature name, description, and an upgrade button that initiates a checkout session via /api/checkout/create-session. Supports default (full-size centered) and compact (inline) variants.
- `handleUpgrade` — Internal async function that either calls a custom onUpgrade handler or posts to /api/checkout/create-session and redirects to the Stripe checkout URL. Failures surface via toast notifications.

### `src/components/common/ToastProvider.js` — App-wide non-blocking notification system (replaces alert() calls).

- `ToastProvider (default export)` — Client context provider rendering a stacked, auto-dismissing toast container (bottom-right); mounted in the root layout.
- `useToast` — Hook returning { show(message, type), success(message), error(message), info(message) }; safe no-op fallback outside the provider.

### `src/components/cover-letter/CoverLetterTemplate.js` — A React-PDF Document template for rendering a cover letter as a PDF document.

- `CoverLetterTemplate (default export)` — React-PDF component that renders a full-page cover letter PDF with sender info, date, recipient info, salutation, body paragraphs, closing, and signature using styled react-pdf primitives (Document, Page, Text, View).

### `src/components/home/JobDescriptionInput.js` — An enhanced job description textarea with a loading skeleton state.

- `JobDescriptionInput (default export)` — Component rendering a labeled textarea for job description input, with an animated pulse skeleton shown while the loading prop is true. Fixed 2026-09-28: the `<label>` now has `htmlFor="job-description-input"` and the textarea the matching `id`, so the field is programmatically labelled (screen readers previously announced an unlabelled textbox).

### `src/components/home/SpecialInstructionsInput.js` — Input panel for special instructions and generate button, with permission-gated lock states for free users.

- `SpecialInstructionsInput (default export)` — Component that renders a special instructions textarea and a generate resume button. For users lacking USE_SPECIAL_INSTRUCTIONS permission, the textarea is locked with an overlay badge. For users lacking GENERATE_RESUME permission, the generate button is disabled with an upgrade prompt. Shows skeleton while loading.

### `src/components/home/TemplateSelector.js` — A dropdown component for selecting a resume template, loaded from the canonical `/api/resume/templates` endpoint (friendly names + generator-accepted ids).

- `TemplateSelector (default export)` — Component that fetches available templates via GET /api/resume/templates on mount, renders a select dropdown with loading/error states, and calls setSelectedTemplate on change.

### `src/components/layout/Footer.js` — Application footer with branding, product links, legal links, and copyright.

- `Footer (default export)` — Stateless footer: Product links (Features → `/#features`, Templates → `/templates`, Pricing → `/pricing`) and Legal links (`/privacy`, `/terms`), next/link client-side navigation, dynamic copyright year.

### `src/components/layout/Navbar.js` — Top navigation bar with authentication-aware links, credit badge, role-based navigation items, and mobile menu.

- `Navbar (default export)` — Renders fixed header with logo (routes to /dashboard when signed in, / when signed out), auth-aware nav links, credit badge, permission-gated items (Dashboard, Cover Letters, AI Edit, History, Pricing, Admin), Profile link, Logout button, and mobile menu with aria-expanded toggle. Uses AuthContext user directly (no duplicate fetch); credit badge prefers server-computed `creditsRemaining` with ROLES-based fallback. Fixed 2026-09-21: added History (/resume-history) link to desktop + mobile nav (was orphaned). Updated 2026-09-22: locked Pro items render as /pricing teasers with lock icons (no longer hidden); Pricing link in pill + mobile nav; Upgrade CTA for free-tier users (desktop + mobile).
- `handleLogout` — Internal async function that POSTs to /api/auth/logout, refreshes auth state, and redirects to /login.

### `src/components/preview/CoverLetterDisplayView.js` — An HTML/text view of a cover letter for on-screen display.

- `CoverLetterDisplayView (default export)` — Stateless component that renders a cover letter as styled HTML, showing sender info, date, recipient info, salutation, body paragraphs, closing, and signature.

### `src/components/preview/CoverLetterPdfView.js` — A PDF viewer for cover letters using react-pdf with zoom and download controls.

- `CoverLetterPdfView (default export)` — Component that POSTs coverLetterData to /api/render-pdf-react to generate a PDF blob, then displays it via react-pdf's Document/Page components. Provides zoom in/out controls and a download link. Shows loading state and error state.

### `src/components/preview/CoverLetterPreview.js` — Main cover letter preview component with toggle between text view and PDF view.

- `CoverLetterPreview (default export)` — Component that renders a preview container with a tab toggle (Text View / PDF View), the active view component, and a DownloadCoverLetterPdfButton. Dynamically imports CoverLetterPdfView for client-side only rendering.

### `src/components/preview/DownloadCoverLetterPdfButton.js` — Download button that generates and downloads a cover letter PDF.

- `DownloadCoverLetterPdfButton (default export)` — Component with a handleDownload function that POSTs coverLetterData to /api/render-pdf-react, receives a PDF blob, and triggers a client-side file download named cover-letter.pdf.
- `handleDownload` — Internal async function that fetches the PDF from the API, creates a temporary anchor element, triggers the download, and cleans up.

### `src/components/preview/DownloadReactPdfButton.js` — Download button for resume PDFs with permission-gated lock state for free users.

- `DownloadReactPdfButton (default export)` — Component that checks the DOWNLOAD_PDF permission. If the user lacks permission, renders a disabled button with a lock icon. If permitted, renders an active button that POSTs resumeData and template to /api/render-pdf-react and triggers a download named resume-react.pdf.
- `handleDownload` — Internal async function that checks permission (alerting if denied), fetches the PDF from the API, and triggers a client-side download.

### `src/components/preview/PdfResumeRenderer.js` — A thin wrapper that renders a resume data object through a provided Template component.

- `PdfResumeRenderer (default export)` — Functional component that accepts resumeData and a Template component as props, instantiating the Template with resumeData as its prop.

### `src/components/preview/ReactPdfView.js` — A full-featured PDF viewer for resumes using react-pdf with zoom controls and download.

- `ReactPdfView (default export)` — Component that POSTs resumeData and template to /api/render-pdf-react to generate a PDF blob, then renders it via react-pdf. Supports zoom in/out (25% steps, min 50%), responsive page width based on screen size, and a download button. Handles loading, error, and cleanup states.
- `onLoadSuccess` — Internal callback that sets the numPages state when the PDF document finishes loading.
- `zoomIn` — Internal function that increases the zoom level by 0.25.
- `zoomOut` — Internal function that decreases the zoom level by 0.25, floored at 0.5.

### `src/components/preview/ResumeDisplayView.js` — An HTML/text view of resume data for on-screen display.

- `ResumeDisplayView (default export)` — Stateless component that renders resume data as styled HTML, displaying profile info (name, email, phone, location, website, headline, summary), work experience with responsibilities, education with coursework, skills as tags, and additional info (languages, certifications, awards/activities).

### `src/components/preview/ResumePreview.js` — Main resume preview component with toggle between text view and PDF view.

- `ResumePreview (default export)` — Component that renders a resume preview container with a tab toggle (Text View / PDF View), the active view component, and a DownloadReactPdfButton. Dynamically imports ReactPdfView for client-side only rendering.

### `src/components/preview/TemplateViewer.js` — A combined component that wraps a TemplateSelector and ResumePreview for viewing a resume with different templates. Fixed 2026-09-21: DEFAULT_TEMPLATE_ID is now "ClassicTemplate" (was "ClassicTemplate.js" — dropdown showed Professional while preview rendered Classic).

- `TemplateViewer (default export)` — Component that holds a selectedTemplate state, renders a TemplateSelector for choosing a template, and a ResumePreview below it showing the resume rendered with the selected template.

### `src/components/ResumeList.js` — Displays the master resume card and a grid of all generated/saved resumes with view, edit, and delete actions.

- `ResumeList (default export)` — Component that renders a loading spinner, empty state, master resume card, and a grid of generated resumes. Supports inline editing of resume metadata (name, job title, company) via PATCH API, delete via callback (with confirm() guard), and view via callback. Uses PermissionGate to conditionally show edit/delete buttons.
- `startEditing` — Internal function that sets the editing state to a specific resume and populates the edit form with its current metadata.
- `cancelEditing` — Internal function that resets the editing state and clears the edit form.
- `saveEditing` — Internal async function that sends a PATCH request to update resume metadata, then triggers onUpdateResume callback on success.


---

## app

> **Note:** The entire `src/app/actions/` server-actions directory was **deleted on 2026-08-22**
> (`adminActions.js`, `profileActions.js`, `resumeActions.js`, `getTemplates.js`). Nothing imported
> them except `getTemplates` (now replaced by `/api/resume/templates`); the others were unscoped
> IDOR-class RPC surfaces. All operations live in the hardened API routes instead.

### `src/app/admin/page.js` — Admin index redirect (no UI of its own).

- `AdminIndexPage (default export)` — Server component that redirects `/admin` → `/admin/dashboard`.

### `src/app/admin/dashboard/page.js` — Admin dashboard page component displaying a user table with role management, reset usage, and delete actions. Updated with navigation tabs linking to Users and Permissions pages.

- `AdminDashboard` — Default export — renders admin UI with user list table, role change dropdowns, reset usage and delete buttons, and navigation tabs for Users / Permissions

### `src/app/admin/permissions/page.js` — Permission management page for the admin dashboard where admins can view and toggle permissions per role.

- `AdminPermissionsPage` — Default export — fetches roles and permissions from API, renders permission grid grouped by category with toggle buttons per role. Gated server-side: API routes enforce MANAGE_ROLES permission; page handles 403 responses by redirecting to /dashboard. Admin role displayed as immutable (uses ALL wildcard).

### `src/app/ai-edit/page.js` — AI Editor page that lets users select a resume or cover letter, enter AI instructions, and generate AI-powered edits with a live preview. Reads the shared AuthContext profile (no duplicate /api/user/profile fetch); refetches the profile after in-place master edits so the preview stays fresh; preserves the selected cover letter across list refreshes.

- `AIEditPage` — Default export — renders AI editor with resume/cover letter toggle, selection dropdowns, instruction textarea, save-as-new checkbox, and preview panel
- `getResumeLabel` — Formats resume display names with priority: `resumeName` > `jobTitle` > `profile.headline` > `profile.name` > fallback, plus master badge and date
- `getCoverLetterLabel` — Formats cover letter display names from `coverLetterName` or `companyName` with date
- `fetchResumes` / `fetchCoverLetters` — Load the respective lists; cover-letter refresh keeps the current selection when it still exists

### `src/app/api/admin/permissions/route.js` — API route to list all available permissions from the database (seeded from constants). Requires MANAGE_ROLES permission.

- `GET` — Returns all Permission documents sorted by group and key. Requires MANAGE_ROLES.

### `src/app/api/admin/roles/route.js` — API routes to list and update role permissions in the database. Hardened 2026-09-28 (audit C1 self-promotion): `PUT` no longer accepts the developer-tier MANAGE_ROLES — writing a role's permission set *is* delegating authority, so it requires the root-ADMIN-only DELEGATE_ROLE_MANAGEMENT permission and passes every `roleAuthorization` guard.

- `GET` — Returns all Role documents sorted by value. Requires MANAGE_ROLES.
- `PUT` — Requires **DELEGATE_ROLE_MANAGEMENT** (root ADMIN only). Body parsed via `readJson` size guard; body: `{ roleValue (number), permissions (string[]) }`. Runs `evaluateRolePermissionWrite()` (see `src/lib/roleAuthorization.js`), which refuses: roleValue `0` (root role protected), a rank higher than the caller's own, a rewrite of the caller's OWN role (the permission-laundering lane), the `ALL` wildcard on a non-root role, non-delegable permissions, unknown permission keys, duplicates, oversized/malformed lists, and any permission the caller does not itself hold. On success calls `invalidateRoleCache()` so a revocation is effective on the very next permission check, and writes a `role.permissions.updated` audit event (denied attempts write `role.permissions.denied` with `outcome: 'denied'`).

### `src/app/api/admin/transactions/route.js` — API route to list all transactions with optional user/status filtering and pagination.

- `GET` — Return a paginated list of transactions filtered by userId and/or status. `limit` is clamped to `[1, 200]` (default 50) and `skip` to `[0, 10000]` (clamped 2026-09-28 — the parameter was previously unbounded).

### `src/app/api/admin/users/[id]/credits/route.js` — Atomically adjusts a user's credit count.

- `POST` — Amount must be a bounded non-zero integer (±10 000). Atomic aggregation clamps creditsUsed at ≥0 (negative-credit exploit closed). Positive amount increases usage; negative frees credits. Hardened 2026-09-28: validates the `:id` shape (`isValidObjectId`, 400 instead of a CastError 500), refuses a non-root caller adjusting an account that outranks them, and writes a `user.credits.adjusted` audit event with before/after balances.

### `src/app/api/admin/users/[id]/reset-usage/route.js` — API route to reset a user's usage counter to zero.

- `POST` — Reset a specific user's creditsUsed to 0. Hardened 2026-09-28: validates the `:id` shape, applies the same non-root rank ceiling as the credits route, and writes a `user.credits.reset` audit event with the previous balance.

### `src/app/api/admin/users/[id]/role/route.js` — Changes a user's role. Fixed 2026-09-21: keeps subscription state in sync — promoting to SUBSCRIBER grants a 30-day manual Pro window (status active + expiry + credit reset) so admin-granted subscribers actually receive Pro limits; demoting to USER clears it. Skips the grant when a live subscription already exists (never shortens a real Stripe window).

- `PATCH` — Role must be an integer present in the ROLES enum; response whitelisted (-otp/-otpExpires); body parsed via `readJson`. Hardened 2026-09-28 (audit C1 self-promotion): the old guard blocked only self-DEMOTION, so a caller could PATCH their own account to role `0`. `evaluateUserRoleChange()` now blocks **any** self role change (`SELF_ESCALATION_BLOCKED` when the new rank is higher, `SELF_ROLE_CHANGE_BLOCKED` otherwise) and applies the rank ceiling in both directions (a non-root caller can neither modify an account that outranks them nor assign a rank above their own). The `:id` shape is validated (400), and both allowed and denied changes are audited (`user.role.updated` / `user.role.denied`).

### `src/app/api/admin/users/[id]/route.js` — Permanently deletes a user account with full cleanup.

- `DELETE` — Requires **DELETE_USER** (root ADMIN only). Fixed 2026-09-28 (audit C2): the guard was ACCESS_ADMIN_PANEL, a developer-tier permission, so any DEVELOPER could permanently cascade-delete an account and cancel its Stripe subscription. Also hardened: `:id` shape validated (400), self-deletion still refused, a non-root caller cannot delete an account that outranks them (403), and a `user.deleted` audit event is written. Cancels the target's active Stripe subscription, then cascade-deletes their resumes, resume metadata, cover letters, refresh tokens, and API keys before removing the user.

### `src/app/api/admin/users/route.js` — API route to list all users for the admin panel. Supports both JWT and API-key auth via resolveUserId().

- `GET` — Return all users sorted by creation date, excluding sensitive OTP fields. Fixed 2026-09-28: each row now carries a server-derived `plan` (`{ name }`) so the admin Plan column stops rendering "Free" for every account (`plan` was never selected nor populated).

### `src/app/api/auth/check-subscription/route.js` — API route to check a user's subscription status and downgrade if expired. Authenticates via HttpOnly JWT cookies (serverAuth) — client-supplied headers are never trusted.

- `POST` — Check subscription, auto-downgrade if expired, and return current role and subscription status

### `src/app/api/auth/logout/route.js` — API route to log out: revokes the refresh token server-side, then clears auth cookies.

- `POST` — Reads the refreshToken cookie (via `COOKIE_NAMES`), deletes the matching hashed RefreshToken document(s) from the DB (so a captured token can't outlive logout; never blocks on DB errors), then clears accessToken and refreshToken cookies.

### `src/app/api/auth/otp/route.js` — Generates and emails a one-time password. Rate-limited: 60s resend cooldown via lastOtpSentAt plus a uniform per-IP+email in-memory throttle (identical responses whether or not an account exists — no enumeration oracle); resets attempt counter on new code. Emails are normalized to lowercase+trim so casing can't split accounts. Fixed 2026-09-28 (audit M3): the in-memory throttle was keyed on the client-supplied `x-forwarded-for` header, which any caller can forge to bypass the limit. It now uses `buildOtpThrottleKey()` (see `src/lib/clientIp.js`) — a SHA-256 hash of the platform-provided client IP plus a hash of the normalized email.

- `POST` — Validates email format, normalizes it, enforces cooldown (429), stores hashed OTP + expiry atomically, clears otpAttempts, sends a branded HTML email with expiry notice via Brevo. `pruneRecentRequests` bounds the in-memory map. Failure logging goes through `logger` with a hashed email (no raw address, no `console.error`).

### `src/app/api/auth/verify-otp/route.js` — Verifies OTP and issues tokens. Brute-force hardened: max 5 attempts (atomic $inc counter) then lockout forcing a fresh code request. Email normalized to match the request path.

- `POST` — Normalizes email casing, generic invalid-OTP response (no user enumeration); on success clears OTP state, rotates refresh token into DB, sets HttpOnly cookies (named via `COOKIE_NAMES`), returns newUser flag

### `src/app/api/auth/verify-token/route.js` — API route to rotate a refresh token and issue new access/refresh tokens. Fixed 2026-09-28: the body is read through the `readJson` size guard (was a raw `await req.json()`, which 500'd on malformed input and accepted unbounded bodies), and the recorded client IP now comes from `getClientIp()` (platform headers only) instead of the forgeable `x-forwarded-for`.

- `POST` — Accept refresh token, rotate it (with a 60s grace window so parallel requests carrying the same token aren't logged out — see `src/lib/auth.js`), and return new access and refresh tokens with userId

### `src/app/api/checkout/create-portal-session/route.js` — Creates a Stripe Billing Portal session so the user can manage their subscription.

- `POST` — Authenticates via access token (header or cookie), finds the user and their Stripe customerId, then creates a Stripe Billing Portal session with return_url pointing to /profile. Returns the portal URL.

### `src/app/api/checkout/create-session/route.js` — Creates a Stripe Checkout Session for a new subscription purchase.

- `POST` — Reads x-user-id from header (set by middleware), resolves the requested plan via `resolvePlanKey()` (accepts KEY 'PRO' or display name 'Pro', case-insensitive) and **rejects any plan other than PRO** (FREE is never a checkout product). Body parsed via readJson size guard (fixed 2026-09-26, was raw req.json → 500 on malformed JSON). Creates a Stripe Checkout Session with subscription mode and returns the checkout URL. Includes userId and planName='PRO' (canonical KEY) in both session and subscription metadata so webhook/verify checks always match.

### `src/app/api/checkout/verify-session/route.js` — Verifies a completed Stripe Checkout Session and activates the user's subscription. Hardened 2026-09-28 (audit H1): the upgrade is now SINGLE-USE and idempotent — previously every call re-ran the same `findByIdAndUpdate`, so a paying user could re-POST their own paid `sessionId` forever to reset `creditsUsed` and to revive a cancelled or expired subscription.

- `POST` — sessionId read via `readJson` guard; verifies `payment_status === 'paid'`, that the session belongs to the requesting user, **and that `metadata.planName === 'PRO'`** (refuses to activate anything else). Expiry derived from the Stripe subscription's `current_period_end` (fallback +1 month). Then: (1) **replay guard** — an existing `Transaction` with the same `stripePaymentId` means the session was already consumed → `409`, no writes, plus a `subscription.upgrade.replay_blocked` audit event; (2) **no reactivation** — a user whose `subscriptionStatus` is canceled/expired/past_due/unpaid/incomplete/paused is refused with `409` (only the signed webhook may change that state); (3) the `Transaction` row is **created first** (unique index on `stripePaymentId`, so a concurrent replay loses) and released again if the user update fails; (4) the user is updated to SUBSCRIBER/active **without touching `creditsUsed`** — a plan upgrade never refunds consumed credits. Writes a `subscription.upgraded` audit event.

### `src/app/api/cover-letters/[id]/route.js` — Fetch, update, or delete a single cover letter by ID. Uses CoverLetterService for all database operations, resolveUserId() for dual auth (JWT/API key). Uses `ok()` for GET (unwrapped response) and `success()` for DELETE/PATCH (enveloped).

- `GET` — Requires VIEW_COVER_LETTERS permission. Uses resolveUserId() for auth, then CoverLetterService.getCoverLetterById() to find a cover letter by ID and userId, returns it via `ok()` (unwrapped, consistent with listing endpoint), or a 404.
- `DELETE` — Requires DELETE_COVER_LETTER permission. Uses resolveUserId() for auth, then CoverLetterService.deleteCoverLetter() to remove a cover letter by ID and userId.
- `PATCH` — Requires EDIT_COVER_LETTER permission (doc corrected 2026-09-28 — it previously claimed VIEW_COVER_LETTERS, which the code never enforced). Body parsed via readJson size guard (fixed 2026-09-21). Uses resolveUserId() for auth, then CoverLetterService.updateCoverLetter() to update the content and/or metadata fields on a cover letter by ID and userId.

### `src/app/api/cover-letters/route.js` — List all cover letters for the user or create a new cover letter. Uses CoverLetterService for all database operations and resolveUserId() for dual auth. Size-guarded and metered 2026-09-28 (see POST below).

- `GET` — Requires VIEW_COVER_LETTERS permission. Uses resolveUserId() for auth, then CoverLetterService.getCoverLettersByUserId() to return the user's cover letters sorted by createdAt descending, limited to 50.
- `POST` — Requires GENERATE_COVER_LETTER permission. Body parsed via `readJson` (fixed 2026-09-28 — was a raw `request.json()` with no size cap). Metered 2026-09-28: charges one credit via `SubscriptionService.trackUsage(userId, 1)` with a `refundUsage` on failure, so this AI-backed write is no longer a free alternative to the metered `POST /api/generate-cover-letter`. Then CoverLetterService.createCoverLetter() accepts content and optional metadata and returns the created document with a 201 status.

### `src/app/api/edit-resume-with-ai/route.js` — Edits a resume or cover letter using AI, with credit tracking, plan-gated features, proper resume naming with incrementing suffixes ("Name" → "Name 1"), and multi-resume support. Hardened 2026-08-21: all cover-letter/resume reads & writes are scoped by userId (IDOR fix) and credits are deducted BEFORE the AI call with automatic refund on failure. Fixed 2026-08-22: CREATE_NEW_RESUME_ON_EDIT check now passes the user object (was passing the numeric role — always denied); the name-suffix heuristic only bumps 1–2 digit suffixes so "Resume 2024" no longer becomes "Resume 2025".

- `POST` — Requires EDIT_RESUME_WITH_AI permission. Resolves user identity via `resolveUserId(req, { rateLimit: API_KEY_LIMITS.EDIT_RESUME_WITH_AI })` (2026-09-28 — `checkRateLimit` was dead code because no route passed the option). Verifies ownership (`{ _id, userId }`) of any requested coverLetterId/resumeId BEFORE spending AI tokens (404 otherwise). Deducts a credit atomically first; refunds it if the AI edit throws. For type='cover-letter', edits content via AI and saves only via `findOneAndUpdate({ _id, userId })`. For resume editing: accepts `resumeId` for multi-resume support; if `createNewResume`, names the source resume with an incrementing suffix ("Name" → "Name 1") using metadata, gives the new resume the original name, and only sets it as main if editing the master. Sanitizes Mongo _id fields from the AI output before saving.

### `src/app/api/generate-content/route.js` — Generates a tailored resume from a job description using AI, with deduct-first/refund-on-failure credit handling. Fixed 2026-09-21: persistence now uses ResumeService.createResume + UserService.addGeneratedResume (was raw Resume.create with an embedded metadata object → Mongoose CastError, resumeId null, client double-spend).

- `POST` — Requires GENERATE_RESUME permission. Resolves user identity via `resolveUserId(request, { rateLimit: API_KEY_LIMITS.GENERATE_CONTENT })` (2026-09-28 — a leaked API key previously got unmetered AI access). The `USE_SPECIAL_INSTRUCTIONS` check now uses the DB-backed `checkPermissionDB` instead of the compile-time `checkPermission` (2026-09-28 — this was the last server-side route authorizing from constants, so a revoked grant was ignored here). Sanitizes the job description via sanitize.js utility, deducts a credit atomically BEFORE generation (refunds on failure), checks USE_SPECIAL_INSTRUCTIONS permission, calls generateResume() with resume data and job description, optionally saves via ResumeService (correct ResumeMetadata document + generatedResumes link). Returns the generated content with a resumeId if saved.

### `src/app/api/generate-cover-letter/route.js` — Generates a cover letter from a job description using AI, with deduct-first/refund-on-failure credit handling. Supports JWT auth via resolveUserId(). Hardened 2026-09-28: `recipientName` and the profile name are run through `sanitizeJobDescription` and capped at 200 chars before reaching the prompt (they were interpolated raw, leaving an unblocked prompt-injection lane), and identity resolution carries a daily API-key rate limit.

- `POST` — Requires GENERATE_COVER_LETTER permission. Resolves user identity via `resolveUserId(request, { rateLimit: API_KEY_LIMITS.GENERATE_COVER_LETTER })`, sanitizes the job description, sanitizes + caps `recipientName` and the sender name at `MAX_PROMPT_NAME_LENGTH` (200), **rejects an empty/missing master resume before spending a credit**, deducts a credit atomically BEFORE generation (refunds on failure), calls generateCoverLetter(). Persists by default; callers may pass `save:false` for preview-only generation. Returns the generated content with a coverLetterId if saved.

### `src/app/api/health/route.js` — Simple health-check endpoint for monitoring.

- `GET` — Returns { status: 'ok', uptime, timestamp } to indicate the server is running.

### `src/app/api/parse-resume/route.js` — Parses an uploaded resume file (PDF/DOCX) and extracts structured data. Hardened 2026-08-21: 5MB size cap (413), MIME allowlist, PDF/ZIP magic-byte verification (415). Metered 2026-08-22: deducts a credit before the AI call, refunds on failure.

- `POST` — Requires PARSE_RESUME permission. Resolves user identity via `resolveUserId(request, { rateLimit: API_KEY_LIMITS.PARSE_RESUME })` (2026-09-28). Accepts a multipart form upload with field 'resumeFile', validates size/type/content signature, deducts 1 credit (refund on failure), then passes the verified Buffer to parseResume() and returns parsed JSON via ok().

### `src/app/api/render-pdf-react/route.js` — Generates a downloadable PDF for a resume or cover letter using React PDF renderer.

- `POST` — Requires DOWNLOAD_PDF permission. Rate-limited to 10 renders/user/minute (in-memory sliding window) before any expensive work; missing `fail` import fixed. For type='cover-letter', generates a cover letter PDF via generateCoverLetterPdf(). Otherwise generates a resume PDF via generatePdf() using the provided resumeData and template. Returns the PDF buffer as an attachment response.

### `src/app/api/resume/templates/route.js` — Returns the list of available resume PDF templates, with a 1-hour in-memory cache so the mapped result is reused across requests. **Single canonical listing** — TemplateSelector now uses this endpoint (the fs-based getTemplates server action was deleted).

- `GET` — Returns an array of { id, name } where `id` is the component name accepted by pdf-generator's ALLOWED_TEMPLATES and `name` is the friendly label: Professional, Modern, Classic, Classic 2, Creative, Simple. Results are cached in-memory for 1 hour (CACHE_TTL_MS) and recomputed on first request or cache expiry.

### `src/app/api/resumes/[id]/route.js` — Fetch, delete, or update metadata for a single resume by ID. Uses resolveUserId() for dual auth (JWT/API key).

- `GET` — Requires VIEW_OWN_RESUMES permission. Finds and returns a resume by ID and userId, excluding the version key.
- `DELETE` — Requires DELETE_OWN_RESUME permission. Deletes a resume by ID and userId, removes its ID from the user's generatedResumes array, and deletes the associated ResumeMetadata document.
- `PATCH` — Requires EDIT_RESUME_METADATA permission. Body parsed via readJson size guard (fixed 2026-09-21, was raw req.json → 500 on malformed JSON). Accepts jobTitle, companyName, resumeName and upserts a ResumeMetadata document linked to the resume ID.

### `src/app/api/resumes/master/route.js` — Creates/updates or deletes the user's master (primary) resume.

- `validateContent` — Internal helper that validates resume content against RESUME_FIELD_SCHEMA, checking that required fields exist in object sections and array items. Returns an array of error messages.
- `PUT` — Requires UPLOAD_MAIN_RESUME permission. Body parsed via `readJson` size guard (fixed 2026-09-28 — was a raw `req.json()` with no size cap). Validation failures return `422` **with a `details` array** of per-field messages (2026-09-28 — `ManualResumeForm` renders `data.details`, which the route never sent). Validates resume content against the field schema, then either updates the existing master resume or creates a new one and sets it as the user's mainResume. Returns the updated user (populated with resume metadata) and the resume.
- `DELETE` — Requires DELETE_OWN_RESUME permission. Removes the user's mainResume reference and deletes the resume document.

### `src/app/api/resumes/route.js` — Lists the user's generated resumes or creates a new resume. Uses resolveUserId() for dual auth (JWT/API key).

- `GET` — Requires VIEW_OWN_RESUMES permission. Loads the user with populated generatedResumes (each with populated metadata) and returns the array.
- `POST` — Requires CREATE_RESUME permission. Body parsed via `readJson` size guard (fixed 2026-09-28 — was a raw `req.json()` with no size cap). Accepts content and optional metadata, deducts a credit via SubscriptionService.trackUsage(), creates the resume via ResumeService, and adds it to the user's generatedResumes list. Fixed 2026-09-21: creation wrapped in try/catch with refundUsage on DB failure (was a credit leak).

### `src/app/api/user/profile/route.js` — Get and update the authenticated user's profile. Uses DB-backed `requirePermission`, validates input shapes, and returns a server-computed `creditsRemaining` field (single source of truth for billing UI). GET also returns real billing fields (subscriptionId, subscriptionStatus, subscriptionExpiresAt) so the UI never guesses.

- `GET` — Requires VIEW_OWN_PROFILE permission (DB-backed). Returns whitelisted fields incl. `creditsRemaining` computed via SubscriptionService.getLimit() plus subscription status/expiry.
- `PUT` — Body parsed via `readJson` size guard (2026-09-28 — the doc claimed this before the code did; the handler used a raw `await req.json()` with no size cap); name/dateOfBirth format-validated; requires EDIT_OWN_PROFILE permission (DB-backed). Creates a new Resume document if mainResume is provided (structure strictly validated against RESUME_FIELD_SCHEMA section types + must contain some resume signal) **and deletes the superseded master Resume + its metadata unless it's still in generatedResumes** (no more orphan accumulation). Returns the updated profile.

### `src/app/api/webhooks/stripe/route.js` — Handles incoming Stripe webhook events for subscription lifecycle management.

- `POST` — Verifies the Stripe signature (generic error on failure). Handles five event types via switch: checkout.session.completed (upgrade + idempotent transaction upsert; **only honors metadata.planName === 'PRO'** — other plans are logged and ignored), invoice.payment_succeeded (renewal; expiry derived from the Stripe subscription's current_period_end), invoice.payment_failed (marks past_due), customer.subscription.updated (syncs status/expiry), customer.subscription.deleted (marks canceled and honors paid-through period; periodic checker downgrades later), plus checkout.session.expired no-op. All writes use idempotent upserts keyed on stripePaymentId; structured logging; 500 returned on internal errors so Stripe retries.

### `src/app/checkout/cancel/page.js` — Displays a payment-cancelled confirmation page after a user cancels a Stripe checkout session, with links to view plans or return to dashboard.

- `CheckoutCancel` — Default export. Client component rendering a centered cancellation confirmation card with navigation links.

### `src/app/checkout/success/page.js` — Displays a payment-success confirmation page after a completed Stripe checkout, with a link to the dashboard and auto-redirect after 5 seconds.

- `CheckoutSuccess` — Default export. Client component rendering a success card with a 5-second auto-redirect to the dashboard.

### `src/app/cover-letters/[id]/page.js` — Cover letter detail page for viewing, generating, regenerating, and deleting cover letters. Uses a job description input and AI generation to produce tailored cover letters. The generation panel also renders on EXISTING letters when "Regenerate" is clicked (pre-fills recipient from the letter).

- `CoverLetterDetailPage` — Default export. Client component handling cover letter display and generation with job description input, recipient name, preview via CoverLetterPreview component, and delete functionality.
- `handleGenerate` — Async function that calls POST /api/generate-cover-letter to generate a new cover letter from job description and recipient name, then navigates to the result.
- `handleDelete` — Async function that deletes the cover letter via DELETE /api/cover-letters/:id and redirects to the cover letters list.

### `src/app/cover-letters/page.js` — Cover letter list page. Fixed 2026-09-21: added missing `useCallback` import (was a build-breaking ReferenceError — `/cover-letters` prerender failed).

- `CoverLettersPage` — Default export. Client component that fetches and renders a list of cover letters with view/delete controls and a create-new link.
- `fetchLetters` — useCallback fetching GET /api/cover-letters to retrieve all cover letters.
- `handleDelete` — Async function that deletes a cover letter by ID via DELETE /api/cover-letters/:id and removes it from the local state.

### `src/app/dashboard/page.js` — Main application dashboard providing resume generation from a job description with live preview, resume list, special instructions, and subscription session verification. Fixed 2026-09-21: removed client-side createResume fallback that double-charged a credit when server save failed — server persists within the same credit; missing resumeId now surfaces a save-failed notice.

- `DashboardPage` — Default export. Client component wrapping DashboardContent in a Suspense boundary.
- `DashboardContent` — Default export (via re-export). Client component with the full dashboard UI: job description input, special instructions, resume generation, live preview, save checkbox, Stripe session verification (inline dismissible status banner instead of alert()), and resume list via ResumeList component.
- `handleGenerateResume` — Async callback that calls POST to the generate endpoint with resume content, job description, special instructions, and save flag; on success refetches the saved-resumes list (single-credit server save, no second POST).

### `src/app/layout.js` — Root layout for the entire application, setting up fonts, global CSS, auth context, toast notifications, navigation bar, and footer.

- `metadata` — Named export. SEO metadata object with title 'ATS-Friendly Resume Builder' and description.
- `RootLayout` — Default export. Server component providing the HTML document structure with Outfit font, AuthProvider context, ToastProvider (app-wide toasts), Navbar, main content area, and Footer.

### `src/app/not-found.js` — Global 404 page with a dashboard return link.

- `NotFound (default export)` — Server component rendering a centered 404 card (glassmorphic) with a "Return to Dashboard" link.

### `src/app/globals.css` — Global stylesheet (Tailwind v4 + shared design-system classes such as `app-input`, `glass-card`, `btn-primary`).

- No exported functions — style definitions only.

### `src/app/favicon.ico` — Site favicon served by Next.js from the app directory.

- No exported functions — static binary asset.

### `src/app/login/page.js` — Login page with an email-based OTP authentication flow: send a login code to the user's email, then verify the code to redirect to onboarding (new users) or dashboard (existing users). Fixed 2026-09-21: email/OTP inputs now carry explicit padding/typography (bare `app-input` has no padding); resend button with 60s cooldown matching the server throttle. Upgraded 2026-09-22: six per-digit OTP boxes (auto-advance, backspace nav, paste-split, auto-submit on complete, mobile numeric keyboard + one-time-code autofill), visible 5:00 code-expiry countdown, error shake + attempt counter (X of 5, lockout state on 429), "remember this device for 30 days" checkbox, magic-link auto-sign-in from `?email=&code=` (with Suspense boundary for useSearchParams).

- `LoginPage` — Default export. Suspense wrapper around LoginForm (required for useSearchParams).
- `LoginForm` — Two-stage login form managing loading, errors, resend countdown, expiry ticker, attempts/lockout, and post-auth redirect based on newUser flag.
- `handleSendOtp` — Calls POST /api/auth/otp; on success resets attempts/lockout, starts expiry + resend timers, focuses the first digit box. Also backs the resend button.
- `handleVerifyOtp` — Calls POST /api/auth/verify-otp with `{ email, otp, remember }`; guarded against concurrent submits; increments the attempt counter and shakes on failure, locks out on 429, clears the code so retries start clean.

### `src/app/onboarding/page.js` — Onboarding page for new users after first login, collecting name and date of birth to complete their profile.

- `OnboardingPage` — Default export. Client component with a profile completion form (name and date of birth) that updates the user profile via PUT /api/user/profile and redirects to dashboard.

### `src/app/page.js` — Landing/home page with a hero section, free-trial strip, feature cards, a Pro power-ups teaser section (added 2026-09-22: lock-badged Pro features linking to /pricing + compact Free-vs-Pro comparison driven by PLANS constants), a how-it-works section, and a call-to-action section to drive user signup.

- `Home` — Default export. Client component rendering the marketing landing page with hero (auth-aware CTA: Open Studio vs Build Free), trial strip, three feature cards (ATS Optimization, AI Content Generation, Real-time Editing), Pro teaser grid, how-it-works steps, and CTA section.

### `src/app/templates/page.js` — Public templates gallery page (added 2026-08-21 to fix dead nav links).

- `TemplatesPage` — Server component rendering a grid describing all six ATS-friendly resume templates with tags and a signup CTA.

### `src/app/privacy/page.js` — Privacy Policy page (added 2026-08-21).

- `metadata` — SEO title/description.
- `PrivacyPage` — Server component rendering policy sections (data collected, AI processing, sharing, retention, security, contact).

### `src/app/terms/page.js` — Terms of Service page (added 2026-08-21).

- `metadata` — SEO title/description.
- `TermsPage` — Server component rendering numbered terms sections (accounts, acceptable use, subscriptions/billing via Stripe, refunds, AI content ownership, liability).

### `src/app/pricing/page.js` — Pricing page displaying Free and Pro subscription plans with truthful feature comparisons (Free: 3 daily credits incl. AI generation + saved library; Pro: 200 monthly credits, custom instructions, AI editor + versions, cover letters, upload parsing) and upgrade buttons that trigger Stripe checkout.

- `PricingPage` — Client component rendering Free/Pro tiers; Free-tier label adapts to the viewer's role (Start Free / Your Plan / Included) via useAuth.
- `handleUpgrade(planKey)` — POSTs the plan KEY (`'PRO'`) to /api/checkout/create-session and redirects to Stripe. Errors surface via toast.

### `src/app/profile/page.js` — User profile page with tabs for personal details (name, date of birth, AI resume editing, manual resume form, resume upload/parse) and subscription management (plan info, upgrade, manage billing).

- `ProfilePage` — Full profile experience: tabs, editing, AI edit, manual form, upload/parse, master delete, subscription display (renders real `subscriptionStatus` / `subscriptionExpiresAt` / `creditsRemaining` from the API instead of static guesses), upgrade + billing portal, plus a "What you get with Pro" benefits box with compare-plans link for free-tier users (added 2026-09-22). Stripe buttons have pending/disabled double-submit guards; plan labels derive from PLANS constants; role compares use ROLES enum; DOB round-trips through local-date formatting (no UTC off-by-one).
- `handleSubmit` — Async function that saves profile name and date of birth via PUT /api/user/profile.
- `handleFileUpload` — Async function that uploads a resume file to POST /api/parse-resume for AI parsing, then saves the parsed result as the master resume.
- `handleAiEdit` — Async function that sends a natural-language edit query to POST /api/edit-resume-with-ai to modify the master resume content via AI.
- `handleDeleteMasterResume` — Async function that deletes the master resume via DELETE /api/resumes/master.
- `handleUpgrade` — Async function that initiates a Stripe checkout session sending planName 'PRO'.
- Fixed 2026-09-28: toggling the manual resume form no longer silently discards edits — the toggle is intercepted with a `window.confirm` while `ManualResumeForm` reports unsaved changes via `onDirtyChange` (`manualFormDirty` state).
- `handleManageSubscription` — Async function that opens the Stripe billing portal for subscription management.


---

## components

> All six PDF templates render Skills via the shared `normalizeSkills()` helper from `src/lib/resumeFields.js` (added 2026-08-22 — previously 4 of 6 templates read a legacy shape and rendered Skills blank for schema-conformant resumes).

### `src/components/profile/ManualResumeForm.js` — Multi-section form for manually entering resume data. Driven entirely by RESUME_FIELD_SCHEMA -- add a field there, it appears here. Available to all users (no AI parsing required).

- `TagInputField` — Standalone TAG_LIST input component (own useState draft state) — extracted so FieldInput has no conditional hooks. Tags are keyed by their value (tags are de-duplicated on add, so the value is a stable unique key).
- `BulletListField` — Standalone BULLET_LIST input component, extracted for the same "no conditional hooks" reason.
- `FieldInput` — Renders primitive form field inputs based on field type (checkbox, textarea, bullet list via BulletListField, tag list via TagInputField, text/email/url/month). Fixed 2026-09-28: text/textarea inputs now carry `required` from the field schema.
- `ObjectSection` — Renders an object-type section (profile, additional_info) with a grid of field inputs
- `ArrayItemCard` — Renders a single item card for array sections (work_experience, education, skills) with field inputs and remove button
- `ArraySection` — Wrapper for array-type sections that manages add/update/remove of items. Fixed 2026-09-28: rows are keyed by a generated stable id allocated on add and retired on remove instead of the array index (the index-as-key bug), falling back to the index if the parent ever changes the list length behind its back.
- `ManualResumeForm (default export)` — Main component: multi-section form with sidebar navigation, section content panels, and save-to-API functionality. Fixed 2026-09-28: accepts `onDirtyChange` and reports unsaved edits (compared against the initial snapshot, reset on successful save) so the page can confirm before discarding; the save error path now receives real per-field messages because `PUT /api/resumes/master` returns a `details` array.

### `src/components/profile/ResumeUpload.js` — A component for uploading a resume file (PDF or DOCX). Shows a file input trigger button and a dashed drop zone.

- `ResumeUpload (default export)` — Renders file upload UI with a hidden input accepting .pdf/.docx, a select-file button, and parsing state indicator

### `src/components/resume-templates/pdf-templates/ClassicTemplate.js` — Classic resume PDF template rendered via @react-pdf/renderer. Uses Helvetica, with sections in traditional order: header, summary, professional experience, certifications, skills, additional info, education.

- `formatDate` — Formats YYYY-MM date string to 'Mon YYYY' format (e.g. 'Jan 2023')
- `joinDateRange` — Joins start and end dates into a range string (e.g. 'Jan 2020 -- Present')
- `ClassicTemplate (default export)` — Renders the full A4 PDF document with profile header, summary, work experience with bullet-point responsibilities, certifications, skills in a 3-column grid, languages/awards, and education entries

### `src/components/resume-templates/pdf-templates/ClassicTemplate2.js` — Variant of the Classic resume PDF template with a different section ordering (skills before certifications, no education bullet points).

- `formatDate` — Formats YYYY-MM date string to 'Mon YYYY' format
- `joinDateRange` — Joins start and end dates into a range string
- `ClassicTemplate2 (default export)` — Renders the full A4 PDF document with header, summary, experience, skills, certifications, additional info, and education (no bullet points in education)

### `src/components/resume-templates/pdf-templates/Creative.js` — Creative resume PDF template with serif aesthetics, centered layout, light gray background, and a bordered container. Aims for a visually distinctive, designer-oriented look.

- `formatDate` — Formats YYYY-MM date string to 'Month YYYY' format (e.g. 'January 2023')
- `CreativeTemplate (default export)` — Renders the A4 PDF with centered header, about-me section, experience with bullets, centered education items, skills as a slash-separated list, and an extras section for languages/certifications/awards

### `src/components/resume-templates/pdf-templates/Modern.js` — Modern resume PDF template with a two-column layout: a dark left sidebar (name, title, contact, skills, education, languages) and a white main content column (summary, experience, certifications, awards).

- `formatDate` — Formats YYYY-MM date string to 'Mon YYYY' format (e.g. 'Jan 2023')
- `ModernTemplate (default export)` — Renders the A4 PDF with a 30/70 split-column layout: dark left sidebar for name/title/contact/skills/education/languages, light right column for summary/professional experience/certifications/awards

### `src/components/resume-templates/pdf-templates/Professional.js` — Professional resume PDF template with a centered header, bold uppercase section titles with a double border, and clean organized sections.

- `formatDate` — Formats YYYY-MM date string to 'Mon YYYY' format
- `ProfessionalTemplate (default export)` — Renders the A4 PDF with centered name/contact, summary, professional experience with job-header rows, education with degree/institution, skills as comma-separated list, and additional information section

### `src/components/resume-templates/pdf-templates/Simple.js` — Simple/minimal resume PDF template with a straightforward layout, no borders or background colors, dash-style bullets.

- `formatDate` — Formats YYYY-MM date string to 'Mon YYYY' format
- `SimpleTemplate (default export)` — Renders the A4 PDF with minimal styling: name, contact line, summary, experience with dash bullets, education, skills, and additional information


---

## config

### `src/config/env.js` — Single source of truth for environment variable access. Centralizes all process.env references so renaming a variable only requires a change here. Also exports `validateEnv()` for boot-time validation of required vars (see `src/instrumentation.js`).

- `env (default export)` — Object mapping config keys to environment variables for auth secrets, MongoDB URI, AI keys (Gemini + DeepSeek), Stripe keys, Brevo email config, app URL, and `allowedOrigins` (the raw comma-separated `ALLOWED_ORIGINS` string consumed by the CSRF allow-list in `src/lib/csrf.js`). Added 2026-09-28.
- `validateEnv(opts)` — Returns `{ missing, warnings }`; throws when `opts.throwOnError` and required vars are absent.


---

## context

### `src/context/AuthContext.js` — React context providing authentication state (loading, isAuthenticated, user) across the app.

- `AuthProvider` — Context provider that fetches /api/user/profile on mount via an async effect with cancelled-flag cleanup (lint-clean); exposes loading, isAuthenticated, user state, and a useCallback-stable refetch
- `useAuth` — Hook to consume the AuthContext, returning { loading, isAuthenticated, user, refetch }


---

## hooks

### `src/hooks/useApiClient.js` — Simple fetch wrapper that ensures cookies (HttpOnly tokens) are always sent with requests by using credentials: 'include'. Auth is handled server-side via middleware proxy.

- `useApiClient` — Hook returning an apiClient function that wraps fetch() with credentials: 'include' to send cookies on every request

### `src/hooks/useProfile.js` — Provides the authenticated user's profile WITHOUT a duplicate network request. Reads from AuthContext (which already GETs /api/user/profile once per page load).

- `useProfile` — Hook returning { profile, loading, refetch } — profile comes from AuthContext state; refetch delegates to the auth context's fetch

### `src/hooks/useResumes.js` — Hook providing all resume CRUD operations (list, create, delete) for the current user, with permission checks.

- `useResumes` — Hook returning { resumes, deletingId, fetchResumes, createResume, deleteResume } -- manages resume list state and API interactions with permission gating

### `src/hooks/useWindowWidth.js` — Hook that tracks the browser window width for responsive UI adjustments.

- `useWindowWidth (default export)` — Hook returning { width } -- the current window.innerWidth, updated on window resize events


---

## lib

### `src/lib/accessControl.js` — The single authorization service. Role-based permission lists with 'ALL' wildcard support for admin, plus the canonical root-Admin rule and the fail-closed DB policy. **Fail-closed on store failure (2026-09-28, audit M2):** the old `hasPermissionDB` silently fell back to the compile-time `ROLE_PERMISSIONS` constants when the database was unreachable, so a revoked permission came back during an outage — an outage that *widened* access, which AGENTS.md §12 forbids.

- `hasPermission` — SYNC: Checks a numeric userRole against the compile-time ROLE_PERMISSIONS map, with 'ALL' wildcard support. Returns false for unknown roles. Client-component safe. **Not used as a server-side fallback any more** (see the policy below).
- `hasPermissionDB` — ASYNC: Authoritative server-side check. Rejects a missing/empty permission identifier, then resolves the policy through `resolveRolePolicy` and denies when none is available.
- `checkPermission` — SYNC: Constants-only check for client components.
- `checkPermissionDB` — ASYNC: Server-side check on a user object; denies when the user is missing or has no role.
- `getPermissionMetadata` — Retrieves metadata (name, description, requiredPlan) for a permission key.
- `invalidateRoleCache` — Drops the cached role snapshot. Called by `PUT /api/admin/roles` so a permission revocation takes effect on the next check instead of after the 60-second TTL.
- `isRootAdmin` — **The** canonical root-Admin predicate (`role === ROLES.ADMIN`). Routes/services must call this (or `hasPermissionDB`) instead of testing `role === 0` themselves, so there is exactly one unrestricted path (AGENTS.md §3A/§14).
- `getNonDelegablePermissions` — Returns the permission keys whose metadata sets `delegable: false` (today: `delegate_role_management`). No delegated manager may ever assign them.
- Internal: `loadDbRoles` — reads all roles into the snapshot; returns `{ ok: false }` on failure instead of throwing or falling back. Internal: `resolveRolePolicy` — resolution order: fresh cache → reload → **verified last-known-good DB snapshot (max 5 min old)** → `null` (caller denies) → deny. The compile-time constants are consulted only when the store loaded successfully and is genuinely **empty** (bootstrap, `node scripts/seed.mjs` never run), which is logged as a warning. **Documented fallback behaviour:** an unreachable store never widens access; the only availability fallback is the last verified DB snapshot, bounded to 5 minutes.

### `src/lib/ai/client.js` — Unified AI client that routes AI calls to the configured provider (Gemini or DeepSeek) for any task, with optional JSON parsing and automatic retry/backoff for transient provider failures (429/5xx, timeouts, network errors — max 3 attempts).

- `callAI` — Calls the AI provider configured for a taskKey with a prompt (with retry), optionally parses the response as JSON, and returns the result
- `runWithRetry` — Internal helper implementing exponential backoff (500ms, 1s); non-retryable errors fail fast

### `src/lib/ai/config.js` — AI task configuration mapping each task to a provider and model. Supports environment variable overrides per task.

- `AI_TASKS` — Object mapping task keys (RESUME_GENERATION, COVER_LETTER_GENERATION, AI_EDIT, RESUME_PARSING, GATEKEEPER) to { provider, model } -- all currently routed to DeepSeek. The GATEKEEPER key is unreferenced since the automation purge (2026-09-11) — no live callers.
- `getEffectiveConfig` — Returns the effective { provider, model } for a task key, checking for environment variable overrides (format: AI_TASK_<KEY>=provider:model) before falling back to AI_TASKS defaults

### `src/lib/ai/runners/deepseek.js` — DeepSeek AI API runner implementing the OpenAI-compatible chat completions endpoint. Requests carry `max_tokens: 4096` and a 60s AbortController timeout. Fixed 2026-09-21: parseDeepSeekJson strips preambles (slices from first `{` to last `}`).

- `callDeepSeek` — Calls the DeepSeek API (deepseek.com/v1/chat/completions) with model name and prompt, returns raw response text
- `parseDeepSeekJson` — Parses JSON from DeepSeek response text, stripping markdown code block markers and extracting the JSON object between the first `{` and last `}` (preamble-safe)

### `src/lib/ai/runners/gemini.js` — Gemini AI runner using the @google/generative-ai SDK. Generation is capped at `maxOutputTokens: 4096` with a 60s Promise-race timeout (via `withTimeout`). Fixed 2026-09-21: parseGeminiJson strips preambles (slices from first `{` to last `}`).

- `callGemini` — Calls the Gemini API with model name and prompt using the Google Generative AI SDK, returns response text
- `parseGeminiJson` — Parses JSON from Gemini response text, stripping markdown code block markers and extracting the JSON object between the first `{` and last `}` (preamble-safe)

### `src/lib/ai/withTimeout.js` — Small helper rejecting a wrapped promise if it doesn't settle within N ms.

- `withTimeout(promise, ms, label)` — Promise.race-based deadline; clears its timer on settle

### `src/lib/apiKeyAuth.js` — API key authentication library. **Kept live only for `resolveUserId()`,** which active resume / cover-letter / generate / parse routes call for auth (JWT path). The Bearer API-key side is dormant since the key-management UI/routes were archived on 2026-08-21 — no new keys can be created, though pre-existing DB keys would still validate.

- `authenticateRequest` — Validates a Bearer API key from the Authorization header, checks expiration, updates last-used timestamp, and returns the associated user document. **Dormant** — only consumer (archived gatekeeper route) removed.
- `resolveUserId` — Resolves a userId from either an API key (Bearer token) or the x-user-id header (JWT proxy), supporting both auth methods. Accepts optional `{ rateLimit }` option to apply daily rate limiting for API-key-authenticated calls. **Actively used** across live routes (JWT path).
- `checkRateLimit` — Checks and increments the daily API-call count for a user against a configurable limit (default 100), returning a 429 error when exceeded. **No longer dormant (2026-09-28):** `generate-content`, `generate-cover-letter`, `edit-resume-with-ai` and `parse-resume` now pass `{ rateLimit: API_KEY_LIMITS.* }` to `resolveUserId`, so a leaked API key is metered instead of granting unlimited unthrottled AI access.
- `generateApiKey` — **Deleted 2026-09-28** (unreferenced since the api-keys routes were archived).

### `src/lib/apiPermissionGuard.js` — Route-level permission guard that retrieves a user by ID and checks if they have a required permission before allowing access. Uses the fail-closed DB-backed `checkPermissionDB`. Status codes aligned with AGENTS.md §22 on 2026-09-28: **401** for a missing, malformed, or unresolvable identity (was a bare 401 with no code, a 404 for a missing user record, and a 500 CastError for a malformed id), **403** for a permission denial (now with a machine-readable `code`).

- `requirePermission(userId, permission)` — Validates the identity, loads the user, checks the permission via `checkPermissionDB`, and returns `{ user }` or `{ error }` with 401 (`UNAUTHENTICATED` / `INVALID_IDENTITY` / `IDENTITY_UNRESOLVABLE`) or 403 (`PERMISSION_DENIED`).
- `isPermissionError(result)` — Helper that returns true if a requirePermission result contains an error.
- `isValidObjectId(id)` — Validates the shape of a Mongo ObjectId **before** it reaches Mongoose, so client-supplied ids on `/api/admin/users/[id]/*` produce a clean 400 instead of a CastError 500.

### `src/lib/apiResponse.js` — Standardized API response helpers for Next.js route handlers, providing success/error responses, enveloped success, custom error classes, and error wrapping.

**Response envelope convention (documented 2026-08-21, deliberate):** list/detail GETs on resumes & cover letters return *unwrapped* data via `ok()` (the clients destructure the array/object directly), while mutations return the enveloped `{ success, data, message }` shape via `success()`. Binary endpoints (render-pdf) return raw buffers with JSON errors via `fail()`. Do not mix shapes within a single resource without updating its client.

- `ok(data, status=200)` — Returns a success NextResponse.json with raw data (unwrapped) and optional status. **Signature: `(data, status)` — second arg is an HTTP status number, NOT a message string.** For responses with both a message and a custom status, use `success()` instead.
- `success(data, message?, status=200)` — Returns a success NextResponse.json with a standard envelope (`{ success: true, data, message? }`) for consistent API contracts. Unlike `ok()`, the second arg is a string message and the third is the status code.
- `fail(message, status=400)` — Returns an error NextResponse.json with { success: false, error: message } and given status (default 400)
- `AppError` — Base error class with a `status` property for use with withErrorHandler
- `NotFoundError` — AppError subclass defaulting to 404
- `ValidationError` — AppError subclass defaulting to 400
- `AuthError` — AppError subclass defaulting to 401
- `ForbiddenError` — AppError subclass defaulting to 403
- `readJson(request, maxBytes)` — Reads a JSON body with a hard size cap (default 256KB) **measured in actual UTF-8 bytes**, returning `{ok, body}` or `{ok:false, response}` with 400/413 errors. Used by AI/PDF routes to bound payload size.
- `withErrorHandler` — Higher-order function that wraps a route handler, catching AppError subclasses for status-specific responses and generic errors for a 500 response

### `src/lib/sanitize.js` — Shared utility for sanitizing user-provided text (e.g. job descriptions, recipient names) against prompt injection patterns. The identity-override pattern only matches AI/system targets ("act as the system"), so legitimate job text like "act as a mentor" survives. Also exports `MAX_JOB_DESCRIPTION_LENGTH`. `sanitizeJobDescriptionWithInfo` was **deleted 2026-09-28** (unreferenced).

- `sanitizeJobDescription` — Strips prompt injection patterns from text and truncates to 8000 characters (logs a warning when truncation occurs)
- `MAX_JOB_DESCRIPTION_LENGTH` — Exported truncation limit (8000)

### `src/lib/auth-edge.js` — Edge-runtime JWT verification using the jose library. Used in middleware/edge functions for fast token validation without database access. Asserts the embedded `type` claim matches the expected token type. Fixed 2026-09-28: `jwtVerify` now passes `algorithms: JWT_ALGORITHMS` (HS256 only), so an HS384/HS512 token signed with the same secret is rejected.

- `verifyTokenEdge` — Verifies a JWT token (access or refresh) using jose and the appropriate secret key, returns the decoded payload
- `verifyAuthEdge` — Verifies authentication from access/refresh token cookies at the edge; returns { ok, userId, role } on success, or { ok: false } if invalid (cannot rotate at edge)

### `src/lib/auth.js` — Server-side authentication with JWT access/refresh token verification and secure refresh token rotation. Rotation uses a 60-second grace window: superseded tokens stay briefly valid (marked `supersededAt`, TTL-shortened) so parallel requests carrying the same just-rotated token rotate again instead of failing — fixes random logouts from concurrent refreshes. Rotation preserves remember-me lifetimes via `resolveRotationLifetime()` and returns `refreshTokenMaxAge` so cookies match.

- `rotateRefreshToken` — Verifies a refresh token, rejects superseded tokens past the grace window, marks the used token superseded instead of hard-deleting, and issues a new pair (carrying forward any >15-day lifetime). **Grace-replay hardening (2026-09-26):** keeps the FIRST `supersededAt` — re-presenting a superseded token no longer extends its window, so a captured token cannot live forever.
- `verifyAuth` — Main auth verification function: tries the access token first; if invalid/expired, attempts refresh token rotation; returns auth result with optional new tokens or cookie-clear signal

### `src/lib/constants.js` — Application-wide constants including role/permission enums, plan definitions, token config, routes, and API endpoints.

- `ROLES` — Enum mapping role names (ADMIN: 0, DEVELOPER: 70, SUBSCRIBER: 99, USER: 100) to numeric levels
- `PERMISSIONS` — Enum of 31 permission strings for admin/system, AI/content generation, resume management, cover letters, profile/account, and billing. `MANAGE_ROLES` is developer-tier (view/edit role matrix), while `DELEGATE_ROLE_MANAGEMENT` (added 2026-09-28) is the **root-ADMIN-only** permission required to actually rewrite a role's permission set. (Automation permission strings were removed in the 2026-09-11 purge; pre-purge DBs may still hold them as inert rows.)
- `ROLE_PERMISSIONS` — Maps each role to its array of granted permissions -- ADMIN uses 'ALL' wildcard (any permission check passes), DEVELOPER inherits base + pro + developer permissions via spread, SUBSCRIBER inherits base + pro permissions via spread, USER has base plus a free trial (GENERATE_RESUME + VIEW_OWN_RESUMES, added 2026-09-22) so free users can test generation with 3 daily credits. No more duplicated arrays.
- `PERMISSION_METADATA` — Maps all 31 permissions to metadata objects with name, description, and requiredPlan (FREE/PRO/DEVELOPER/ADMIN) matching actual role assignments. `delegate_role_management` additionally carries `systemProtected: true`, `adminOnly: true`, `delegable: false` and a `nonDelegableReason` — the metadata the backend enforces through `getNonDelegablePermissions()`.
- `PLANS` — Defines Free (3 credits/day, $0) and Pro (200 credits/month, $13.99) subscription plans
- `TOKEN_CONFIG` — JWT token configuration: access token expiry (15m), refresh token expiry (15 days), and type identifiers
- `JWT_ALGORITHMS` — `['HS256']`, the only algorithm ever issued and the allowlist passed to every `jwtVerify` call (added 2026-09-28)
- `API_KEY_LIMITS` — Daily per-key request caps for the AI-backed routes (added 2026-09-28): `GENERATE_CONTENT` 50, `GENERATE_COVER_LETTER` 50, `EDIT_RESUME_WITH_AI` 50, `PARSE_RESUME` 20
- `COOKIE_NAMES` — App-specific auth cookie names (`ats_accessToken`, `ats_refreshToken`, `ats_subCheckedAt`) used by proxy.js, serverAuth.js, verify-otp and logout routes. Added 2026-08-22: cookies are scoped by host (not port), so generic names were being clobbered by another localhost app on a different port, randomly logging users out
- `DEFAULTS` — Default values such as credits on signup
- `OTP_CONFIG` — OTP expiry configuration (5 minutes)
- `ROUTES` — Maps route names to URL paths for all app pages (home, login, onboarding, dashboard, profile, pricing, checkout, resume-history, ai-edit, cover-letters, admin).
- `API_ENDPOINTS` — Maps API endpoint categories (auth, user, resumes, generate, cover-letters, edit-with-ai, parse-resume, checkout, admin).

### `src/lib/coverLetter-generator.js` — Shared core for cover letter generation via AI. Builds prompts and calls the AI client to produce a cover letter JSON object.

- `generateCoverLetter` — Generates a cover letter by constructing a detailed prompt from the user's resume, job description, and optional recipient/sender info, then calling the AI client. Fixed 2026-09-28: `recipientName` and `userName` are scrubbed with `sanitizeJobDescription` and capped at `MAX_NAME_LENGTH` (200) **inside the library** as defence in depth, in addition to the route-level scrubbing — they used to be interpolated raw, leaving a prompt-injection lane into the INSTRUCTIONS block.

### `src/lib/coverLetterFields.js` — Source of truth for the cover letter content structure — defines all fields, their types, labels, and required flags. Also provides schema generation helper mirroring resumeFields.js.

- `COVER_LETTER_FIELDS` — Constant object mapping each cover letter field key to its type, label, and required flag.
- `buildEmptyCoverLetter` — Returns a blank cover letter content object with empty strings and an empty array for bodyParagraphs.
- `generateCoverLetterContentSchema` — Generates a Mongoose schema definition from COVER_LETTER_FIELDS (text→String, array→[String]) for the cover letter content field, replacing the previous strict:false schema.

### `src/lib/dateUtils.js` — Collection of pure date manipulation and comparison utility functions.

- `isSameDay` — Checks if two dates fall on the same calendar day (year, month, date).
- `addDays` — Returns a new Date shifted by the specified number of days.
- `isPast` — Returns true if the given date is before the current time.
- `now` — Returns the current date/time — useful as a mock point in tests.

### `src/lib/logger.js` — Centralized logging service providing structured JSON log output at INFO, WARN, ERROR, and DEBUG levels.

- `logger` — Singleton Logger instance with info(), warn(), error(), and debug() methods that format and output structured JSON log entries.

### `src/lib/mongodb.js` — MongoDB connection manager using Mongoose with a cached singleton pattern to reuse connections across hot reloads.

- `dbConnect (default export)` — Returns a cached Mongoose connection, creating one if none exists. Reads `MONGODB_URI` lazily inside the call (never at import time, so `next build` succeeds without env) and throws a clear error if missing. Clears a rejected promise so subsequent calls retry.

### `src/lib/pdf-generator.js` — Shared core for PDF generation — produces PDF blobs for resumes (using named templates) and cover letters.

- `ALLOWED_TEMPLATES` — Allowlist of template ids that may be dynamically imported (client-controlled values are validated against it; `.js` suffix normalized).

- `generatePdf` — Validates the requested template against ALLOWED_TEMPLATES, dynamically imports the component **using the validated id (never the raw client string)** + PdfResumeRenderer, renders to a PDF blob Buffer.
- `generateCoverLetterPdf` — Dynamically imports the cover letter template, renders it to a PDF blob, and returns it as a Buffer.

### `src/lib/planResolver.js` — Pure helper mapping a client-supplied plan identifier to a PLANS key (extracted from create-session for unit testing — C1 regression guard).

- `resolvePlanKey(planName)` — Accepts the KEY ('PRO') or display name ('Pro') case-insensitively; returns the canonical PLANS key or null for unknown input.

### `src/lib/promptConfig.js` — Single source of truth for AI prompt strategies — maps user roles to prompt tiers and provides builder functions for each tier.

- `PROMPT_STRATEGIES` — Maps user roles (ADMIN, DEVELOPER, SUBSCRIBER, USER) to template names (premium, standard, basic).
- `PROMPT_TEMPLATES` — Registry of prompt builder functions keyed by template name: basic, standard, premium.
- `buildPromptForRole` — Public API that looks up the prompt strategy for a given user role and invokes the corresponding builder function to produce the final prompt string.

### `src/lib/rateLimit.js` — Simple in-memory sliding-window rate limiter (per server instance) used to protect CPU/AI-heavy endpoints.

- `rateLimit(key, limit, windowMs)` — Tracks hit timestamps per key; returns `{ allowed }` (+ `retryAfterMs` when denied). Opportunistically prunes stale buckets.

### `src/lib/resume-generator.js` — Shared core for resume generation via AI. Builds a role-appropriate prompt and calls the AI client.

- `generateResume` — Generates a tailored resume by building a prompt via buildPromptForRole and calling the AI client. Returns { resume, metadata }.

### `src/lib/resumeFields.js` — Single source of truth for the resume content structure. Defines every section and field and provides helpers to derive Mongoose schemas, AI prompt schemas, and blank form state.

- `FIELD_TYPES` — Constants for field types: TEXT, EMAIL, URL, MONTH, TEXTAREA, CHECKBOX, BULLET_LIST, TAG_LIST.
- `RESUME_FIELD_SCHEMA` — Master schema definition describing all resume sections (profile, work_experience, education — now with `is_current` checkbox so "Present" logic works — skills, additional_info) and their fields.
- `normalizeSkills(skills)` — Normalizes every historical skills shape (array of strings, [{skill_name, category}], {list_of_skills: []}, raw string) into an array of strings. Used by all PDF templates and display views.
- `buildEmptyResume` — Returns a blank resume content object matching the structure of RESUME_FIELD_SCHEMA.
- `buildEmptyArrayItem` — Returns a blank item object for a given array-type section (e.g. work_experience entry).
- `generateMongooseContentSchema` — Generates a Mongoose Schema definition for the resume content field by mapping field types to Mongoose types.
- `generateAIPromptSchema` — Generates a JSON example string (for AI prompts) derived from the field schema.

### `src/lib/resumeSchema.js` — Auto-derives JSON schema strings for AI prompts from the resume field definitions in resumeFields.js.

- `RESUME_SCHEMA_FOR_PROMPT` — JSON schema string for the resume content object, used in AI prompts.
- `RESUME_WITH_METADATA_SCHEMA_FOR_PROMPT` — JSON schema string wrapping the resume schema with a metadata object (jobTitle, companyName) for content generation responses.

### `src/lib/serverAuth.js` — Server action authentication — the single source of truth for retrieving the authenticated user's ID and role from cookies in server actions.

- `getAuthenticatedUser` — Reads access and refresh tokens from cookies (via `COOKIE_NAMES` constants), verifies authentication, and returns { userId, role } or null values on failure.

### `src/lib/stripe.js` — Lazy Stripe SDK singleton (fixed 2026-09-26: was throwing at import time, which broke `next build` without keys).

- `getStripe()` — Returns the cached Stripe instance (apiVersion 2023-10-16), creating it on first use. Throws only when called without `STRIPE_SECRET_KEY` set — never at import. All 5 consumers (checkout create/verify/portal, admin user delete, webhook) call it inside handlers and return 503 when billing is unconfigured.

### `src/lib/subscriptionChecker.js` — Subscription expiration checking and automatic user downgrade logic.

- `checkAndDowngradeExpiredSubscription` — Checks if a user's subscription has expired and downgrades their role to USER if so; **clears `subscriptionId`** so credit limits no longer treat them as PRO.
- `isSubscriptionActive` — Returns a strict boolean: `subscriptionStatus === 'active'` **and** `subscriptionExpiresAt` strictly in the future. No longer dead code (2026-09-28): `SubscriptionService.getLimit` now calls it, so an expired subscriber cannot keep Pro limits when the periodic downgrade job has not run yet. Also hardened to return `false` (not `undefined`) when no expiry is recorded.

### `src/lib/utils.js` — Utility functions for SHA-256 hashing (hex string and raw Buffer variants) and JWT access/refresh token generation and verification. `generateRefreshToken` accepts an optional `expiresIn` (default '15d') for remember-me sessions; `resolveRotationLifetime` (pure, tested) carries a longer lifetime forward on rotation.

- `sha256` — Computes a SHA-256 hex digest of the input string.
- `hashToken` — Alias for sha256.
- `sha256Buffer` — SHA-256 hash returning a raw Buffer (for key derivation, etc.). No live importers since `src/lib/encryption.js` was purged with the automation archive (2026-09-11); kept for reuse.
- `generateAccessToken` — Creates and signs a JWT access token containing `type: 'access'`, userId and role, using the configured expiry.
- `generateRefreshToken` — Creates and signs a JWT refresh token containing `type: 'refresh'` and userId, with a configurable expiry (default 15 days, '30d' for remember-me).
- `verifyToken` — Verifies a JWT token (access or refresh) using the corresponding secret, **pinned to `algorithms: ['HS256']`** (2026-09-28 — verification previously accepted any HMAC algorithm, so HS384/HS512 tokens signed with the same secret were accepted although only HS256 is ever issued), and asserts the embedded `type` claim matches (legacy claim-less tokens tolerated).
- `resolveRotationLifetime` — Pure helper returning `{ expiresAt, maxAgeSeconds, jwtExp }`: preserves remaining lifetime when it exceeds 15 days, otherwise the default 15-day window.


### `src/lib/clientIp.js` — Resolves the **platform-provided** client IP and derives non-reversible rate-limit keys (added 2026-09-28).

- `getClientIp(request)` — Returns the first present value among `x-vercel-forwarded-for`, `cf-connecting-ip`, `x-real-ip`, else `'unknown'`. `x-forwarded-for` is deliberately ignored: it is client-supplied and trivially forged, which was the root cause of the bypassable OTP throttle.
- `buildOtpThrottleKey(request, normalizedEmail)` — SHA-256 hash of the client IP joined with a SHA-256 hash of the normalized email. Hashing keeps raw addresses out of memory/logs.

### `src/lib/csrf.js` — Origin / Sec-Fetch-Site allow-list for state-changing API requests, enforced by `src/proxy.js` (added 2026-09-28). Fails closed on any mismatch, consistent with the existing nonce CSP.

- `checkCsrfRequest(request, { pathname, allowedOrigins })` — Returns `null` when the request may proceed or a 403 `NextResponse` otherwise. Safe methods pass. Bearer API-key callers pass (no ambient cookie authority). `Sec-Fetch-Site` of anything other than `same-origin`/`none` → `CSRF_CROSS_SITE`. A present `Origin` must be in the normalized allow-list → otherwise `CSRF_BAD_ORIGIN`. Requests with neither header (server-to-server SDK, curl, the proxy's own internal fetch) proceed.
- `isCsrfExempt(pathname)` — `/api/webhooks/*` is exempt (Stripe authenticates by signature, not cookies). Look-alike paths are not exempt.
- `normalizeOrigins(origins)` — Trims, URL-parses and de-duplicates the allow-list; malformed entries are dropped rather than widening the list.

### `src/lib/roleAuthorization.js` — Centralized guards for delegated role/user administration (added 2026-09-28). Every guard returns a plain `{ allowed: true }` / `{ allowed: false, reason, code, deniedPermissions? }` decision so routes stay thin and the rules are unit-testable. Numeric ranks are used here **only** for administrative hierarchy boundaries; feature authorization always resolves named permissions through `hasPermissionDB()`.

- `evaluateRootRoleWrite(roleValue)` — Refuses `roleValue === ROLES.ADMIN` outright (`ROOT_ROLE_PROTECTED`): only root ADMIN may write the root role, and it can never be created, cloned or renamed into through ordinary CRUD.
- `evaluateRankCeiling(actor, targetRank, { newRank })` — Root ADMIN may manage any rank. Otherwise: an unknown/malformed caller rank fails closed (`CALLER_RANK_UNKNOWN`), a target rank higher than the caller's is refused (`RANK_CEILING_EXCEEDED`), and so is an assignment above the caller's own rank (`RANK_ASSIGNMENT_EXCEEDED`).
- `evaluateSelfChange({ actorId, targetId, newRank, currentRank })` — Self-escalation guard. Blocks **any** change to the caller's own account: a higher rank is `SELF_ESCALATION_BLOCKED`, any other change `SELF_ROLE_CHANGE_BLOCKED`. Replaces the old self-demotion-only check that permitted self-promotion to root.
- `evaluateRolePermissionWrite({ actor, roleValue, permissions })` — Full pre-write evaluation for `PUT /api/admin/roles`, in order: well-formed list (invalid / duplicate / >200 entries rejected) → delegation authority → root-role protection → rank ceiling → no rewrite of the caller's own role (`SELF_ROLE_REWRITE_BLOCKED`) → no `ALL` wildcard (`WILDCARD_FORBIDDEN`) → no non-delegable permission (`NON_DELEGABLE_PERMISSION`) → no unknown key (`UNKNOWN_PERMISSION`) → **permission ceiling**: a non-root caller can never grant a permission they do not hold (`PERMISSION_CEILING_EXCEEDED`). Root ADMIN is exempt from the permission ceiling by design (wildcard authority).
- `evaluateUserRoleChange({ actor, actorId, targetId, newRank, currentRank })` — Composes the self-change guard with the rank ceiling for role changes on a user account. The `CHANGE_USER_ROLE` permission itself is checked by `requirePermission` first.

### `src/lib/auditLog.js` — Durable audit trail for security-sensitive mutations (added 2026-09-28). Writes are best-effort and never throw into the request path, but a failed write is logged as an error.

- `recordAuthorizationEvent({ actorId, actorRole, action, targetType, targetId, outcome, before, after, request })` — Persists one `AuthorizationEvent`. `outcome` is `allowed` or `denied`. Values are reduced to scalars, truncated, and any key matching a credential pattern (token/secret/password/otp/authorization/apiKey/cookie/signature/customerId/…) is replaced with `[redacted]` — secrets and full tokens are never written.
- `resolveRequestId(request)` — Honours an inbound `X-Request-Id` (validated) or generates a UUID, so proxy and API logs can be correlated.
- Internal: `sanitizeValue` — depth-limited, length-capped, credential-redacting serializer used for the before/after snapshots.

---

## models

### `src/models/ApiKey.js` — Mongoose model for API keys associated with users for programmatic access.

- `ApiKey (default export)` — Mongoose model with fields: userId, name, key, keyPrefix, isActive, lastUsedAt, expiresAt, createdAt, revokedAt.
- **Kept** because `src/lib/apiKeyAuth.js` imports it; no new keys can be created since the management UI/routes were archived 2026-08-21.

### `src/models/CoverLetter.js` — Mongoose model for saved cover letters with content schema derived from coverLetterFields.js and metadata.

- `CoverLetter (default export)` — Mongoose model with fields: userId, content (generated schema from generateCoverLetterContentSchema — fields validated against COVER_LETTER_FIELDS), metadata (jobTitle, companyName, coverLetterName), createdAt.

### `src/models/DailyCount.js` — Mongoose model for tracking daily per-user usage counts (API rate limiting / automation quotas).

- `DailyCount (default export)` — Mongoose model with fields: userId, date, count. Has a unique compound index on (userId, date).
- **Kept** because the rate limiter in `src/lib/apiKeyAuth.js` imports it; its main consumer (automation daily-count route) was archived 2026-08-21.

### `src/models/Permission.js` — Mongoose model for permission metadata stored in the database, seeded from constants.js with upsert support.

- `Permission (default export)` — Mongoose model with fields: key (unique), name, description, group (Admin/AI/Resume etc.), requiredPlan (FREE/PRO/DEVELOPER/ADMIN), timestamps. Used by the admin permission management UI and seed script.

### `src/models/AuthorizationEvent.js` — Mongoose model for the authorization/audit event log (added 2026-09-28). One document per sensitive mutation or blocked attempt.

- `AuthorizationEvent (default export)` — Fields: `actor` (ref User, indexed), `actorRole` (number), `action` (indexed), `targetType`, `targetId` (indexed), `outcome` (`allowed` | `denied`), `before`/`after` (Mixed, redacted snapshots), `requestId`, `ip` (platform-provided), `userAgent`, `createdAt` (timestamps, no updatedAt). Actions currently written: `role.permissions.updated`, `role.permissions.denied`, `user.role.updated`, `user.role.denied`, `user.credits.adjusted`, `user.credits.reset`, `user.deleted`, `user.delete.denied`, `subscription.upgraded`, `subscription.upgrade.denied`, `subscription.upgrade.replay_blocked`.

### `src/models/refreshToken.js` — Mongoose model for authentication refresh tokens with a compound index on userId+token and a TTL index on expiresAt for automatic MongoDB document deletion.

- `default export (RefreshToken model)` — Reuses existing Mongoose model or creates a new 'RefreshToken' model with fields: userId, token (hashed), expiresAt, supersededAt (rotation grace-window marker — superseded rows are TTL-shortened and rejected after 60s), createdAt, userAgent, ip.

### `src/models/resume.js` — Mongoose model for resume documents with dynamic content schema generated from src/lib/resumeFields.js, linked to a User and optional ResumeMetadata.

- `default export (Resume model)` — Reuses existing Mongoose model or creates a new 'Resume' model with fields: userId, content (dynamically generated schema), metadata (ref to ResumeMetadata), createdAt.

### `src/models/resumeMetadata.js` — Mongoose model for lightweight resume metadata (job title, company name, resume name) linked to a User and Resume.

- `default export (ResumeMetadata model)` — Reuses existing Mongoose model or creates a new 'ResumeMetadata' model with fields: userId, resumeId, jobTitle, companyName, resumeName, createdAt.

### `src/models/Role.js` — Mongoose model for role documents with embedded permissions array, seeded from constants.js.

- `Role (default export)` — Mongoose model with fields: name (unique, USER/SUBSCRIBER/DEVELOPER/ADMIN), value (unique, 100/99/70/0), permissions (array of strings), isAdmin (boolean, true -> ALL wildcard), description, timestamps. Used by DB-backed permission checking and admin management UI.

### `src/models/Transaction.js` — Mongoose model for tracking payment transactions via Stripe, supporting both subscription and one-time payments with status tracking (pending/completed/failed/refunded). Has a **unique index on stripePaymentId** for idempotency against webhook retries.

- `default export (Transaction model)` — Reuses existing Mongoose model or creates a new 'Transaction' model with fields: user, stripePaymentId, stripeSubscriptionId, stripeCustomerId, amount (cents), currency, status, planName, type (subscription/one-time), createdAt, metadata.

### `src/models/User.js` — Mongoose model for users storing authentication, subscription, OTP, and resume reference data, with role-based access control.

- `default export (User model)` — Reuses existing Mongoose model or creates a new 'User' model with fields: email, name, dateOfBirth, role (from ROLES constants), creditsUsed, lastCreditResetDate, subscriptionId, customerId, subscriptionExpiresAt, subscriptionStatus (**enum extended 2026-08-22** to active/trialing/past_due/unpaid/inactive/expired/canceled/none so webhook writes never poison documents into failing later save() validation), plan, otp, otpExpires, otpAttempts (brute-force counter), lastOtpSentAt (resend cooldown), createdAt, mainResume, generatedResumes.


---

## proxy.js

### `src/proxy.js` — Next.js Middleware that handles authentication (JWT verification and token rotation), subscription status checking, route-level access control (admin/protected/public), CSRF screening, and cookie management. Fixed 2026-09-21: protects /cover-letters/* + /ai-edit/* (were unauthenticated); internal fetches use req.nextUrl.origin + 5s AbortSignal.timeout. Fixed 2026-09-22: rotated refresh cookie honors the rotation response's maxAge (validated, capped at 31 days) so remember-me sessions survive rotation. Hardened 2026-09-28: **CSRF check on every non-GET `/api/*` request** before any auth work, and the bare 401 now carries `code: 'UNAUTHENTICATED'`.

- `proxy(req)` — Main middleware handler. Validates authentication via verifyAuthEdge, attempts token rotation using refresh tokens on failure, periodically checks subscription status, enforces role-based routing (redirects unauthenticated users to login, admins-only for /admin, authenticated users away from /login), injects x-user-id header on API requests, and manages cookie setting/clearing for tokens and subscription check timestamps. All auth cookies are read/written via the `COOKIE_NAMES` constants (`ats_*` prefix — added 2026-08-22 so other localhost apps on different ports can't clobber the session).
- `config` — Next.js middleware matcher configuration specifying which route patterns trigger the proxy: /api/:path*, /dashboard/:path*, /profile/:path*, /onboarding/:path*, /admin/:path*, /login, /resume-history/:path*, /checkout/:path*, /cover-letters/:path*, /ai-edit/:path*.
- Hardened 2026-08-21: `/api/health` is exempted at the top of the handler so uptime monitors can reach it without auth; the internal subscription-check fetch now forwards the request Cookie header instead of trusting a client-settable x-user-id.
- Hardened 2026-08-22: on failed rotation the proxy checks whether the refresh JWT is still structurally valid — if so (rotation race in flight) cookies are NOT cleared, preventing random logouts; `subCheckedAt` cookie is now httpOnly+secure so client JS can't postpone periodic downgrade checks.
- `allowedOrigins(req)` — Builds the CSRF allow-list: `env.appUrl` (NEXT_PUBLIC_APP_URL) + the comma-separated `ALLOWED_ORIGINS` env var + the request's own origin.
- CSRF (2026-09-28): every non-GET `/api/*` request runs `checkCsrfRequest()` **first**, before authentication. A mismatched `Origin`, a `Sec-Fetch-Site` of `cross-site`/`same-site`, or a malformed Origin is refused with 403 and a machine-readable code — failing closed. Bearer API-key callers and `/api/webhooks/*` (server-to-server, signature-authenticated) are exempt, as are safe methods.


---

## services

### `src/services/aiCoverLetterEditorService.js` — AI-powered cover letter editing service that uses natural language queries to modify an existing cover letter via the AI client.

- `editCoverLetterWithAI(coverLetterContent, query)` — Takes the current cover letter content object and a natural language edit query, constructs a prompt instructing an AI to edit the cover letter while preserving the COVER_LETTER_FIELDS schema, and returns the updated cover letter content via callAI.

### `src/services/aiResumeEditorService.js` — AI-powered resume editing service that uses natural language queries to modify an existing resume via the AI client.

- `editResumeWithAI(resume, query)` — Takes the current resume data object and a natural language edit query, constructs a prompt instructing an AI to edit the resume within the RESUME_SCHEMA_FOR_PROMPT schema, and returns the updated resume data via callAI. Returns original data if the query cannot be fulfilled.

### `src/services/resumeParsingService.js` — Resume file parsing service that extracts text from PDF and DOCX files, then uses AI to parse the text into structured resume data. Type detection is content-based (magic bytes).

- `extractText(fileBuffer, fileType)` — Internal helper that extracts raw text from a file buffer based on MIME type: uses unpdf for PDF and mammoth for DOCX. Throws on unsupported file types.
- `parseResume(fileBuffer)` — Takes a verified Buffer (type detection via magic bytes: %PDF or ZIP container; never trusts client MIME), extracts raw text via extractText, sanitizes + bounds it against prompt injection (8000 chars), then sends the text to an AI with a structured JSON schema prompt (**YYYY-MM dates**, matching FIELD_TYPES.MONTH) to parse into profile, work_experience, education, skills, and additional_info fields.

### `src/services/resumeService.js` — Centralized CRUD service for all resume-related database operations, handling Resume and ResumeMetadata models with flexible query options.

- `ResumeService.getResumeById(resumeId, options)` — Gets a single resume by ID with configurable population, field selection, lean mode, and throw-on-not-found behavior.
- `ResumeService.getResumeWithMetadata(resumeId, throwOnNotFound)` — Convenience wrapper that gets a resume with its metadata reference populated.
- `ResumeService.getResumesByUserId(userId, options)` — Gets all resumes for a user with metadata population, limit, sort, and lean options.
- `ResumeService.createResume(userId, content, metadata, options)` — Creates a new resume document, optionally creates associated ResumeMetadata, and can return the populated result.
- `ResumeService.updateResumeContent(resumeId, content, returnNew)` — Updates a resume's content field using $set.
- `ResumeService.updateResumeMetadata(metadataId, updates, returnNew)` — Updates a ResumeMetadata document fields.
- `ResumeService.deleteResume(resumeId, options)` — Deletes a resume and optionally its associated metadata document.
- `ResumeService.getResumeContent(resumeId)` — Retrieves just the content field of a resume as a plain JS object.

### `src/services/coverLetterService.js` — Centralized CRUD service for all cover letter database operations. Mirrors the pattern in resumeService.js. Used by cover letter API routes instead of inline model operations.

- `CoverLetterService.getCoverLetterById(id, userId, options)` — Gets a single cover letter by ID and userId with configurable lean and throw-on-not-found behavior.
- `CoverLetterService.getCoverLettersByUserId(userId, options)` — Gets all cover letters for a user with limit, sort, and lean options.
- `CoverLetterService.createCoverLetter(userId, content, metadata)` — Creates a new cover letter document with optional metadata (jobTitle, companyName, coverLetterName).
- `CoverLetterService.updateCoverLetter(id, userId, updates, returnNew)` — Updates a cover letter's content and/or metadata fields using findOneAndUpdate scoped to userId.
- `CoverLetterService.deleteCoverLetter(id, userId)` — Deletes a cover letter by ID and userId using findOneAndDelete.

### `src/services/subscriptionService.js` — Subscription and credit usage management service that tracks per-user daily/weekly credit limits, resets usage for free users, and enforces plan boundaries. Fixed 2026-09-28 (audit H2): `getLimit` granted Pro credits on `role === SUBSCRIBER` + `subscriptionStatus === 'active'` and never compared `subscriptionExpiresAt`, so a lapsed subscriber kept Pro limits whenever the periodic downgrade had not run (the proxy only triggers it every 5 minutes, best-effort).

- `SubscriptionService.getLimit(user)` — Async; DB-backed UNLIMITED_CREDITS check (checkPermissionDB with the full user object, fail-closed) so admin revocations apply immediately. PRO limits now require `role === SUBSCRIBER` **and `isSubscriptionActive(user)`** — status `active` *plus* an expiry strictly in the future. A stale `subscriptionId`, a missing expiry, or an elapsed one all fall back to Free limits, so an expired subscriber cannot keep Pro credits between periodic downgrade runs.
- `SubscriptionService.trackUsage(userId, amount)` — Atomically increments a user's creditsUsed counter only if it would not exceed the limit. Automatically checks/resets daily limits for free users. Returns true on success, false if limit would be exceeded.
- `SubscriptionService.hasCredits(userId, amount)` — Checks whether a user has enough remaining credits for a given operation without deducting. Returns boolean.
- `SubscriptionService.checkAndResetDailyLimits(user)` — Resets a free user's creditsUsed to 0 if the current day differs from lastCreditResetDate. Skips reset for subscriber-role users.
- `SubscriptionService.refundUsage(userId, amount)` — Atomically refunds previously-deducted credits when an operation fails after deduction (floored at zero).
- `SubscriptionService.resetUsage(userId)` — Manually resets a user's creditsUsed to 0 and updates lastCreditResetDate to now.

### `src/services/userService.js` — Centralized CRUD service for all user-related database operations, handling the User model with flexible query, population, and update methods.

- `UserService.getUserById(userId, options)` — Gets a user by ID with configurable population, field selection, lean mode, and throw-on-not-found behavior.
- `UserService.getUserWithMainResume(userId, throwOnNotFound)` — Convenience wrapper that gets a user with their mainResume reference populated.
- `UserService.getUserWithResumes(userId, throwOnNotFound)` — Convenience wrapper that gets a user with both generatedResumes and mainResume populated.
- `UserService.getUserRole(userId)` — Retrieves just the role field of a user as a lean plain JS object.
- `UserService.updateUserRole(userId, newRole, returnNew)` — Updates a user's role to the specified value.
- `UserService.setUserCredits(userId, credits)` — Sets a user's creditsUsed field to a specific value.
- `UserService.incrementUserCredits(userId, amount)` — Increments (or decrements if negative) a user's creditsUsed field atomically using $inc.
- `UserService.updateUser(userId, updateData, options)` — Generic update for any user fields with configurable returnNew and runValidators options.
- `UserService.addGeneratedResume(userId, resumeId)` — Pushes a resume ID into the user's generatedResumes array.
- `UserService.removeGeneratedResume(userId, resumeId)` — Pulls a resume ID from the user's generatedResumes array.

### `scripts/backfill-users.mjs` — One-time data migration (2026-08-22 audit follow-ups). Idempotent; supports `--dry-run`.
1. Lowercases + trims all user emails (skips with a warning on collisions for manual merge).
2. Clears stale `subscriptionId` from users who are not active subscribers (unless their paid-through window hasn't passed).

**Applied 2026-08-22**: 0 email conflicts, 2 stale subscriptionIds cleared.

**Usage:** `node scripts/backfill-users.mjs [--dry-run]` (reads MONGODB_URI from env or `.env.local`)

### `scripts/sync-free-tier.mjs` — Targeted free-trial grant (added 2026-09-22). `$addToSet`s `generate_resume` + `view_own_resumes` onto the USER role and flips their requiredPlan to FREE — unlike a full seed re-run, it never overwrites other custom admin permission edits. Idempotent; supports `--dry-run`.

**Usage:** `node scripts/sync-free-tier.mjs [--dry-run]` (reads MONGODB_URI from env or `.env.local`)

### `vitest.config.mjs` — Vitest test runner config: `@/*` alias + an Oxc-based plugin that compiles JSX inside the app's `.js` source files (Next.js convention) so templates can be imported in tests. Tests live in `tests/` and run via the single entry point `npm test` (11 files / 139 tests as of 2026-09-28). (Renamed from `.js` on 2026-09-26 to silence the Vite ESM/CommonJS loader warning.)

### `tests/aiParsers.test.js` — Regression tests for AI JSON parsers (added 2026-09-21 for audit H2 fix).

- `AI JSON parsers strip preambles` — Verifies parseDeepSeekJson + parseGeminiJson handle leading conversational text, markdown fences, and clean JSON.

### `tests/normalizeSkills.test.js` — Regression tests for the skills-shape normalizer.

- `normalizeSkills` — Verifies arrays of strings pass through, `[{ skill_name, category }]` maps to names, legacy `{ list_of_skills: [...] }` unwraps, comma-separated strings split, and empty/junk input yields `[]`.

### `tests/pdfTemplates.test.jsx` — Regression tests rendering all six PDF templates (added for audit H3 fix).

- `PDF templates render schema-shaped skills` — Renders Classic, Classic 2, Modern, Professional, Creative, and Simple via @react-pdf/renderer + unpdf text extraction and asserts skills content appears (guards the legacy-shape blank-Skills bug).

### `tests/planResolver.test.js` — Regression tests for plan-key resolution (added for audit C1 fix).

- `resolvePlanKey` — Verifies PRO/FREE resolve by key or display name case-insensitively (with whitespace trimmed) and unknown/non-string input returns null.

### `tests/rotationLifetime.test.js` — Regression tests for remember-me rotation (added 2026-09-22).

- `resolveRotationLifetime` — Verifies standard sessions keep the 15-day window, 30-day tokens carry remaining lifetime forward, expired tokens fall back to 15 days.

### `tests/accessControl.test.js` — Authorization-service regression tests (added 2026-09-28). Mongoose/Mongo mocked via `vi.mock`; no live database.

Covers: the `delegate_role_management` registry entry and that only root ADMIN holds it; `evaluateRolePermissionWrite` refusals (DELEGATION_NOT_PERMITTED for a DEVELOPER, ROOT_ROLE_PROTECTED for roleValue 0, PERMISSION_CEILING_EXCEEDED laundering, NON_DELEGABLE_PERMISSION, WILDCARD_FORBIDDEN, malformed/duplicate/unknown lists) and the root-ADMIN success path; rank-ceiling and self-escalation guards (including the still-blocked self-demotion); **store-outage fail-closed behaviour** (a revoked permission is not restored from the constants, ADMIN is denied too, unknown roles deny, last-known-good snapshot serves briefly, roles-PUT cache invalidation is immediate); and HS256-only JWT verification (HS384/HS512 rejected by `verifyToken` and `verifyTokenEdge`).

### `tests/adminAuthorization.test.js` — Route-level authorization tests for the highest-risk admin/billing paths (added 2026-09-28). Mongoose models are mocked.

Covers: `PUT /api/admin/roles` (DEVELOPER 403, unauthenticated 401, roleValue 0 refused, laundering refused, wildcard refused, root ADMIN 200 + cache invalidation, audit events for allowed and denied writes); `PATCH /api/admin/users/[id]/role` (self-promotion blocked, self-demotion still blocked, rank ceiling, root ADMIN allowed + audited, malformed id 400); `DELETE /api/admin/users/[id]` (DEVELOPER 403 because DELETE_USER is admin-only, delete_user holder allowed with cascade, unauthenticated 401, malformed id 400, self-delete blocked); `POST /api/checkout/verify-session` (single-use: replay → 409 with no writes, no `creditsUsed` refund, cancelled/expired subscriptions never reactivated, cross-user/unpaid/non-PRO refused, 401, 413); and unauthenticated/cross-user (IDOR) coverage on the resume and cover-letter id routes plus 401 vs 403 status-code behaviour.

### `tests/subscriptionLimits.test.js` — Credit-limit entitlement tests (added 2026-09-28). Fake timers pin the boundary.

Covers: Pro limits for an active unexpired subscriber; Free limits when the subscription is expired, missing an expiry, or not `active`; the exact-expiry instant treated as expired; no Pro for a non-subscriber role; `UNLIMITED_CREDITS` still short-circuiting; and `isSubscriptionActive` agreement at every boundary.

### `tests/csrf.test.js` — CSRF allow-list tests for `checkCsrfRequest` (added 2026-09-28).

Covers: same-origin POST passes; a configured secondary origin passes; trailing slashes normalized; mismatched and malformed Origins refused; **no Origin but `Sec-Fetch-Site: cross-site` refused**; `same-site` refusals; an empty allow-list refuses; safe methods never blocked; Bearer API-key callers exempt; `/api/webhooks/*` exempt but look-alikes are not; header-less server-to-server requests allowed.

### `tests/securityControls.test.js` — Prompt-injection, body-size and IP-throttle tests (added 2026-09-28).

Covers: `recipientName`/sender-name injection payloads scrubbed out of the cover-letter prompt while legitimate names survive; `readJson` size guard (413 for oversized, byte-not-character measurement, 400 for malformed JSON); API-key daily caps defined for every AI-backed route; and the OTP throttle key ignoring a forged `x-forwarded-for` while keying on the platform IP, never embedding the raw IP or email.

### `tests/aiRouteHardening.test.js` — Route-boundary tests for the AI write paths (added 2026-09-28).

Covers: `POST /api/generate-cover-letter` passes a sanitized, ≤200-char recipient name to the generator, actually passes a daily API-key rate limit to `resolveUserId`, and `POST /api/cover-letters` charges one credit, refunds on failure, refuses without credits, and enforces the body size guard.

### `scripts/seed.mjs` — Standalone seed script for Permission and Role collections. Updated 2026-09-22: USER mirror includes the free trial (`generate_resume`, `view_own_resumes`, requiredPlan FREE). Updated 2026-09-28: mirrors the new `delegate_role_management` permission (requiredPlan ADMIN) and its `Admin` group so the drift guard stays green.

Populates the database with all 31 permissions and 4 roles (ADMIN, DEVELOPER, SUBSCRIBER, USER) using a hand-mirrored copy of constants.js metadata. **Must be run when switching to a fresh database** — without it, the admin permissions page shows nothing.

Includes a **drift guard**: before writing, it parses `src/lib/constants.js` and compares every permission's requiredPlan against the seed map, exiting with an error listing mismatches. (Historical note: a requiredPlan drift for 5 admin permissions was found and fixed on 2026-08-21 — the guard prevents recurrence.)

**⚠️ Dual source of truth:** Permissions live in two places — `constants.js` (compile-time fallback used by `accessControl.js`) and the MongoDB `permissions`/`roles` collections (runtime source read by the admin UI). When adding/modifying a permission:
  1. Edit `src/lib/constants.js` (add to `PERMISSIONS`, `PERMISSION_METADATA`, and the relevant `ROLE_PERMISSIONS` array)
  2. Re-run the seed script to sync the DB

Without both, the permission check might pass from constants but the admin UI grid won't show it (and vice versa).

- Idempotent (uses upsert — safe to re-run).
- Connects directly to MongoDB (no Next.js dependencies).
- Automatically reads `MONGODB_URI` from `.env.local` or the environment variable.

**Usage when switching databases:**
```bash
node scripts/seed.mjs
```

> Note: legacy `src/scripts/seedPermissions.js` was deleted 2026-09-26 (crashed with ReferenceError; superseded by `scripts/seed.mjs`).


---

## Root Configs

### `src/instrumentation.js` — Next.js instrumentation hook (runs once at server boot). Fails fast when required environment variables are missing instead of surfacing errors deep inside request handlers.

- `register()` — Skips non-nodejs runtimes; imports validateEnv from src/config/env with throwOnError, logs feature warnings (AI keys, Stripe, Brevo), rethrows on missing required vars.

### `next.config.mjs` — Next.js configuration.

- `nextConfig (default export)` — Enables the React Compiler (`reactCompiler: true`).

### `postcss.config.mjs` — PostCSS configuration.

- `config (default export)` — Registers the `@tailwindcss/postcss` plugin for Tailwind CSS v4.

### `eslint.config.mjs` — ESLint flat config.

- `default export` — Extends `eslint-config-next` lint rules for the app.

### `jsconfig.json` — JS project config providing the `@/*` → `src/*` path alias.


---

## Repo Root & Static Assets

### `README.md` — Project overview: ATS-Friendly Resume Builder feature summary, tech stack, and getting-started commands (`npm install`, `node scripts/seed.mjs`, `npm run dev`).

- No exported functions — markdown documentation.

### `audit.md` (repo root) — A **pointer stub only**: it links to the canonical `docs/audit.md` (project docs live in `docs/` per AGENTS.md). It holds no findings of its own. (Corrected 2026-09-28 — the doc previously described this file as the newest audit record and claimed `docs/audit.md` was the older copy; the reverse is true: `docs/audit.md` carries the full 2026-09-11 and 2026-09-26 tables.)

- No exported functions — markdown documentation.

### `package.json` — NPM manifest: scripts (`dev`, `build`, `start`, `lint` → eslint, `test` → `vitest run`) and dependencies (next, react, mongoose, stripe, @react-pdf/renderer, unpdf, mammoth, jose, brevo).

- No exported functions — manifest only. Single test entry point: `npm test`. Removed 2026-09-28: the unreferenced devDependencies `@types/formidable` and `baseline-browser-mapping`.

### `package-lock.json` — Locked dependency tree for reproducible installs.

- No exported functions — generated lockfile.

### `.gitignore` — Git ignore rules (node_modules, .next, env files, build output).

- No exported functions — config only.

### `public/pdf.worker.min.js` — Vendored PDF.js worker bundle loaded by `ReactPdfView.js` and `CoverLetterPdfView.js` via `pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js'` for client-side PDF rendering.

- No exported functions — static vendor asset.

### `public/file.svg`, `public/globe.svg`, `public/next.svg`, `public/vercel.svg`, `public/window.svg` — Default Next.js static icons/illustrations.

- No exported functions — static assets.


---

## Automation Archive — purged 2026-09-11, folder no longer exists

The job-automation feature and API-key management UI were archived on 2026-08-21 into the root `automation/` folder and then **fully purged on 2026-09-11** (commit `d957d4a`: "purge archived automation worker"). Nothing under `automation/` remains — the full file/function inventory is preserved in git history (`git show d957d4a --stat`, parent commit `5bde93b`).

**Still live (kept on purpose):** `src/lib/apiKeyAuth.js` (`resolveUserId()` authenticates every active resume / cover-letter / generate / profile route via its JWT path; the Bearer-key and rate-limit functions are dormant but stay to keep the library intact), `src/models/ApiKey.js`, `src/models/DailyCount.js`, and all MongoDB collections (historical data intact). `src/lib/encryption.js` was removed in the purge (its only consumer was platform-session storage). The `GATEKEEPER` key in `src/lib/ai/config.js` is unreferenced. Open worker-related follow-ups (if ever restored) live in `docs/suggestions.md`.


---

## Environment Variables

### Next.js App (`.env.local`, accessed via `src/config/env.js`)

| Variable | Purpose | Referenced in |
|---|---|---|
| `ACCESS_TOKEN_SECRET` | JWT access token signing secret | `src/config/env.js` → auth/utils |
| `REFRESH_TOKEN_SECRET` | JWT refresh token signing secret | `src/config/env.js` → auth/utils |
| `MONGODB_URI` | MongoDB connection string (read lazily inside `dbConnect()` so build works without env) | `src/config/env.js` → `src/lib/mongodb.js`, `scripts/*.mjs` |
| `GEMINI_API_KEY` | Gemini AI provider key | `src/config/env.js` → `src/lib/ai/runners/gemini.js` |
| `DEEPSEEK_API_KEY` | DeepSeek AI provider key | `src/config/env.js` → `src/lib/ai/runners/deepseek.js` |
| `STRIPE_SECRET_KEY` | Stripe SDK key | `src/config/env.js` → `src/lib/stripe.js` |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signature verification | `src/config/env.js` → stripe webhook route |
| `BREVO_API_KEY` | Brevo transactional email API key | `src/config/env.js` → OTP email sending |
| `BREVO_SENDER_EMAIL` | Verified sender address for emails | `src/config/env.js` → OTP email sending |
| `NEXT_PUBLIC_APP_URL` | Public app base URL (default localhost:3000); also the primary CSRF allow-list origin | `src/config/env.js` → OTP magic link, checkout success/cancel URLs, `src/proxy.js` → `src/lib/csrf.js` |
| `ALLOWED_ORIGINS` | Optional comma-separated extra origins allowed to make state-changing API requests (CSRF allow-list). Optional — when unset only `NEXT_PUBLIC_APP_URL` and the request's own origin are allowed. **Fails closed**: an unlisted `Origin` or a cross-site `Sec-Fetch-Site` is refused with 403 | `src/config/env.js` (`env.allowedOrigins`) → `src/proxy.js` → `src/lib/csrf.js` |
| `AI_TASK_<KEY>` | Optional per-task AI override (`provider:model`) | `src/lib/ai/config.js` |

> `NODE_ENV` (`production`/`development`) is also read via `env.isProduction` / `env.isDevelopment` (proxy cookie security, logger verbosity, instrumentation warnings). Required vars (`ACCESS_TOKEN_SECRET`, `REFRESH_TOKEN_SECRET`, `MONGODB_URI`) are enforced at boot by `validateEnv()` in `src/instrumentation.js`; missing AI/Stripe/Brevo keys only produce feature warnings.
