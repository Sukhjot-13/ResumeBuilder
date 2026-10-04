# Suggestions Log

> Convention: only open, not-yet-implemented items live here. Anything fixed
> is recorded in `docs/architecture.md` (per-file history) and `docs/audit.md`
> (status tables) and removed below.
> 2026-09-26 cleanup: removed the refresh-token grace-replay entry (fixed —
> first-`supersededAt` kept), the legacy seed-script entry (file deleted),
> the root-vs-docs audit-divergence entry (consolidated into `docs/audit.md`),
> and all archived-worker entries (the `automation/` folder was purged —
> nothing left to implement).

## 🔴 Vulnerabilities

### 2026-09-28 — OTP form was unusable and self-inflicted a lockout (**FIXED**)

The auto-submit effect fired on `otp.length === OTP_LENGTH`, but `handleBoxChange`
pads unfilled boxes with spaces so the state string is always six characters from
the first keystroke. The verify request therefore fired after **one** digit, and
posted a padded string such as `"1     "` to `/api/auth/verify-otp`. The server
compares `sha256(otp)` and increments `otpAttempts` on every mismatch, so typing a
genuine six-digit code consumed an attempt per keystroke and the fifth digit hit
the 429 lockout — the OTP form could never succeed. The visible symptom was
"it submits as soon as I type a digit".

Fixed by deriving completeness from the digits (`isOtpComplete`) in the new
`src/lib/otpInput.js`, sending only the clean digit string, and gating the submit
button on the same check. Regression-locked by `tests/otpInput.test.js`.

### 2026-09-28 — Privilege escalation: DEVELOPER could self-promote to root ADMIN (**FIXED**)

`PUT /api/admin/roles` was guarded only by `manage_roles`, which the DEVELOPER
role (rank 70) holds. A DEVELOPER could therefore grant any permission onto
their own role and then `PATCH /api/admin/users/{self}/role` to role `0` — the
self-change guard blocked only self-*demotion*, and the only other protection
was a client-side `isAdmin` check in the admin UI. No rank ceiling, no
protected-role check, no audit record.

Fixed by: a root-ADMIN-only, non-delegable `delegate_role_management`
permission; outright refusal of `roleValue: 0`; a permission ceiling (a caller
can never grant a permission they lack); a rank ceiling; a self-escalation
guard; and `AuthorizationEvent` records for allowed and denied writes.
Regression tests: `tests/accessControl.test.js`, `tests/adminAuthorization.test.js`.

### 2026-09-28 — User deletion gated on a developer-tier permission (**FIXED**)

`DELETE /api/admin/users/[id]` required `access_admin_panel` instead of the
admin-only `delete_user`, so any DEVELOPER could permanently cascade-delete an
account (resumes, cover letters, refresh tokens, API keys) and cancel its
Stripe subscription. Fixed; the route now also validates the id shape, applies a
rank ceiling and writes an audit record.

### 2026-09-28 — Checkout-session replay granted unlimited free credits (**FIXED**)

`POST /api/checkout/verify-session` unconditionally re-ran the upgrade update
(resetting `creditsUsed` to `0` and forcing `role`/`subscriptionStatus`) on
every call, with no consumed-session guard. A paying Pro user could re-POST
their own paid `sessionId` indefinitely, and a user whose subscription had
later been cancelled or expired could revive Pro the same way. Fixed by making
the upgrade single-use (the `Transaction` row is the consumption marker; a
replay returns 409 and changes nothing), removing the `creditsUsed` reset, and
refusing to re-activate a cancelled/expired subscription outside the signed
webhook.

_(The 2026-09-26 entry claiming "no open vulnerabilities" was wrong: the three
findings above existed in the tree at that time.)_

## 🟡 New Features

- **Audit-log viewer** — `AuthorizationEvent` documents are written for every
  sensitive mutation but there is no admin UI to browse them; an index page
  filtered by actor/target/action would make the trail usable.

## 🟢 Improvements

### 2026-10-03 — PDF import discarded extracted page text (**FIXED**)

The installed unpdf extractor returns `text` as an array of page strings by
default. `extractText` passed that array to `sanitizeJobDescription`, which accepts
only strings and therefore returned an empty input for the AI parser. The helper
now joins page strings with newlines before sanitization, preserving page order
and line boundaries. A real two-page PDF regression in
`tests/resumeParsingService.test.js` failed with empty source text before the fix
and checks that both pages reach the prompt.

