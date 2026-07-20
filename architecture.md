# Architecture Documentation

Auto-generated from all 165 source files.

---

## Root

### `TODO.md` — Consolidated master task list

Single source of truth for all pending work. Organized by priority: 🔴 Critical (security/integrity), 🟠 High (auth, permissions, features), 🟡 Medium (UX, infrastructure, architecture), ⬜ Pending (deploy/future). Supersedes the now-deleted `audit.md`, `suggested_changes.md`, `auth.md`, `a1.md`, `README.md`, `plan.md`.

- Entries sourced from: audit findings, security vulnerabilities, feature requests, nav restructure plan, AI edit improvements, Stripe webhook enhancements, admin dashboard controls, infrastructure improvements.


---

## Users

### `/Users/sukhjot/codes/untitled folder 2/ats-resume-builder-a1/src/app/resume-history/page.js` — Page route displaying the user's resume history, including master resume and all generated tailored resumes, with delete and preview capabilities.

- `ResumeHistoryPage (default export)` — Page component that fetches user profile/mainResume and all generated resumes on mount, renders a ResumeList, and includes a modal overlay for viewing tailored resume content as JSON.

### `/Users/sukhjot/codes/untitled folder 2/ats-resume-builder-a1/src/app/test/page.js` — Test page that displays the master resume rendered via React-PDF for visual comparison/testing.

- `TestPage (default export)` — Page component that fetches the user profile's mainResume content and renders it using a dynamically imported ReactPdfView component.

### `/Users/sukhjot/codes/untitled folder 2/ats-resume-builder-a1/src/components/common/AccessDenied.js` — A simple access denied UI component that shows a restriction message without an upgrade/upsell prompt.

- `AccessDenied (default export)` — Stateless component rendering a centered card with a lock icon (customizable), a title, and a message to inform the user they lack permission.

### `/Users/sukhjot/codes/untitled folder 2/ats-resume-builder-a1/src/components/common/LoadingSpinner.js` — A reusable animated loading spinner component.

- `LoadingSpinner (default export)` — Stateless component rendering a centered spinning circle with a blue border.

### `/Users/sukhjot/codes/untitled folder 2/ats-resume-builder-a1/src/components/common/PermissionGate.js` — A wrapper component that conditionally renders children based on user permissions, with configurable fallback behaviors.

- `PermissionGate (default export)` — Component that checks a user's permission via checkPermission(). If granted, renders children. If denied, renders nothing (hidden fallback), an AccessDenied (simple fallback), or a PremiumFeatureLock (default/compact fallback) with the permission's metadata.

### `/Users/sukhjot/codes/untitled folder 2/ats-resume-builder-a1/src/components/common/PremiumFeatureLock.js` — A reusable UI component that locks premium features behind an upgrade prompt with a Stripe checkout flow.

- `PremiumFeatureLock (default export)` — Component displaying a lock icon, feature name, description, and an upgrade button that initiates a checkout session via /api/checkout/create-session. Supports default (full-size centered) and compact (inline) variants.
- `handleUpgrade` — Internal async function that either calls a custom onUpgrade handler or posts to /api/checkout/create-session and redirects to the Stripe checkout URL.

### `/Users/sukhjot/codes/untitled folder 2/ats-resume-builder-a1/src/components/cover-letter/CoverLetterTemplate.js` — A React-PDF Document template for rendering a cover letter as a PDF document.

- `CoverLetterTemplate (default export)` — React-PDF component that renders a full-page cover letter PDF with sender info, date, recipient info, salutation, body paragraphs, closing, and signature using styled react-pdf primitives (Document, Page, Text, View).

### `/Users/sukhjot/codes/untitled folder 2/ats-resume-builder-a1/src/components/diff/DiffViewer.js` — A text diff viewer component that highlights added and removed lines between two text inputs.

- `DiffViewer (default export)` — Component that accepts originalText and newText props, computes line-level diffs using the 'diff' library, and renders each change with green for additions, red/strikethrough for removals, and normal styling for unchanged lines.

### `/Users/sukhjot/codes/untitled folder 2/ats-resume-builder-a1/src/components/home/JobDescription.js` — A simple textarea component for inputting a job description.

- `JobDescription (default export)` — Stateless component rendering a labeled textarea for pasting a job description, bound via jobDescription/setJobDescription props.

### `/Users/sukhjot/codes/untitled folder 2/ats-resume-builder-a1/src/components/home/JobDescriptionInput.js` — An enhanced job description textarea with a loading skeleton state.

- `JobDescriptionInput (default export)` — Component rendering a labeled textarea for job description input, with an animated pulse skeleton shown while the loading prop is true.

### `/Users/sukhjot/codes/untitled folder 2/ats-resume-builder-a1/src/components/home/SpecialInstructionsInput.js` — Input panel for special instructions and generate button, with permission-gated lock states for free users.

- `SpecialInstructionsInput (default export)` — Component that renders a special instructions textarea and a generate resume button. For users lacking USE_SPECIAL_INSTRUCTIONS permission, the textarea is locked with an overlay badge. For users lacking GENERATE_RESUME permission, the generate button is disabled with an upgrade prompt. Shows skeleton while loading.

### `/Users/sukhjot/codes/untitled folder 2/ats-resume-builder-a1/src/components/home/TemplateSelector.js` — A dropdown component for selecting a resume template, loaded asynchronously from the server.

- `TemplateSelector (default export)` — Component that fetches available templates via the getTemplates server action on mount, renders a select dropdown with loading/error states, and calls setSelectedTemplate on change.

### `/Users/sukhjot/codes/untitled folder 2/ats-resume-builder-a1/src/components/layout/Footer.js` — Application footer with branding, product links, legal links, and copyright.

- `Footer (default export)` — Stateless component rendering a footer with ResumeAI branding, Product links (Features, Templates, Pricing), Legal links (Privacy Policy, Terms of Service), and a dynamic copyright year.

### `/Users/sukhjot/codes/untitled folder 2/ats-resume-builder-a1/src/components/layout/Navbar.js` — Top navigation bar with authentication-aware links, credit badge, role-based navigation items, and mobile menu.

- `Navbar (default export)` — Component that renders a fixed header with ResumeAI logo, desktop nav links (public or authenticated based on auth state), a credit badge showing remaining credits, role/permission-gated navigation items (Dashboard, Automation, Cover Letters, AI Edit, Admin), Profile link, Logout button, and a toggleable mobile hamburger menu.
- `handleLogout` — Internal async function that POSTs to /api/auth/logout, refreshes auth state, and redirects to /login.

### `/Users/sukhjot/codes/untitled folder 2/ats-resume-builder-a1/src/components/preview/CoverLetterDisplayView.js` — An HTML/text view of a cover letter for on-screen display.

- `CoverLetterDisplayView (default export)` — Stateless component that renders a cover letter as styled HTML, showing sender info, date, recipient info, salutation, body paragraphs, closing, and signature.

### `/Users/sukhjot/codes/untitled folder 2/ats-resume-builder-a1/src/components/preview/CoverLetterPdfView.js` — A PDF viewer for cover letters using react-pdf with zoom and download controls.

- `CoverLetterPdfView (default export)` — Component that POSTs coverLetterData to /api/render-pdf-react to generate a PDF blob, then displays it via react-pdf's Document/Page components. Provides zoom in/out controls and a download link. Shows loading state and error state.

### `/Users/sukhjot/codes/untitled folder 2/ats-resume-builder-a1/src/components/preview/CoverLetterPreview.js` — Main cover letter preview component with toggle between text view and PDF view.

- `CoverLetterPreview (default export)` — Component that renders a preview container with a tab toggle (Text View / PDF View), the active view component, and a DownloadCoverLetterPdfButton. Dynamically imports CoverLetterPdfView for client-side only rendering.

### `/Users/sukhjot/codes/untitled folder 2/ats-resume-builder-a1/src/components/preview/DownloadCoverLetterPdfButton.js` — Download button that generates and downloads a cover letter PDF.

- `DownloadCoverLetterPdfButton (default export)` — Component with a handleDownload function that POSTs coverLetterData to /api/render-pdf-react, receives a PDF blob, and triggers a client-side file download named cover-letter.pdf.
- `handleDownload` — Internal async function that fetches the PDF from the API, creates a temporary anchor element, triggers the download, and cleans up.

