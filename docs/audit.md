# Site Audit — 2026-08-21

Full-site audit performed after archiving the job-automation feature (`automation/`).
Scope: security/vulnerabilities, broken parts, correctness, code quality, config/deps.
Method: production build + live smoke test + three deep audits (API routes, frontend, infra/config).

---

## Part 1 — Post-Archive Verification (is everything working?)

| Check | Result |
|---|---|
| `npm run build` | ✅ Passes; route manifest contains no `/automation` or `/api-keys` routes |
| `/` (landing) | ✅ 200 |
| `/login`, `/pricing` | ✅ 200 |
| `/dashboard` unauthenticated | ✅ 307 → login (middleware working) |
| `/admin/dashboard` unauthenticated | ✅ 307 |
| `/automation` | ✅ 404 — correctly removed |
| `/api-keys` | ✅ 404 — correctly removed |
| `/api/health` | ❌ **401** — middleware intercepts it (see M1) |
| Stale client fetches to removed endpoints | ✅ None found (only inert constants entries) |
| ESLint | ⚠️ 5 pre-existing errors, 15 warnings — all in files untouched by the archive |

**Verdict: the archive broke nothing.** The only new-ish issue found is that `/api/health` is
unreachable without auth — a monitoring problem worth fixing (M1).

---

## Fix Status (updated 2026-08-21 — same day)

Applied in order of severity:

| Item | Status |
|---|---|
| C1 IDOR (cover letter) | ✅ FIXED — `findOneAndUpdate({ _id, userId })` + ownership pre-check before AI spend |
| H1 unscoped resume ops | ✅ FIXED — `Resume.exists({ _id, userId })` gate on all read/write paths |
| H9 seed requiredPlan drift | ✅ FIXED — 5 permissions corrected to ADMIN, drift-check script reports 0, DB re-seeded |
| H6 broken links (×7) | ✅ FIXED — new `/templates`, `/privacy`, `/terms` pages; Features → `/#features` anchor |
| H5 onboarding auth | ✅ FIXED — uses `useApiClient()` (HttpOnly cookies), removed Bearer/document.cookie hack |
| H3 webhook dup transactions | ✅ FIXED — unique index on `stripePaymentId` + upserts in webhook & verify-session |
| H4 credit race | ✅ FIXED — deduct-first via atomic `trackUsage` + new `refundUsage()` on failure (3 routes) |
| H2 parse-resume DoS | ✅ FIXED — 5MB cap, MIME allowlist, magic-byte verification; dead bodyParser directive removed |
| H7 double-submit Stripe | ✅ FIXED — pending states + disabled buttons on upgrade/portal |
| H8 conditional hook | ✅ FIXED — TAG_LIST input extracted into `TagInputField` component |
| H11 DEEPSEEK key bypass | ✅ FIXED — `deepseekApiKey` added to env.js; deepseek.js/gemini.js use central config |
| M9 AuthContext setState-in-effect | ✅ FIXED — async effect body with cancelled-flag cleanup |
| L13 lint errors (unescaped entities ×3, Footer `<a>` nav) | ✅ FIXED — **lint now 0 errors** (15 warnings remain) |

Remaining open: all other Medium/Low items and Suggestions.

---

## Part 2 — 🔴 Critical

### C1 — Cross-user cover-letter overwrite (IDOR)
`src/app/api/edit-resume-with-ai/route.js:63` — `CoverLetter.findByIdAndUpdate(coverLetterId)`
has **no userId filter**. Any authenticated user can overwrite anyone's cover letter by ID.
**Fix:** `findOneAndUpdate({ _id: coverLetterId, userId }, ...)`.

---

## Part 3 — 🟠 High

### H1 — Unscoped resume reads/writes in AI-edit path
`edit-resume-with-ai/route.js:113,121,133,162` + `resumeService.js:196` — resume operations not
scoped by userId; `addGeneratedResume` can attach a victim's resume to an attacker's list.
**Fix:** verify `{ _id, userId }` ownership before every operation (contrast: `resumes/[id]` does this correctly).