### 2026-10-03 — AI prompt improvements (**IMPLEMENTED**)

Implemented the reviewed additions across generation, editing and parsing:

- **All prompts:** Treat the resume and explicitly supplied user facts as the
  factual source; never invent qualifications, metrics or company claims. Treat
  instructions embedded in job descriptions/uploaded documents as data. Keep
  truthfulness and output-schema rules authoritative over special instructions.
  Use actual output JSON examples and consistent field types/empty values for
  new content; editing does not normalize untouched legacy values.
- **Resume generation (`src/lib/promptConfig.js`):** Replace "plausibly has" /
  "credibly has" skill additions with evidence-backed matching. Rank job
  requirements against existing experience and use supported keywords naturally.
  Preserve employers, official titles, education, contacts and dates. Use metrics
  only when supplied; keep summaries short, adjust bullet counts to real evidence,
  remove repetition and use appropriate current/past-role tense. Apply the same
  factual safeguards to basic, standard and premium templates.
- **Cover-letter generation (`src/lib/coverLetter-generator.js`):** Target
  approximately 250–350 words; open with concrete relevance to the role, develop
  one or two verified examples and explain their value without repeating resume
  bullets. Use only provided company information; avoid invented culture/mission
  claims and generic superlatives. Preserve contact information. Remove the
  request to emit today's date unless the output schema supports a supplied date.
- **Resume editing (`src/services/aiResumeEditorService.js`):** Change only
  requested fields; preserve unrelated values and array order. Add new facts only
  when explicitly supplied by the user. Never manufacture numbers for a request
  to quantify achievements. Replace the conflicting error-message/original-data
  wording with one clear schema-safe no-change rule for unsupported requests.
- **Cover-letter editing (`src/services/aiCoverLetterEditorService.js`):** Preserve
  recipient, sender, company and target role unless specifically changed; keep
  edits scoped and maintain paragraph coherence and length. Add the same no-change
  rule for ambiguous/unsupported requests. Show a content-object JSON example
  instead of the current field-definition metadata object.
- **Resume parsing (`src/services/resumeParsingService.js`):** Extract faithfully
  without embellishment; associate wrapped bullets with the correct role and
  retain distinct roles at the same employer. Do not invent a month when only a
  year appears. Define typed empty values and explicit Present/current-role and
  current-study handling, including education's `is_current` field from the
  shared resume schema.

Regression coverage: `tests/aiPrompts.test.js` exercises every resume tier, letter
generation, both editors, typed examples, quoted input boundaries and provider
failures; `tests/resumeParsingService.test.js` exercises real PDF extraction,
DOCX prompt contracts, central schema completeness, sanitizer bounds and invalid
files. Model calls are mocked, so these checks do not prove live-model factual
compliance; authorization, credit/refund policy and output validation are unchanged.