### `/Users/sukhjot/codes/untitled folder 2/ats-resume-builder-a1/src/components/preview/DownloadReactPdfButton.js` — Download button for resume PDFs with permission-gated lock state for free users.

- `DownloadReactPdfButton (default export)` — Component that checks the DOWNLOAD_PDF permission. If the user lacks permission, renders a disabled button with a lock icon. If permitted, renders an active button that POSTs resumeData and template to /api/render-pdf-react and triggers a download named resume-react.pdf.
- `handleDownload` — Internal async function that checks permission (alerting if denied), fetches the PDF from the API, and triggers a client-side download.

### `/Users/sukhjot/codes/untitled folder 2/ats-resume-builder-a1/src/components/preview/PdfResumeRenderer.js` — A thin wrapper that renders a resume data object through a provided Template component.

- `PdfResumeRenderer (default export)` — Functional component that accepts resumeData and a Template component as props, instantiating the Template with resumeData as its prop.

### `/Users/sukhjot/codes/untitled folder 2/ats-resume-builder-a1/src/components/preview/ReactPdfView.js` — A full-featured PDF viewer for resumes using react-pdf with zoom controls and download.

- `ReactPdfView (default export)` — Component that POSTs resumeData and template to /api/render-pdf-react to generate a PDF blob, then renders it via react-pdf. Supports zoom in/out (25% steps, min 50%), responsive page width based on screen size, and a download button. Handles loading, error, and cleanup states.
- `onLoadSuccess` — Internal callback that sets the numPages state when the PDF document finishes loading.
- `zoomIn` — Internal function that increases the zoom level by 0.25.
- `zoomOut` — Internal function that decreases the zoom level by 0.25, floored at 0.5.

### `/Users/sukhjot/codes/untitled folder 2/ats-resume-builder-a1/src/components/preview/ResumeDisplayView.js` — An HTML/text view of resume data for on-screen display.

- `ResumeDisplayView (default export)` — Stateless component that renders resume data as styled HTML, displaying profile info (name, email, phone, location, website, headline, summary), work experience with responsibilities, education with coursework, skills as tags, and additional info (languages, certifications, awards/activities).

### `/Users/sukhjot/codes/untitled folder 2/ats-resume-builder-a1/src/components/preview/ResumePreview.js` — Main resume preview component with toggle between text view and PDF view.

- `ResumePreview (default export)` — Component that renders a resume preview container with a tab toggle (Text View / PDF View), the active view component, and a DownloadReactPdfButton. Dynamically imports ReactPdfView for client-side only rendering.

### `/Users/sukhjot/codes/untitled folder 2/ats-resume-builder-a1/src/components/preview/TemplateViewer.js` — A combined component that wraps a TemplateSelector and ResumePreview for viewing a resume with different templates.

- `TemplateViewer (default export)` — Component that holds a selectedTemplate state, renders a TemplateSelector for choosing a template, and a ResumePreview below it showing the resume rendered with the selected template.

### `/Users/sukhjot/codes/untitled folder 2/ats-resume-builder-a1/src/components/ResumeList.js` — Displays the master resume card and a grid of all generated/saved resumes with view, edit, and delete actions.

- `ResumeList (default export)` — Component that renders a loading spinner, empty state, master resume card, and a grid of generated resumes. Supports inline editing of resume metadata (name, job title, company) via PATCH API, delete via callback, and view via callback. Uses PermissionGate to conditionally show edit/delete buttons.
- `startEditing` — Internal function that sets the editing state to a specific resume and populates the edit form with its current metadata.
- `cancelEditing` — Internal function that resets the editing state and clears the edit form.
- `saveEditing` — Internal async function that sends a PATCH request to update resume metadata, then triggers onUpdateResume callback on success.


---

## app

### `src/app/actions/adminActions.js` — Server actions for admin operations — user management, analytics, and transaction listing with permission checks.

- `getAllUsers` — Get all users with pagination, search, and role filter support
- `getUserDetails` — Get a specific user's details with populated resume references
- `updateUserCredits` — Update a user's credits value
- `resetUserUsage` — Reset a user's usage/credits back to zero
- `changeUserRole` — Change a user's role
- `toggleUserBan` — Ban or unban a user
- `deleteUser` — Permanently delete a user (prevents self-deletion)
- `getAdminAnalytics` — Get admin analytics including total users, active subscribers, and recent transactions
- `getTransactions` — Get all transactions with pagination

### `src/app/actions/getTemplates.js` — Server action that reads the resume PDF template directory and returns available template names.

- `getTemplates` — Read the pdf-templates directory and return a list of template objects with name and path

### `src/app/actions/profileActions.js` — Server actions for user profile operations — reading/updating profile, uploading main resume, and checking subscription status.

- `updateProfile` — Update user profile data (email, name) from FormData
- `uploadMainResume` — Upload or create a new main resume from parsed resume data
- `getProfile` — Get the authenticated user's profile with main resume data
- `checkSubscriptionStatus` — Check the authenticated user's subscription status and role

### `src/app/actions/resumeActions.js` — Server actions for resume CRUD operations — metadata updates, deletion, listing, and setting main resume.

- `updateResumeMetadata` — Update resume metadata fields like job title and company name
- `deleteResume` — Delete a resume and its metadata, remove from user's generatedResumes array
- `getUserResumes` — Get all resumes for the authenticated user
- `setAsMainResume` — Set a resume as the main resume, archiving the previous main resume

### `src/app/admin/dashboard/page.js` — Admin dashboard page component displaying a user table with role management, reset usage, and delete actions.

- `AdminDashboard` — Default export — renders admin UI with user list table, role change dropdowns, reset usage and delete buttons

### `src/app/ai-edit/page.js` — AI Editor page that lets users select a resume or cover letter, enter AI instructions, and generate AI-powered edits with a live preview.

- `AIEditPage` — Default export — renders AI editor with resume/cover letter toggle, selection dropdowns, instruction textarea, save-as-new checkbox, and preview panel
- `getResumeLabel` — Formats resume display names with priority: `resumeName` > `jobTitle` > `profile.headline` > `profile.name` > fallback, plus master badge and date
- `getCoverLetterLabel` — Formats cover letter display names from `coverLetterName` or `companyName` with date

### `src/app/api-keys/page.js` — API keys management page for creating, viewing, and revoking API keys used by the Automation Worker.

- `ApiKeysPage` — Default export — renders API key management UI with key creation form, key list, and revoke functionality

### `src/app/api/admin/transactions/route.js` — API route to list all transactions with optional user/status filtering and pagination.

- `GET` — Return a paginated list of transactions filtered by userId and/or status

### `src/app/api/admin/users/[id]/credits/route.js` — API route to atomically adjust a user's credit count.

- `POST` — Atomically increment or decrement a user's creditsUsed by a specified amount

### `src/app/api/admin/users/[id]/reset-usage/route.js` — API route to reset a user's usage counter to zero.

- `POST` — Reset a specific user's creditsUsed to 0

### `src/app/api/admin/users/[id]/role/route.js` — API route to change a user's role.

- `PATCH` — Update a user's role to a new numeric value

### `src/app/api/admin/users/[id]/route.js` — API route to permanently delete a user account.

- `DELETE` — Delete a user by ID, with a guard against self-deletion

### `src/app/api/admin/users/route.js` — API route to list all users for the admin panel.

- `GET` — Return all users sorted by creation date, excluding sensitive OTP fields

### `src/app/api/api-keys/[id]/route.js` — API route to revoke a specific API key by ID.

- `DELETE` — Revoke (deactivate) an API key belonging to the authenticated user

### `src/app/api/api-keys/route.js` — API route to list and create API keys.

- `GET` — List all active, non-revoked API keys for the authenticated user
- `POST` — Create a new API key with a given name, returning the plaintext key once

### `src/app/api/auth/check-subscription/route.js` — API route to check a user's subscription status and downgrade if expired.

- `POST` — Check subscription, auto-downgrade if expired, and return current role and subscription status

### `src/app/api/auth/logout/route.js` — API route to log out by clearing auth cookies.

- `POST` — Clear accessToken and refreshToken cookies to log the user out

### `src/app/api/auth/otp/route.js` — API route to generate and email a one-time password for authentication.

- `POST` — Generate a 6-digit OTP, hash it, store on the user record, and send via Brevo email

### `src/app/api/auth/verify-otp/route.js` — API route to verify OTP, authenticate the user, and issue access/refresh tokens.