### H2 — parse-resume DoS
`parse-resume/route.js:25-32` — no file-size cap, MIME trusted from client, whole file buffered in
memory. Dead Pages-Router directive `bodyParser = false` at :10 (formidable isn't even used).
**Fix:** cap ~5MB, verify PDF/DOCX magic bytes, return 413/415.

### H3 — Stripe webhook creates duplicate transactions
`webhooks/stripe/route.js:77-91` — unconditional `Transaction.create`; retries create duplicate rows;
no unique index on `stripePaymentId` (`Transaction.js:9-12`); races verify-session's dedupe (:55).
**Fix:** unique index + upsert on `stripePaymentId`.

### H4 — Credit deduction race (TOCTOU) → free usage
check→generate→deduct ordering in `generate-content` (:46→93), `generate-cover-letter` (:45→64),
`edit-resume-with-ai` (:41→102/:56). Concurrent requests overshoot limits; failed post-generation
deduction only logs a warning. **Fix:** deduct first atomically, refund on failure (pattern already
exists in `resumes/route.js:65`).

### H5 — Onboarding page auth flow likely broken end-to-end
`onboarding/page.js:21-33` — reads `document.cookie` for accessToken (HttpOnly cookies make this
always fail) and sends an `Authorization: Bearer` header that `resolveUserId()` interprets as an
API key, not JWT. New users can get stuck at onboarding. **Fix:** use `useApiClient()` like every other page.

### H6 — Seven broken navigation links
Non-existent routes linked from UI: Footer `/features` :18, `/templates` :19, `/privacy` :27,
`/terms` :28; landing hero "View Templates" `page.js:36`; Navbar desktop :49 + mobile :156.
**Fix:** build the pages or repoint links to existing sections.

### H7 — Double-submit on Stripe actions
`profile/page.js:203-241` — upgrade/manage-subscription buttons have no pending/disabled state;
rapid clicks open multiple checkout sessions; also raw `fetch` instead of apiClient.

### H8 — Conditional React Hook
`ManualResumeForm.js:125` — `useState("")` in TAG_LIST branch sits after early returns
(rules-of-hooks violation; also the lint error). **Fix:** extract a TagInput child component.

### H9 — Seed script writes wrong permission tiers
`scripts/seed.mjs:53-60` seeds 5 admin permissions (`manage_users`, `change_user_role`,
`manage_credits`, `unlimited_credits`, `delete_user`) as requiredPlan **DEVELOPER**, but
`constants.js:310-334` says ADMIN. The seed metadata is a hand-copied inline duplicate — the real
dual-source risk. **Fix:** derive seed data from constants programmatically; re-seed DB after.

### H10 — Live secrets sitting in archive folder
`automation/worker/.env` exists on disk with real credentials (gitignored, never committed — safe
from git). **Fix:** rotate any shared secrets (Brevo/DeepSeek/Resend/Mongo), then delete the file.

### H11 — DEEPSEEK_API_KEY bypasses env.js central access
`src/lib/ai/runners/deepseek.js:8` reads `process.env.DEEPSEEK_API_KEY` directly; absent from
env.js and from the architecture doc's env table. Same pattern (lesser) in `gemini.js:7` and
`encryption.js:10`. **Fix:** route through `@/config/env`.

---

## Part 4 — 🟡 Medium

| # | Finding | Where | Fix |
|---|---|---|---|
| M1 | `/api/health` blocked by middleware matcher `/api/:path*` → 401 for monitors | `proxy.js:146-156` | Exempt health path in matcher/handler |
| M2 | check-subscription trusts client `x-user-id` header under public `/api/auth` → read anyone's role/status | `check-subscription/route.js:10`, `apiKeyAuth.js:73-77` | Authenticate via JWT cookie |
| M3 | Sync constants-only `checkPermission()` mixed into DB-backed routes — admin revocations ignored there | `user/profile:30,61`, `edit-resume-with-ai:77`, `subscriptionService.getLimit:15` | Standardize on `requirePermission`/`checkPermissionDB` |
| M4 | Unbounded client JSON straight into AI/PDF engines | `generate-content:33,66`, `edit-resume-with-ai:27-31`, `render-pdf-react:20,42` | Shared body-size/schema guard |
| M5 | Client-controlled template id interpolated into dynamic import, no allowlist → generic 500s | `render-pdf-react:42` → `pdf-generator.js:18-20` | Allowlist against TEMPLATES list |
| M6 | Missing Stripe lifecycle events: `invoice.payment_failed` (no dunning/downgrade), `customer.subscription.updated` (plan changes ignored), `checkout.session.expired`; expiry hardcoded +1 month ignoring interval; immediate downgrade at cancel despite paid period | `webhooks/stripe:44-46,107-108,145`, `verify-session:42-43` | Handle events; derive expiry from Stripe subscription object |
| M7 | Admin credit adjustment accepts NaN/negatives; large negative `$inc` makes credits permanently negative = unlimited free credits | `admin/users/[id]/credits:18-27` | Bounded integer validation, clamp ≥0 |
| M8 | Data exposure: verify-session returns entire User doc incl. `otp`/`otpExpires`/`customerId`; admin users list uses fragile deny-list select | `verify-session:75`, `admin/users:20` | Whitelist-select fields (pattern at `user/profile:34-42`) |
| M9 | AuthContext setState-in-effect, no abort/cleanup guard | `AuthContext.js:31-33` | cancelled flag / AbortController |
| M10 | `saveResume` stale closure — "Save this resume" checkbox silently ignored | `dashboard/page.js:96` (dep missing; read :77) | Add to useCallback deps |
| M11 | Prop mutation: `resumes.sort(...)` sorts caller's state array in place | `ResumeList.js:124` | `[...resumes].sort(...)` |
| M12 | Navbar duplicates profile fetch into local state; stale user after logout; no cleanup/error handling | `Navbar.js:26-35` | Use `auth.user` from context |
| M13 | Delete without checking `res.ok` — letter vanishes from UI even if server failed; broader silent-failure pattern (console-only) in resume-history, both download buttons, dashboard stripe verify | `cover-letters/page.js:37-38`, `resume-history:27,30,46,71-74`, `DownloadReactPdfButton:47,50`, `DownloadCoverLetterPdfButton:31,34`, `dashboard:48-49` | Surface errors inline (pattern at dashboard:146-153) |
| M14 | Dead components with zero importers: `home/JobDescription.js`, `diff/DiffViewer.js` (latter is sole user of `diff` dep) | src/components | Remove (or wire DiffViewer into AI-edit preview) |
| M15 | Accessibility: unlabeled icon-only controls — Navbar hamburger, modal close X (no role=dialog/Esc/focus-trap), PDF zoom/download buttons ×2 viewers, ResumeList pencil | `Navbar:120-127`, `resume-history:106-113`, `ReactPdfView:105-118`, `CoverLetterPdfView:89-98`, `ResumeList:142-150` | aria-labels; dialog semantics on modal |
| M16 | Hardcoded `$13.99/mo` upgrade label desyncs from PLANS constant & Stripe; `'PRO'` string literals; raw `role === 99` compares; magic default template string | `profile:415,211,197,30`, `pricing:104`, `TemplateViewer:9` | Use PLANS/ROLES constants |
| M17 | Unused root dependencies post-archive: `jsonwebtoken`, `jspdf`, `html-to-image`, `formidable`, `playwright-extra`, `puppeteer-extra-plugin-stealth` (0 imports in src/) | package.json:16-25 | Remove; worker has its own manifest |
| M18 | `@heroicons/react` in devDependencies but imported by shipped client components | package.json:33; `ReactPdfView:12`, `CoverLetterPdfView:11` | Move to dependencies |

---

## Part 5 — ⬜ Low / Info

1. Admin role-change accepts any number incl. NaN and self-demotion; no ROLES enum validation — `admin/users/[id]/role:18-22`.
2. User deletion orphans resumes/cover letters/tokens and leaves an active Stripe subscription billing — `admin/users/[id]:21`.
3. Master-resume DELETE leaves orphaned ResumeMetadata + generatedResumes ref — `resumes/master:125-127`.
4. user/profile PUT: no try/catch on `req.json()` (500 vs 400), no field format checks, mainResume saved unvalidated — `user/profile:51-76`.
5. Mixed `ok()`/`success()` envelopes within same resources — `cover-letters/*` routes.
6. Webhook + render-pdf are the only handlers without `withErrorHandler`; webhook leaks `err.message` (:25) and console.logs payloads throughout.
7. Internal error messages returned to clients — `generate-content:102`, `generate-cover-letter:89`.
8. OTP brute force: unlimited guesses on verify-otp (`:27`), no send-rate limit on otp route.
9. `subscriptionService` reset paths use read-modify-save that can clobber concurrent atomic `$inc`s — `:111-116,124-136`.
10. Empty useEffects (`login:19-22`, `profile:196-201`); missing effect deps in ai-edit (`:37-41`); misleading dead-end loader when ai-edit access check fails (`:213-219`).
11. Index keys on removable lists cause input misalignment when deleting middle items — `ManualResumeForm:296-298,140-142`.
12. Pre-existing lint errors: pricing :80,:112 and checkout/cancel :20 unescaped entities; ManualResumeForm hooks error; AuthContext setState error.
13. Dev/test leftovers shipped: `/test` page (hardcoded Classic template, :72), empty dirs `src/app/pdf-maker/`, `src/app/api/profile/`, ten console.logs in login page, unused imports across ~8 files, unused `downloading` state in ResumePreview.
14. Pricing Free button always reads "Current Plan" regardless of viewer role — `pricing:72-77`; cover-letter delete double-submit risk — `cover-letters/[id]:157-162`.
15. Navbar computes remaining credits client-side duplicating server billing logic — `Navbar:64`. Suggest API-supplied `creditsRemaining`.
16. `eslint-config-next` 16.0.1 vs next 16.0.7 patch drift; suspicious direct pin of transitive `baseline-browser-mapping`.
17. No root README.md.
18. Architecture-doc accuracy: permission counts corrected during audit (36/34 → actual 38/38); seed "uses data from constants.js" claim was false (hand-copied duplicate — see H9).

---

## Part 6 — 💡 Suggestions

- Build `/privacy` and `/terms` pages before public launch (legal necessity), and either build `/features` + `/templates` pages or repoint those links to existing sections.
- Add `creditsRemaining` to the profile API response instead of client-side arithmetic.
- Wire DiffViewer into the AI-edit preview (nice UX win) or delete it plus the `diff` dependency.
- Create a shared request-body validation helper (size cap + schema) for AI/PDF routes.
- Pick one response envelope per resource and document it in architecture.md.
- Extend `scripts/seed.mjs` (or a migration) to also create the unique index on `Transaction.stripePaymentId`.
- Generate seed permission metadata from `constants.js` programmatically to kill the dual-source drift permanently.
- Gate `/test` behind an env flag or remove it.
- Add rate limiting to OTP endpoints (attempt counter + resend cooldown).
- After rotating secrets (H10), delete `automation/worker/.env`.
- Consider a root README.md (setup, env vars table pointer, scripts).

---

## Part 7 — ✅ Done Well

1. **Stripe webhook signature verification is correct** — raw body read via `req.text()` *before* parsing, validated against secret first (`webhooks/stripe/route.js:11-21`).
2. **Atomic credit deduction core** — conditional `findOneAndUpdate({ creditsUsed: { $lte: limit - amount } }, { $inc })` is the right primitive (`subscriptionService.js:50-57`); issues are only in surrounding orchestration (H4).
3. **IDOR-safe CRUD is the norm** — resumes and cover letters consistently scope `{ _id, userId }`; the AI-edit route (C1/H1) is the exception that proves the rule.
4. **Solid credential hygiene** — OTPs hashed (SHA-256) and wiped after use; refresh tokens stored hashed; httpOnly+secure cookies; no password field anywhere (OTP-only auth).
5. **Defense-in-depth admin gating** — role check at proxy AND `requirePermission` inside every admin route; DB-first permissions with graceful constants fallback.
6. **Prompt-injection sanitization** on job descriptions + truncation, enforced server-side, not just hidden in UI.
7. Peer-dependency compatibility verified clean (react 19 / next 16 / react-pdf stacks); `.gitignore` covers `.env*` at any depth including the archive.

---

## Recommended fix order

1. **C1 + H1** — scope edit-resume-with-ai by userId (exploitable today by any logged-in user)
2. **H9** — fix seed requiredPlan drift, then re-run seed
3. **H6** — fix the seven dead links (most visible to users)
4. **H5** — repair onboarding auth flow (blocks new-user activation)
5. **H3 + M6(Stripe)** — transaction idempotency index + lifecycle events before real money flows
6. **H2, H4, H7** — upload caps, deduct-first credits, double-submit guards
7. Then work through Medium table top-down; Low items opportunistically.