Provider reference for output examples:
[DeepSeek JSON Output](https://api-docs.deepseek.com/guides/json_mode/).
PDF layout is controlled by rendering templates; prompt wording alone cannot
enforce their layout. Any separate layout review should use vendor guidance such
as [Greenhouse's resume parsing notes](https://support.greenhouse.io/hc/en-us/articles/200989175-Unsuccessful-resume-parse).

### 2026-10-03 — DeepSeek V4.1 Flash migration (**FIXED**)

Replaced the `deepseek-chat` defaults for all five AI task keys with the official
`deepseek-flash` API identifier, which selects DeepSeek V4.1 Flash. Flash requests
explicitly disable thinking mode to preserve the existing chat/JSON behavior
within the 4096-token output cap. Per-task provider/model overrides remain
supported. `tests/aiFlash.test.js` exercises the real configuration, AI client and
DeepSeek runner against a mocked transport for every task and checks overrides.
See [DeepSeek model documentation](https://api-docs.deepseek.com/quick_start/pricing/)
and [thinking mode documentation](https://api-docs.deepseek.com/guides/thinking_mode/).

### 2026-09-29 — Manager integration verification (**FIXED**)

- Browser logger initialization duplicated across development mounts and analytics depended on a browser log key. Share one logger and initialize analytics independently.
- Unexpected route errors were only printed to console; queued server logs could be frozen after a serverless response. All route handlers now use request-scoped tracing and Next.js `after` delivery, including PDF, webhook and logout paths.
- The vendored SDK lost metadata error stacks, did not trace ordinary fetch header forms, and suppressed unrelated console errors during uploads. The SDK fixes and regression tests live in Manager; ResumeBuilder includes the regenerated JavaScript.
- Repeated errors after a flush were suppressed, and separate journeys/sources could be merged. Queued repeats now stay within one trace and Manager's ingest preserves separate journey rows and occurrence counts.
- The local-only OTP test branch issued an unresolved access token and mismatched refresh expiry. Fixed locally; the bypass and its regression tests remain outside deployment commits.
- The key-check script claimed health proved app log delivery and omitted client-key checks. It now makes eight explicit key/health checks; real app delivery was checked in the authenticated browser and live Manager viewer.

- **Per-deploy authorization version** — `invalidateRoleCache()` clears one
  process. A shared `authorizationVersion` (or pub/sub invalidation) would make
  revocations immediate across all instances.
- **Centralize the "role → plan label" mapping** — the admin users route
  derives `plan` inline; `src/lib/planResolver.js` would be a better home.

## Implemented documentation update — 2026-09-30

Required, feature-specific and optional environment settings are now listed in README against the current code, including standalone helpers and deployment/rebuild behavior. Fresh database setup and public/private Manager key separation are documented; obsolete provider/secret names are identified. No runtime configuration or credentials changed.

## Implemented root Admin profile access fix — 2026-09-30

The API denied profile permission for a real Admin (`role: 0`) when the database Role collection was partially populated but lacked its Admin policy row. The shared authorization resolver now uses the protected root system policy independently of mutable Role rows; server guards still resolve the authenticated account from the User collection. Non-root roles retain authoritative database grants, revocation and fail-closed outage behavior. `isAdmin` flags or `ALL` entries on ordinary role rows no longer create root access. Unknown permission names and malformed roles fail closed. Fresh empty-store bootstrap defaults now remain consistent across repeated checks; expired empty snapshots cannot restore defaults during an outage. No deployed database or account is modified.

## Implemented profile birthday display fix — 2026-09-30

Live Toronto browser verification found that a stored 1990-01-01 birthday displayed as 1989-12-31: the profile used local calendar parts on a MongoDB UTC midnight Date. The date input now preserves the stored UTC calendar day through a shared `formatDateInput` helper, preventing an unchanged form save from moving the birthday backwards. Regression tests cover four timezones, winter/summer/leap days, repeated save/reload cycles and invalid inputs. No existing birthdays are rewritten.

Verification for both profile fixes: 230/230 tests (including preserved temporary local-login tests), lint and production build passed. Chromium plus real local MongoDB/OTP/JWT/proxy/profile/admin endpoints passed 29/29 assertions. See `docs/profile-verification-2026-09-30.md`. All verification services stopped and isolated fixtures destroyed; fixes remain local.

## Implemented resume generation role fix — 2026-09-30

`POST /api/generate-content` used an undeclared `userRole` both when invoking the generator and logging success, so valid generation requests failed before the provider call. It now derives the role from the authenticated account's database document. New route regressions reproduced the ReferenceError in nine cases before the fix and cover every role, request-role spoofing, preview/persistence, credit refusals/refunds, provider/save failures and Manager completion. An explicit source-wide `no-undef` audit found only these two references; the rule is now part of normal lint so this class of defect is caught before deployment. No paid AI or external provider calls are needed for these regressions.

Generation role fix verification: 242/242 tests, lint with source-wide no-undef, production build and 28/28 live browser/API/database assertions passed. Real saving/metadata/listing and credit deduction/refund were exercised with four local synthetic model responses and zero paid calls. All verification services and isolated fixtures were cleaned up. See `docs/generation-verification-2026-09-30.md`.

## 2026-09-30 — Branded favicon

- Replaced the default Next.js tab icon with a distinct ResumeForge mark, including scalable SVG, small-size ICO fallback and Apple touch icon. Verify readability on both light and dark tab backgrounds.