- `POST` — Verify OTP hash, generate access and refresh tokens, set auth cookies, and return newUser flag

### `src/app/api/auth/verify-token/route.js` — API route to rotate a refresh token and issue new access/refresh tokens.

- `POST` — Accept refresh token, rotate it, and return new access and refresh tokens with userId

### `src/app/api/automation/applications/route.js` — API route to list and create job applications, syncing related job listing status.

- `GET` — List the authenticated user's recent applications with populated job details
- `POST` — Create a new application record and sync the related job listing's status

### `src/app/api/automation/apply-instructions/route.js` — API route to get and save custom apply instructions for the automation worker.

- `GET` — Retrieve the user's saved apply instructions
- `PUT` — Save or update the user's apply instructions with upsert

### `src/app/api/automation/criteria/route.js` — API route to get and save job search criteria used by the automation worker.

- `GET` — Retrieve the user's job search criteria
- `PUT` — Save or update the user's job search criteria with upsert

### `src/app/api/automation/daily-count/route.js` — API route to track daily automation usage counts.

- `GET` — Get today's application count for the authenticated user
- `POST` — Increment today's application count for the authenticated user with upsert

### `src/app/api/automation/gatekeeper-rules/route.js` — API route to get and save gatekeeper rules, redirecting salary/work-mode fields to the consolidated JobCriteria source.

- `GET` — Retrieve the user's gatekeeper rules
- `PUT` — Save/update gatekeeper rules, redirecting salary and work-mode fields to JobCriteria

### `src/app/api/automation/jobs/[id]/apply/route.js` — Forwards a request to the external worker service to trigger an automated job application for a specific job listing.

- `POST` — Requires VIEW_AUTOMATION permission. Looks up the job by ID and userId, then POSTs to the worker's /trigger/apply-job endpoint with the jobId. Returns success or a worker/network error.

### `src/app/api/automation/jobs/[id]/route.js` — Fetches a single job listing with its gatekeeper decision and application, or deletes a job listing and cleanup associated records.

- `GET` — Requires VIEW_AUTOMATION permission. Finds the job by ID and userId; concurrently loads the related GatekeeperDecision and most recent Application. Returns the merged result.
- `DELETE` — Requires VIEW_AUTOMATION permission. Finds and deletes the job by ID and userId, then deletes all associated GatekeeperDecision and Application records.

### `src/app/api/automation/jobs/route.js` — Lists recent job listings with optional filters and attached gatekeeper decisions, or creates/upserts a new job listing.

- `GET` — Requires VIEW_AUTOMATION permission. Queries JobListing with optional status/platform filters, sorted by scrapedAt descending, limited to 50. Attaches the related GatekeeperDecision to each job.
- `POST` — Requires VIEW_AUTOMATION permission. Parses JSON body and upserts a JobListing keyed on userId + platform + externalId, defaulting company to 'Unknown Company' and status to 'pending'.

### `src/app/api/automation/notifications/route.js` — Reads and updates the user's automation notification preferences.

- `GET` — Requires VIEW_AUTOMATION permission. Returns the user's NotificationPrefs document, or a default set if none exists (emailOnApply, emailOnError, emailOnCaptcha, emailOnSchedulerStop all true).
- `PUT` — Requires VIEW_AUTOMATION permission. Accepts JSON body and updates only the allowed boolean fields (emailOnApply, emailOnError, emailOnCaptcha, emailOnSchedulerStop), then upserts the document.

### `src/app/api/automation/scheduler/route.js` — Manages per-user scheduler settings for automation.

- `GET` — Requires MANAGE_SCHEDULER permission. Returns the user's SchedulerSettings document or null.
- `PUT` — Requires MANAGE_SCHEDULER permission. Upserts the user's SchedulerSettings with the entire request body, setting updatedAt to the current date.

### `src/app/api/automation/sessions/route.js` — Manages encrypted platform sessions (LinkedIn/Indeed cookies) for automated job applications.

- `GET` — Requires MANAGE_PLATFORM_SESSIONS permission. Lists all platform sessions for the user. For Bearer-authenticated (worker) calls, includes the encrypted cookies; for web UI calls, omits them.
- `POST` — Requires MANAGE_PLATFORM_SESSIONS permission. Accepts platform and cookies, validates platform is linkedin or indeed, encrypts the cookies, and upserts the session document.
- `DELETE` — Requires MANAGE_PLATFORM_SESSIONS permission. Deletes a platform session for the given platform query parameter.

### `src/app/api/automation/trigger-scrape/route.js` — Triggers a scrape job on the external worker service.

- `POST` — Forwards a POST request to the worker's /trigger/scrape endpoint. Returns the worker's JSON response or a 502 error if the worker is unreachable or returns an error.

### `src/app/api/checkout/create-portal-session/route.js` — Creates a Stripe Billing Portal session so the user can manage their subscription.

- `POST` — Authenticates via access token (header or cookie), finds the user and their Stripe customerId, then creates a Stripe Billing Portal session with return_url pointing to /profile. Returns the portal URL.

### `src/app/api/checkout/create-session/route.js` — Creates a Stripe Checkout Session for a new subscription purchase.

- `POST` — Reads x-user-id from header (set by middleware), looks up the requested planName in PLANS constants, creates a Stripe Checkout Session with subscription mode, and returns the checkout URL. Includes userId and planName in both session and subscription metadata.

### `src/app/api/checkout/verify-session/route.js` — Verifies a completed Stripe Checkout Session and activates the user's subscription.

- `POST` — Accepts a sessionId, retrieves the Stripe session and confirms payment_status is 'paid', verifies the session's userId matches the requesting user, then updates the user to SUBSCRIBER role with subscription details. Creates a Transaction record if one does not already exist for the payment intent.

### `src/app/api/cover-letters/[id]/route.js` — Fetch, update, or delete a single cover letter by ID.

- `GET` — Requires VIEW_COVER_LETTERS permission. Finds a cover letter by ID and userId, returns it or a 404.
- `DELETE` — Requires DELETE_COVER_LETTER permission. Finds and deletes a cover letter by ID and userId.
- `PATCH` — Requires VIEW_COVER_LETTERS permission. Updates the content and/or metadata fields on a cover letter by ID and userId.

### `src/app/api/cover-letters/route.js` — List all cover letters for the user or create a new cover letter.

- `GET` — Requires VIEW_COVER_LETTERS permission. Returns the user's cover letters sorted by createdAt descending, limited to 50.
- `POST` — Requires GENERATE_COVER_LETTER permission. Accepts content and optional metadata, creates a new CoverLetter document for the user, returns it with a 201 status.

### `src/app/api/edit-resume-with-ai/route.js` — Edits a resume or cover letter using AI, with credit tracking, plan-gated features, proper resume naming with incrementing suffixes ("Name" → "Name 1"), and multi-resume support.

- `POST` — Requires EDIT_RESUME_WITH_AI permission and checks credit availability. For type='cover-letter', edits the cover letter content via AI and optionally saves to CoverLetter model. For resume editing: accepts `resumeId` for multi-resume support, edits via AI, deducts a credit. If `createNewResume`, names the source resume with an incrementing suffix ("Name" → "Name 1", "Name 1" → "Name 2") using `resumeName` metadata, gives the new resume the original name, and only sets it as main if editing the master. Sanitizes Mongo _id fields from the AI output before saving.

### `src/app/api/gatekeeper/evaluate/route.js` — Evaluates a job listing against user-defined gatekeeper rules using AI, deciding whether to apply.

- `POST` — Authenticates via API key, applies daily rate limiting. Merges GatekeeperRules (target titles, exclusions, etc.) and JobCriteria (salary, work-mode preferences) into a single ruleset. Calls the AI with a GATEKEEPER system prompt to evaluate the job, with one retry on parse failure. Persists the decision (apply, confidence, reason, flags) to GatekeeperDecision if a jobId is provided.

### `src/app/api/generate-content/route.js` — Generates a tailored resume from a job description using AI.

- `resolveUser` — Internal helper that resolves the user from a Bearer API key (with rate limiting) or from the x-user-id header.
- `sanitizeJobDescription` — Internal helper that strips prompt injection patterns from the job description and truncates to 8000 characters.
- `POST` — Requires GENERATE_RESUME permission. Sanitizes the job description, resolves the user, checks if the user has USE_SPECIAL_INSTRUCTIONS permission, calls generateResume() with resume data and job description, optionally saves the result as a Resume document. Returns the generated content with a resumeId if saved.

### `src/app/api/generate-cover-letter/route.js` — Generates a cover letter from a job description using AI.

- `sanitizeJobDescription` — Internal helper that strips prompt injection patterns from the job description and truncates to 8000 characters.
- `POST` — Requires GENERATE_COVER_LETTER permission. Sanitizes the job description, loads the user's main resume content, calls generateCoverLetter() with resume data and user info (name, email, phone), optionally saves the result as a CoverLetter document. Returns the generated content with a coverLetterId if saved.

### `src/app/api/health/route.js` — Simple health-check endpoint for monitoring.

- `GET` — Returns { status: 'ok', uptime, timestamp } to indicate the server is running.

### `src/app/api/parse-resume/route.js` — Parses an uploaded resume file (e.g. PDF/DOCX) and extracts structured data.

- `POST` — Disables Next.js body parser. Requires PARSE_RESUME permission. Accepts a multipart form upload with field 'resumeFile', passes it to parseResume() service, and returns the parsed JSON data.

### `src/app/api/render-pdf-react/route.js` — Generates a downloadable PDF for a resume or cover letter using React PDF renderer.

- `POST` — Requires DOWNLOAD_PDF permission. For type='cover-letter', generates a cover letter PDF via generateCoverLetterPdf(). Otherwise generates a resume PDF via generatePdf() using the provided resumeData and template. Returns the PDF buffer as an attachment response.

### `src/app/api/resume/templates/route.js` — Returns the list of available resume PDF templates.

- `GET` — Returns an array of { id, name } objects for each available template: Professional, Modern, Classic, Classic 2, Creative, Simple.

### `src/app/api/resumes/[id]/route.js` — Fetch, delete, or update metadata for a single resume by ID.

- `GET` — Requires VIEW_OWN_RESUMES permission. Finds and returns a resume by ID and userId, excluding the version key.
- `DELETE` — Requires DELETE_OWN_RESUME permission. Deletes a resume by ID and userId, removes its ID from the user's generatedResumes array, and deletes the associated ResumeMetadata document.
- `PATCH` — Requires EDIT_RESUME_METADATA permission. Accepts jobTitle, companyName, resumeName and upserts a ResumeMetadata document linked to the resume ID.

### `src/app/api/resumes/master/route.js` — Creates/updates or deletes the user's master (primary) resume.

- `validateContent` — Internal helper that validates resume content against RESUME_FIELD_SCHEMA, checking that required fields exist in object sections and array items. Returns an array of error messages.
- `PUT` — Requires UPLOAD_MAIN_RESUME permission. Validates resume content against the field schema, then either updates the existing master resume or creates a new one and sets it as the user's mainResume. Returns the updated user (populated with resume metadata) and the resume.
- `DELETE` — Requires DELETE_OWN_RESUME permission. Removes the user's mainResume reference and deletes the resume document.

### `src/app/api/resumes/route.js` — Lists the user's generated resumes or creates a new resume.

- `GET` — Requires VIEW_OWN_RESUMES permission. Loads the user with populated generatedResumes (each with populated metadata) and returns the array.
- `POST` — Requires CREATE_RESUME permission. Accepts content and optional metadata, deducts a credit via SubscriptionService.trackUsage(), creates the resume via ResumeService, and adds it to the user's generatedResumes list.

### `src/app/api/user/profile/route.js` — Get and update the authenticated user's profile.

- `GET` — Resolves userId via API key auth or x-user-id header. Requires VIEW_OWN_PROFILE permission. Returns user id, email, name, dateOfBirth, mainResume (populated with metadata), creditsUsed, and role.
- `PUT` — Resolves userId via API key auth or x-user-id header. Requires EDIT_OWN_PROFILE permission. Accepts mainResume (content to create a new resume from), name, and dateOfBirth. Creates a new Resume document if mainResume is provided. Returns the updated profile with populated mainResume.

### `src/app/api/webhooks/stripe/route.js` — Handles incoming Stripe webhook events for subscription lifecycle management.

- `POST` — Verifies the Stripe webhook signature. Handles three event types: checkout.session.completed (upgrades user to SUBSCRIBER role, saves transaction), invoice.payment_succeeded (renews subscription, resets credits, saves renewal transaction), and customer.subscription.deleted (sets subscriptionStatus to canceled, downgrades user to USER role).

### `src/app/automation/applications/page.js` — Displays a list of jobs the Automation Worker has applied to, showing status, platform, submission time, and error details for each application.

- `ApplicationsPage` — Default export. Client component that fetches and renders submitted applications with loading state, empty state, and a list of application cards with status badges.
- `fetchApplications` — Async function that calls GET /api/automation/applications to retrieve application data and updates the apps state.
- `statusBadge` — Returns a Tailwind CSS class string for the color-coded status badge based on application status (submitted, failed, pending).

### `src/app/automation/jobs/[id]/page.js` — Displays full details of a single scraped job, including metadata, description, apply URL, application status, and gatekeeper AI decision. Allows user to apply to the job or delete it.

- `JobDetailPage` — Default export. Client component for viewing a single job's details, with controls to apply, delete, and view gatekeeper reasoning.
- `fetchJob` — Async function that calls GET /api/automation/jobs/:id to retrieve the job data.
- `handleApplyNow` — Async function that calls POST /api/automation/jobs/:id/apply to queue the job for automated applying and displays a success/error message.
- `statusBadge` — Returns Tailwind CSS class string for color-coded status badge based on job status (pending, approved, skipped, applied, failed, review, external_apply).

### `src/app/automation/jobs/page.js` — Lists all scraped jobs with filtering by status and platform, allowing users to browse and delete job listings.

- `JobsPage` — Default export. Client component that fetches and renders scraped job listings with filter controls, loading state, empty state, and inline delete buttons.
- `fetchJobs` — Async function that calls GET /api/automation/jobs with optional query parameters for status and platform filters, updating the jobs state.
- `statusBadge` — Returns Tailwind CSS class string for color-coded status badge based on job status (pending, approved, skipped, applied, failed, review, external_apply).

### `src/app/automation/layout.js` — Provides the navigation layout for the automation section, including a sub-navigation bar with links to Dashboard, Jobs, Applications, and Settings, gated by VIEW_AUTOMATION permission.

- `AutomationLayout` — Default export. Client component wrapping automation pages with a navigation bar, permission gate, and background styling.

### `src/app/automation/page.js` — Main automation dashboard showing system status cards, a manual scrape trigger button, pipeline mode information, quick links to settings, and a how-it-works guide.

- `AutomationDashboard` — Default export. Client component rendering the automation hub with status cards, scrape controls, pipeline mode display, quick start links, and setup instructions.
- `triggerScrape` — Async function that calls POST /api/automation/trigger-scrape to enqueue a new scrape job and displays success or error.

### `src/app/automation/settings/accounts/page.js` — Settings page for managing LinkedIn and Indeed platform accounts by pasting session cookies, which are encrypted before storage.

- `AccountsPage` — Default export. Client component managing LinkedIn and Indeed session cookie configuration with save, remove, and preview functionality.
- `fetchSessions` — Async function that calls GET /api/automation/sessions to retrieve existing platform sessions.
- `handleSave` — Async function that saves session cookies for a given platform via POST /api/automation/sessions.
- `handleRemove` — Async function that removes a platform session via DELETE /api/automation/sessions.
- `copyExample` — Copies an example cookie JSON structure to clipboard for the specified platform.
- `SessionCard` — Renders a platform-specific card with cookie input, instructions, parsed preview toggle, save button, and remove button.

### `src/app/automation/settings/api-keys/page.js` — Settings page for creating, listing, and revoking API keys used by the Automation Worker to authenticate with the application's API.

- `AutomationApiKeysPage` — Default export. Client component for managing API keys with create form, one-time key display, key list, and revoke capability.
- `fetchKeys` — Async callback that calls GET /api/api-keys to retrieve all API keys.
- `handleCreate` — Async function that creates a new API key via POST /api/api-keys and displays the key value once.
- `handleRevoke` — Async function that revokes an API key via DELETE /api/api-keys/:id after confirmation.

### `src/app/automation/settings/apply-instructions/page.js` — Plain English instructions that the AI reads before filling out each job application form, guiding how to answer common questions.

- `ApplyInstructionsPage` — Default export. Client component providing a text editor for writing AI instructions, with save and reset functionality.
- `fetchInstructions` — Async function that calls GET /api/automation/apply-instructions to load existing instructions.
- `handleSubmit` — Async function that saves instructions via PUT /api/automation/apply-instructions.

### `src/app/automation/settings/criteria/page.js` — Settings page for configuring job search criteria including target titles, locations, work modes (remote/hybrid/onsite), salary range, and platforms.

- `CriteriaPage` — Default export. Client component with form for setting job search criteria, fetching/saving via API.
- `fetchCriteria` — Async function that calls GET /api/automation/criteria to load existing search criteria.
- `handleSubmit` — Async function that saves criteria via PUT /api/automation/criteria, converting textarea inputs to arrays.
- `togglePlatform` — Toggles a platform (linkedin/indeed) on/off in the form state.

### `src/app/automation/settings/gatekeeper/page.js` — Settings page for configuring Gatekeeper AI rules that evaluate each job listing and decide whether to apply, skip, or flag for review.

- `GatekeeperPage` — Default export. Client component with form for target titles, exclude companies/keywords, required keywords, seniority levels, and custom plain-English instructions.
- `fetchRules` — Async function that calls GET /api/automation/gatekeeper-rules to load existing gatekeeper rules.
- `handleSubmit` — Async function that saves gatekeeper rules via PUT /api/automation/gatekeeper-rules, converting textarea inputs to arrays.

### `src/app/automation/settings/layout.js` — Provides the sidebar navigation layout for the automation settings section with links to sub-pages (Overview, Accounts, Criteria, Gatekeeper, Scheduler, API Keys).

- `SettingsLayout` — Default export. Client component rendering a sidebar nav and content area for all automation settings sub-pages.

### `src/app/automation/settings/notifications/page.js` — Settings page to configure which automation events trigger email notifications (application submitted, errors, CAPTCHA detected, scheduler stopped).

- `NotificationsPage` — Default export. Client component with toggle switches for each notification event, with save and reset.
- `fetchPrefs` — Async function that calls GET /api/automation/notifications to load notification preferences.
- `handleToggle` — Toggles a single notification preference key in the form state.
- `handleSubmit` — Async function that saves notification preferences via PUT /api/automation/notifications.

### `src/app/automation/settings/page.js` — Settings overview page showing cards linking to each individual settings section (Accounts, Criteria, Gatekeeper, Scheduler, API Keys, Apply Instructions, Notifications).

- `SettingsOverviewPage` — Default export. Client component rendering a grid of link cards to each automation settings sub-page.

### `src/app/automation/settings/scheduler/page.js` — Settings page for the Automation Worker scheduler, controlling enable/disable, pipeline mode, time window, active days, application limits, delay ranges, gatekeeper thresholds, and pause conditions.

- `SchedulerPage` — Default export. Client component with comprehensive form for all scheduler settings, including master toggle, pipeline mode selector, time window inputs, active day buttons, limit inputs, delay inputs, threshold sliders, and pause checkboxes.
- `fetchSettings` — Async function that calls GET /api/automation/scheduler to load scheduler configuration.
- `toggleDay` — Toggles a day of the week on/off in the activeDays form state.
- `handleSubmit` — Async function that saves scheduler settings via PUT /api/automation/scheduler.

### `src/app/checkout/cancel/page.js` — Displays a payment-cancelled confirmation page after a user cancels a Stripe checkout session, with links to view plans or return to dashboard.

- `CheckoutCancel` — Default export. Client component rendering a centered cancellation confirmation card with navigation links.

### `src/app/checkout/success/page.js` — Displays a payment-success confirmation page after a completed Stripe checkout, with a link to the dashboard and auto-redirect after 5 seconds.

- `CheckoutSuccess` — Default export. Client component rendering a success card with a 5-second auto-redirect to the dashboard.

### `src/app/cover-letters/[id]/page.js` — Cover letter detail page for viewing, generating, regenerating, and deleting cover letters. Uses a job description input and AI generation to produce tailored cover letters.

- `CoverLetterDetailPage` — Default export. Client component handling cover letter display and generation with job description input, recipient name, preview via CoverLetterPreview component, and delete functionality.
- `handleGenerate` — Async function that calls POST /api/generate-cover-letter to generate a new cover letter from job description and recipient name, then navigates to the result.
- `handleDelete` — Async function that deletes the cover letter via DELETE /api/cover-letters/:id and redirects to the cover letters list.

### `src/app/cover-letters/page.js` — Lists all saved cover letters with view and delete actions, and a button to create a new cover letter.

- `CoverLettersPage` — Default export. Client component that fetches and renders a list of cover letters with view/delete controls and a create-new link.
- `fetchLetters` — Async function that calls GET /api/cover-letters to retrieve all cover letters.
- `handleDelete` — Async function that deletes a cover letter by ID via DELETE /api/cover-letters/:id and removes it from the local state.

### `src/app/dashboard/page.js` — Main application dashboard providing resume generation from a job description with live preview, resume list, special instructions, and subscription session verification.

- `DashboardPage` — Default export. Client component wrapping DashboardContent in a Suspense boundary.
- `DashboardContent` — Default export (via re-export). Client component with the full dashboard UI: job description input, special instructions, resume generation, live preview, save checkbox, Stripe session verification, and resume list via ResumeList component.
- `handleGenerateResume` — Async callback that calls POST to the generate endpoint with resume content, job description, special instructions, and save flag, then updates the tailored resume preview.

### `src/app/layout.js` — Root layout for the entire application, setting up fonts, global CSS, auth context, navigation bar, and footer.

- `metadata` — Named export. SEO metadata object with title 'ATS-Friendly Resume Builder' and description.
- `RootLayout` — Default export. Server component providing the HTML document structure with Outfit font, AuthProvider context, Navbar, main content area, and Footer.

### `src/app/login/page.js` — Login page with an email-based OTP authentication flow: send a login code to the user's email, then verify the code to redirect to onboarding (new users) or dashboard (existing users).

- `LoginPage` — Default export. Client component with two-stage login form (send OTP then verify OTP), managing loading state, errors, and post-authentication redirect based on newUser flag.
- `handleSendOtp` — Async function that calls POST /api/auth/otp to request a one-time passcode sent to the user's email.
- `handleVerifyOtp` — Async function that calls POST /api/auth/verify-otp to verify the OTP, refetches auth state, and redirects to onboarding (new user) or dashboard (existing user).

### `src/app/onboarding/page.js` — Onboarding page for new users after first login, collecting name and date of birth to complete their profile.

- `OnboardingPage` — Default export. Client component with a profile completion form (name and date of birth) that updates the user profile via PUT /api/user/profile and redirects to dashboard.

### `src/app/page.js` — Landing/home page with a hero section, feature cards, a how-it-works section, and a call-to-action section to drive user signup.

- `Home` — Default export. Client component rendering the marketing landing page with hero, three feature cards (ATS Optimization, AI Content Generation, Real-time Editing), how-it-works steps, and CTA section.

### `src/app/pricing/page.js` — Pricing page displaying Free and Pro subscription plans with feature comparisons and upgrade buttons that trigger Stripe checkout.

- `PricingPage` — Default export. Client component rendering two pricing tiers (Free and Pro) with feature lists, pricing from constants, and an upgrade flow that initiates Stripe checkout via POST /api/checkout/create-session.
- `handleUpgrade` — Async function that POSTs to /api/checkout/create-session with the selected plan name and redirects to the Stripe checkout URL.

### `src/app/profile/page.js` — User profile page with tabs for personal details (name, date of birth, AI resume editing, manual resume form, resume upload/parse) and subscription management (plan info, upgrade, manage billing).

- `ProfilePage` — Default export. Client component managing the full user profile experience with tab navigation (Details/Subscription), profile editing, AI-powered resume editing with natural language queries, manual resume form, file upload with parsing, master resume delete, subscription display, upgrade flow, and billing portal access.
- `handleSubmit` — Async function that saves profile name and date of birth via PUT /api/user/profile.
- `handleFileUpload` — Async function that uploads a resume file to POST /api/parse-resume for AI parsing, then saves the parsed result as the master resume.
- `handleAiEdit` — Async function that sends a natural-language edit query to POST /api/edit-resume-with-ai to modify the master resume content via AI.
- `handleDeleteMasterResume` — Async function that deletes the master resume via DELETE /api/resumes/master.
- `handleUpgrade` — Async function that initiates a Stripe checkout session for the Pro plan.
- `handleManageSubscription` — Async function that opens the Stripe billing portal for subscription management.


---

## components

### `src/components/profile/ManualResumeForm.js` — Multi-section form for manually entering resume data. Driven entirely by RESUME_FIELD_SCHEMA -- add a field there, it appears here. Available to all users (no AI parsing required).

- `FieldInput` — Renders primitive form field inputs based on field type (checkbox, textarea, bullet list, tag list, text/email/url/month)
- `ObjectSection` — Renders an object-type section (profile, additional_info) with a grid of field inputs
- `ArrayItemCard` — Renders a single item card for array sections (work_experience, education, skills) with field inputs and remove button
- `ArraySection` — Wrapper for array-type sections that manages add/update/remove of items
- `ManualResumeForm (default export)` — Main component: multi-section form with sidebar navigation, section content panels, and save-to-API functionality

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

### `src/config/env.js` — Single source of truth for environment variable access. Centralizes all process.env references so renaming a variable only requires a change here.

- `env (default export)` — Object mapping config keys to environment variables for auth secrets, MongoDB URI, AI keys (Gemini), Stripe keys, Brevo email config, app URL, and automation settings


---

## context

### `src/context/AuthContext.js` — React context providing authentication state (loading, isAuthenticated, user) across the app.

- `AuthProvider` — Context provider component that fetches /api/user/profile on mount and exposes loading, isAuthenticated, user state, and a refetch function
- `useAuth` — Hook to consume the AuthContext, returning { loading, isAuthenticated, user, refetch }


---

## hooks

### `src/hooks/useApiClient.js` — Simple fetch wrapper that ensures cookies (HttpOnly tokens) are always sent with requests by using credentials: 'include'. Auth is handled server-side via middleware proxy.

- `useApiClient` — Hook returning an apiClient function that wraps fetch() with credentials: 'include' to send cookies on every request

### `src/hooks/useProfile.js` — Hook to fetch and provide the authenticated user's profile data from the API.

- `useProfile` — Hook returning { profile, loading, refetch } -- fetches profile from API endpoint on mount and provides a refetch function

### `src/hooks/useResumes.js` — Hook providing all resume CRUD operations (list, create, delete) for the current user, with permission checks.

- `useResumes` — Hook returning { resumes, deletingId, fetchResumes, createResume, deleteResume } -- manages resume list state and API interactions with permission gating

### `src/hooks/useWindowWidth.js` — Hook that tracks the browser window width for responsive UI adjustments.

- `useWindowWidth (default export)` — Hook returning { width } -- the current window.innerWidth, updated on window resize events


---

## lib

### `src/lib/accessControl.js` — Permission checking utilities. Centralized access control using role-based permission lists.

- `hasPermission` — Checks if a numeric userRole has a specific permission string against ROLE_PERMISSIONS mapping
- `checkPermission` — Checks if a user object (containing role) has a specific permission -- primary method for app-level checks
- `getPermissionMetadata` — Retrieves metadata (name, description, requiredPlan) for a given permission key from PERMISSION_METADATA

### `src/lib/ai/client.js` — Unified AI client that routes AI calls to the configured provider (Gemini or DeepSeek) for any task, with optional JSON parsing.

- `callAI` — Calls the AI provider configured for a taskKey with a prompt, optionally parses the response as JSON, and returns the result

### `src/lib/ai/config.js` — AI task configuration mapping each task to a provider and model. Supports environment variable overrides per task.

- `AI_TASKS` — Object mapping task keys (RESUME_GENERATION, COVER_LETTER_GENERATION, AI_EDIT, RESUME_PARSING, GATEKEEPER) to { provider, model } -- all currently routed to DeepSeek
- `getEffectiveConfig` — Returns the effective { provider, model } for a task key, checking for environment variable overrides (format: AI_TASK_<KEY>=provider:model) before falling back to AI_TASKS defaults

### `src/lib/ai/runners/deepseek.js` — DeepSeek AI API runner implementing the OpenAI-compatible chat completions endpoint.

- `callDeepSeek` — Calls the DeepSeek API (deepseek.com/v1/chat/completions) with model name and prompt, returns raw response text
- `parseDeepSeekJson` — Parses JSON from DeepSeek response text, stripping markdown code block markers and extracting the last valid JSON object

### `src/lib/ai/runners/gemini.js` — Gemini AI runner using the @google/generative-ai SDK.

- `callGemini` — Calls the Gemini API with model name and prompt using the Google Generative AI SDK, returns response text
- `parseGeminiJson` — Parses JSON from Gemini response text, stripping markdown code block markers and extracting the last valid JSON object

### `src/lib/apiKeyAuth.js` — API key authentication for external API usage. Supports Bearer token validation, dual auth (API key + JWT proxy), rate limiting, and key generation.

- `authenticateRequest` — Validates a Bearer API key from the Authorization header, checks expiration, updates last-used timestamp, and returns the associated user document
- `resolveUserId` — Resolves a userId from either an API key (Bearer token) or the x-user-id header (JWT proxy), supporting both auth methods
- `checkRateLimit` — Checks and increments daily API call count for a user against a configurable limit (default 100), returns 429 error if exceeded
- `generateApiKey` — Generates a new API key with 'rb_' prefix, random 32-byte hex, and returns { plainKey, hashedKey, keyPrefix }

### `src/lib/apiPermissionGuard.js` — Route-level permission guard that retrieves a user by ID and checks if they have a required permission before allowing access.

- `requirePermission` — Fetches a user by ID, checks the required permission via checkPermission, and returns the user object or an error response
- `isPermissionError` — Helper that returns true if a requirePermission result contains an error

### `src/lib/apiResponse.js` — Standardized API response helpers for Next.js route handlers, providing success/error responses and error wrapping.

- `ok` — Returns a success NextResponse.json with the given data and status (default 200)
- `fail` — Returns an error NextResponse.json with { success: false, error: message } and given status (default 400)
- `withErrorHandler` — Higher-order function that wraps a route handler, catching any thrown errors and returning a 500 fail response

### `src/lib/auth-edge.js` — Edge-runtime JWT verification using the jose library. Used in middleware/edge functions for fast token validation without database access.

- `verifyTokenEdge` — Verifies a JWT token (access or refresh) using jose and the appropriate secret key, returns the decoded payload
- `verifyAuthEdge` — Verifies authentication from access/refresh token cookies at the edge; returns { ok, userId, role } on success, or { ok: false } if invalid (cannot rotate at edge)

### `src/lib/auth.js` — Server-side authentication with JWT access/refresh token verification and secure refresh token rotation (supports multi-device — no longer wipes all sessions on single token miss).

- `rotateRefreshToken` — Verifies a refresh token, checks for expiry, rotates it (deletes old, creates new pair), supports multi-device by only failing the rotating device if its token is missing rather than wiping all sessions
- `verifyAuth` — Main auth verification function: tries the access token first; if invalid/expired, attempts refresh token rotation; returns auth result with optional new tokens or cookie-clear signal

### `src/lib/constants.js` — Application-wide constants including role/permission enums, plan definitions, token config, routes, and API endpoints.

- `ROLES` — Enum mapping role names (ADMIN: 0, DEVELOPER: 70, SUBSCRIBER: 99, USER: 100) to numeric levels
- `PERMISSIONS` — Enum of all permission strings for admin/system, AI/content generation, resume management, cover letters, profile/account, subscription/billing, and job automation features
- `ROLE_PERMISSIONS` — Maps each role to its array of granted permissions -- ADMIN has all, DEVELOPER has admin+full features, SUBSCRIBER has full features without admin, USER has basic manual features only
- `PERMISSION_METADATA` — Maps permissions to metadata objects with name, description, and requiredPlan for UI display
- `PLANS` — Defines Free (2 credits/day, $0) and Pro (200 credits/month, $13.99) subscription plans
- `TOKEN_CONFIG` — JWT token configuration: access token expiry (15m), refresh token expiry (15 days), and type identifiers
- `DEFAULTS` — Default values such as credits on signup
- `OTP_CONFIG` — OTP expiry configuration (5 minutes)
- `ROUTES` — Maps route names to URL paths for all app pages (home, login, onboarding, dashboard, profile, pricing, checkout, resume-history, ai-edit, cover-letters, admin, automation, api-keys)
- `API_ENDPOINTS` — Maps API endpoint categories (auth, user, resumes, generate, cover-letters, edit-with-ai, parse-resume, checkout, admin, automation) to their URL paths

### `src/lib/coverLetter-generator.js` — Shared core for cover letter generation via AI. Builds prompts and calls the AI client to produce a cover letter JSON object.

- `generateCoverLetter` — Generates a cover letter by constructing a detailed prompt from the user's resume, job description, and optional recipient/sender info, then calling the AI client.

### `src/lib/coverLetterFields.js` — Source of truth for the cover letter content structure — defines all fields, their types, labels, and required flags.

- `COVER_LETTER_FIELDS` — Constant object mapping each cover letter field key to its type, label, and required flag.
- `buildEmptyCoverLetter` — Returns a blank cover letter content object with empty strings and an empty array for bodyParagraphs.

### `src/lib/dateUtils.js` — Collection of pure date manipulation and comparison utility functions.

- `isSameDay` — Checks if two dates fall on the same calendar day (year, month, date).
- `addDays` — Returns a new Date shifted by the specified number of days.
- `isPast` — Returns true if the given date is before the current time.
- `now` — Returns the current date/time — useful as a mock point in tests.

### `src/lib/encryption.js` — AES-256-GCM encryption and decryption for cookie values, keyed via the COOKIE_ENCRYPTION_KEY environment variable.

- `encrypt` — Encrypts a plaintext string with AES-256-GCM and returns a colon-delimited string of IV + auth tag + ciphertext.
- `decrypt` — Decrypts an encrypted string (IV:tag:ciphertext) back to plaintext using AES-256-GCM.

### `src/lib/logger.js` — Centralized logging service providing structured JSON log output at INFO, WARN, ERROR, and DEBUG levels.

- `logger` — Singleton Logger instance with info(), warn(), error(), and debug() methods that format and output structured JSON log entries.

### `src/lib/mongodb.js` — MongoDB connection manager using Mongoose with a cached singleton pattern to reuse connections across hot reloads.

- `dbConnect (default export)` — Returns a cached Mongoose connection, creating one if none exists. Clears a rejected promise so subsequent calls retry.

### `src/lib/pdf-generator.js` — Shared core for PDF generation — produces PDF blobs for resumes (using named templates) and cover letters.

- `generatePdf` — Dynamically imports a resume template component and PdfResumeRenderer, renders them to a PDF blob, and returns it as a Buffer.
- `generateCoverLetterPdf` — Dynamically imports the cover letter template, renders it to a PDF blob, and returns it as a Buffer.

### `src/lib/promptConfig.js` — Single source of truth for AI prompt strategies — maps user roles to prompt tiers and provides builder functions for each tier.

- `PROMPT_STRATEGIES` — Maps user roles (ADMIN, DEVELOPER, SUBSCRIBER, USER) to template names (premium, standard, basic).
- `PROMPT_TEMPLATES` — Registry of prompt builder functions keyed by template name: basic, standard, premium.
- `buildPromptForRole` — Public API that looks up the prompt strategy for a given user role and invokes the corresponding builder function to produce the final prompt string.

### `src/lib/resume-generator.js` — Shared core for resume generation via AI. Builds a role-appropriate prompt and calls the AI client.

- `generateResume` — Generates a tailored resume by building a prompt via buildPromptForRole and calling the AI client. Returns { resume, metadata }.

### `src/lib/resumeFields.js` — Single source of truth for the resume content structure. Defines every section and field and provides helpers to derive Mongoose schemas, AI prompt schemas, and blank form state.

- `FIELD_TYPES` — Constants for field types: TEXT, EMAIL, URL, MONTH, TEXTAREA, CHECKBOX, BULLET_LIST, TAG_LIST.
- `RESUME_FIELD_SCHEMA` — Master schema definition describing all resume sections (profile, work_experience, education, skills, additional_info) and their fields.
- `buildEmptyResume` — Returns a blank resume content object matching the structure of RESUME_FIELD_SCHEMA.
- `buildEmptyArrayItem` — Returns a blank item object for a given array-type section (e.g. work_experience entry).
- `generateMongooseContentSchema` — Generates a Mongoose Schema definition for the resume content field by mapping field types to Mongoose types.
- `generateAIPromptSchema` — Generates a JSON example string (for AI prompts) derived from the field schema.

### `src/lib/resumeSchema.js` — Auto-derives JSON schema strings for AI prompts from the resume field definitions in resumeFields.js.

- `RESUME_SCHEMA_FOR_PROMPT` — JSON schema string for the resume content object, used in AI prompts.
- `RESUME_WITH_METADATA_SCHEMA_FOR_PROMPT` — JSON schema string wrapping the resume schema with a metadata object (jobTitle, companyName) for content generation responses.

### `src/lib/serverAuth.js` — Server action authentication — the single source of truth for retrieving the authenticated user's ID and role from cookies in server actions.

- `getAuthenticatedUser` — Reads access and refresh tokens from cookies, verifies authentication, and returns { userId, role } or null values on failure.

### `src/lib/stripe.js` — Stripe SDK initialization using the STRIPE_SECRET_KEY environment variable.

- `stripe` — Exported configured Stripe instance with apiVersion 2023-10-16.

### `src/lib/subscriptionChecker.js` — Subscription expiration checking and automatic user downgrade logic.

- `checkAndDowngradeExpiredSubscription` — Checks if a user's subscription has expired and downgrades their role to USER if so.
- `isSubscriptionActive` — Returns true if the user's subscription status is active and the expiration date is in the future.

### `src/lib/utils.js` — Utility functions for SHA-256 hashing and JWT access/refresh token generation and verification.

- `sha256` — Computes a SHA-256 hex digest of the input string.
- `hashToken` — Alias for sha256.
- `generateAccessToken` — Creates and signs a JWT access token containing userId and role, using the configured expiry.
- `generateRefreshToken` — Creates and signs a JWT refresh token containing userId, with a 15-day expiry.
- `verifyToken` — Verifies a JWT token (access or refresh) using the corresponding secret and returns the decoded payload.


---

## models

### `src/models/ApiKey.js` — Mongoose model for API keys associated with users for programmatic access.

- `ApiKey (default export)` — Mongoose model with fields: userId, name, key, keyPrefix, isActive, lastUsedAt, expiresAt, createdAt, revokedAt.

### `src/models/Application.js` — Mongoose model for job application records tracking submissions to various platforms.

- `Application (default export)` — Mongoose model with fields: jobId, userId, resumeId, resumeUrl, submittedAt, status, errorMessage, platform.

### `src/models/ApplyInstructions.js` — Mongoose model for storing a user's custom auto-apply instructions.

- `ApplyInstructions (default export)` — Mongoose model with fields: userId (unique), instructions, updatedAt.

### `src/models/CoverLetter.js` — Mongoose model for saved cover letters with flexible content schema and metadata.

- `CoverLetter (default export)` — Mongoose model with fields: userId, content (flexible sub-schema), metadata (jobTitle, companyName, coverLetterName), createdAt.

### `src/models/DailyCount.js` — Mongoose model for tracking daily per-user usage counts (e.g. AI generation quotas).

- `DailyCount (default export)` — Mongoose model with fields: userId, date, count. Has a unique compound index on (userId, date).

### `src/models/GatekeeperDecision.js` — Mongoose model for storing AI gatekeeper decisions about whether to apply to a job listing.

- `GatekeeperDecision (default export)` — Mongoose model with fields: jobId, apply, confidence, reason, flags, keywordsFound, keywordsMissing, overriddenByUser, overrideDecision, createdAt.

### `src/models/GatekeeperRules.js` — Mongoose model for storing a user's gatekeeper filtering rules (job titles, excludes, keywords, seniority levels, custom instructions).

- `GatekeeperRules (default export)` — Mongoose model with fields: userId (unique), targetTitles, excludeCompanies, excludeKeywords, requiredKeywords, seniorityLevels, excludeSeniorityLevels, customInstructions, updatedAt.

### `src/models/JobCriteria.js` — Mongoose model for user's consolidated job search criteria (titles, locations, work modes, salary range, platforms).

- `JobCriteria (default export)` — Mongoose model with fields: userId (unique), titles, locations, remote, hybrid, onSite, minSalary, maxSalary, platforms, updatedAt.

### `src/models/JobListing.js` — Mongoose model for scraped job listings from external platforms like LinkedIn and Indeed.

- `JobListing (default export)` — Mongoose model with fields: userId, platform, externalId, title, company, location, salary, description, applyUrl, isEasyApply, postedDate, scrapedAt, status.

### `src/models/NotificationPrefs.js` — Mongoose model for user notification preferences (email notifications for apply events, errors, captchas, scheduler stops).

- `NotificationPrefs (default export)` — Mongoose model with fields: userId (unique), emailOnApply, emailOnError, emailOnCaptcha, emailOnSchedulerStop, lastUpdated.

### `src/models/plan.js` — Mongoose model for subscription plans defining name, price, credits, billing interval, and Stripe price ID.

- `default export (Plan model)` — Reuses existing Mongoose model or creates a new 'Plan' model with fields: name, price, currency, credits, interval, stripePriceId.

### `src/models/PlatformSession.js` — Mongoose model for storing encrypted session cookies for job platforms (LinkedIn, Indeed) per user, with a unique compound index on userId+platform.

- `default export (PlatformSession model)` — Reuses existing Mongoose model or creates a new 'PlatformSession' model with fields: userId, platform (linkedin/indeed), cookiesEncrypted, lastRefreshed, isValid, createdAt.

### `src/models/refreshToken.js` — Mongoose model for authentication refresh tokens with a compound index on userId+token and a TTL index on expiresAt for automatic MongoDB document deletion.

- `default export (RefreshToken model)` — Reuses existing Mongoose model or creates a new 'RefreshToken' model with fields: userId, token (hashed), expiresAt, createdAt, userAgent, ip.

### `src/models/resume.js` — Mongoose model for resume documents with dynamic content schema generated from src/lib/resumeFields.js, linked to a User and optional ResumeMetadata.

- `default export (Resume model)` — Reuses existing Mongoose model or creates a new 'Resume' model with fields: userId, content (dynamically generated schema), metadata (ref to ResumeMetadata), createdAt.

### `src/models/resumeMetadata.js` — Mongoose model for lightweight resume metadata (job title, company name, resume name) linked to a User and Resume.

- `default export (ResumeMetadata model)` — Reuses existing Mongoose model or creates a new 'ResumeMetadata' model with fields: userId, resumeId, jobTitle, companyName, resumeName, createdAt.

### `src/models/SchedulerSettings.js` — Mongoose model for per-user job application scheduler configuration, including time windows, daily/weekly limits, delay ranges, gatekeeper thresholds, pipeline mode, and pause-on-error settings.

- `default export (SchedulerSettings model)` — Reuses existing Mongoose model or creates a new 'SchedulerSettings' model with fields: userId, enabled, startHour, endHour, timezone, activeDays, maxPerDay, maxPerWeek, maxPerRun, minDelaySeconds, maxDelaySeconds, gatekeeperThreshold, reviewQueueThreshold, pipelineMode, dailyRateLimit, pauseOnError, pauseOnSessionExpiry, updatedAt.

### `src/models/Transaction.js` — Mongoose model for tracking payment transactions via Stripe, supporting both subscription and one-time payments with status tracking (pending/completed/failed/refunded).

- `default export (Transaction model)` — Reuses existing Mongoose model or creates a new 'Transaction' model with fields: user, stripePaymentId, stripeSubscriptionId, stripeCustomerId, amount (cents), currency, status, planName, type (subscription/one-time), createdAt, metadata.

### `src/models/User.js` — Mongoose model for users storing authentication, subscription, OTP, and resume reference data, with role-based access control.

- `default export (User model)` — Reuses existing Mongoose model or creates a new 'User' model with fields: email, name, dateOfBirth, role (from ROLES constants), creditsUsed, lastCreditResetDate, subscriptionId, customerId, subscriptionExpiresAt, subscriptionStatus, plan, otp, otpExpires, createdAt, mainResume, generatedResumes.


---

## proxy.js

### `src/proxy.js` — Next.js Edge Middleware that handles authentication (JWT verification and token rotation), subscription status checking, route-level access control (admin/protected/public), and cookie management.

- `proxy(req)` — Main middleware handler. Validates authentication via verifyAuthEdge, attempts token rotation using refresh tokens on failure, periodically checks subscription status, enforces role-based routing (redirects unauthenticated users to login, admins-only for /admin, authenticated users away from /login), injects x-user-id header on API requests, and manages cookie setting/clearing for tokens and subscription check timestamps.
- `config` — Next.js middleware matcher configuration specifying which route patterns trigger the proxy: /api/:path*, /dashboard/:path*, /profile/:path*, /onboarding/:path*, /admin/:path*, /login, /resume-history/:path*, /checkout/:path*.


---

## services

### `src/services/aiCoverLetterEditorService.js` — AI-powered cover letter editing service that uses natural language queries to modify an existing cover letter via the AI client.

- `editCoverLetterWithAI(coverLetterContent, query)` — Takes the current cover letter content object and a natural language edit query, constructs a prompt instructing an AI to edit the cover letter while preserving the COVER_LETTER_FIELDS schema, and returns the updated cover letter content via callAI.

### `src/services/aiResumeEditorService.js` — AI-powered resume editing service that uses natural language queries to modify an existing resume via the AI client.

- `editResumeWithAI(resume, query)` — Takes the current resume data object and a natural language edit query, constructs a prompt instructing an AI to edit the resume within the RESUME_SCHEMA_FOR_PROMPT schema, and returns the updated resume data via callAI. Returns original data if the query cannot be fulfilled.

### `src/services/resumeParsingService.js` — Resume file parsing service that extracts text from PDF and DOCX files, then uses AI to parse the text into structured resume data.

- `extractText(fileBuffer, fileType)` — Internal helper that extracts raw text from a file buffer based on MIME type: uses unpdf for PDF and mammoth for DOCX. Throws on unsupported file types.
- `parseResume(file)` — Takes a File object, converts it to a buffer, extracts raw text via extractText, then sends the text to an AI with a structured JSON schema prompt to parse into profile, work_experience, education, skills, and additional_info fields.

### `src/services/resumeService.js` — Centralized CRUD service for all resume-related database operations, handling Resume and ResumeMetadata models with flexible query options.

- `ResumeService.getResumeById(resumeId, options)` — Gets a single resume by ID with configurable population, field selection, lean mode, and throw-on-not-found behavior.
- `ResumeService.getResumeWithMetadata(resumeId, throwOnNotFound)` — Convenience wrapper that gets a resume with its metadata reference populated.
- `ResumeService.getResumesByUserId(userId, options)` — Gets all resumes for a user with metadata population, limit, sort, and lean options.
- `ResumeService.createResume(userId, content, metadata, options)` — Creates a new resume document, optionally creates associated ResumeMetadata, and can return the populated result.
- `ResumeService.updateResumeContent(resumeId, content, returnNew)` — Updates a resume's content field using $set.
- `ResumeService.updateResumeMetadata(metadataId, updates, returnNew)` — Updates a ResumeMetadata document fields.
- `ResumeService.deleteResume(resumeId, options)` — Deletes a resume and optionally its associated metadata document.
- `ResumeService.getResumeContent(resumeId)` — Retrieves just the content field of a resume as a plain JS object.

### `src/services/subscriptionService.js` — Subscription and credit usage management service that tracks per-user daily/weekly credit limits, resets usage for free users, and enforces plan boundaries.

- `SubscriptionService.getLimit(user)` — Determines the credit limit for a user: Infinity for admin/unlimited permission, PRO plan credits for subscribers or users with subscriptionId, FREE plan credits otherwise.
- `SubscriptionService.trackUsage(userId, amount)` — Atomically increments a user's creditsUsed counter only if it would not exceed the limit. Automatically checks/resets daily limits for free users. Returns true on success, false if limit would be exceeded.
- `SubscriptionService.hasCredits(userId, amount)` — Checks whether a user has enough remaining credits for a given operation without deducting. Returns boolean.
- `SubscriptionService.checkAndResetDailyLimits(user)` — Resets a free user's creditsUsed to 0 if the current day differs from lastCreditResetDate. Skips reset for subscriber-role users.
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
- `UserService.setMainResume(userId, resumeId)` — Sets the user's mainResume reference to the given resume ID.
