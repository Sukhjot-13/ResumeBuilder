# Site Audit — Open Items

**Last updated:** 2026-08-21
All Critical and High findings from the 2026-08-21 audit have been **fixed**, along with every
Medium/Low item except those listed below. The full original findings (with file:line references)
are preserved in git history (`docs/audit.md` at commit `4a5b2a3`).

---

## 🔴 Action Required (manual)

### 1. Rotate archived worker secrets, then delete the file
`automation/worker/.env` still contains real credentials on disk (gitignored — never committed).
Rotate any secrets that are shared with production (Brevo, DeepSeek, Resend, MongoDB), then delete
the file. The worker is inert; nothing needs them until automation is restored.

---

## 🟡 Accepted As-Is (documented, not bugs)

1. **3 exhaustive-deps lint warnings remain** (`cover-letters/page.js`, `ai-edit/page.js`,
   `admin/dashboard/page.js`) — fetch-on-mount patterns where adding the dependency would refetch
   loops; intentional. Lint otherwise runs at **0 errors**.
2. **Mixed response envelopes kept deliberately** — list/detail GETs return unwrapped data (`ok()`),
   mutations use `{ success, data }` (`success()`). Convention documented in
   `docs/architecture.md` → `apiResponse.js`.
3. **Index keys on bullet-list inputs** in ManualResumeForm — cosmetic input-state quirk when
   deleting middle items; tag lists already use composite keys.
4. **Next.js upgraded 16.0.7 → 16.3.2** to clear all high-severity npm advisories (production audit:
   **0 vulnerabilities**). Worth a staging regression pass before deploy.

---

## ✅ Completed This Round (summary)

- IDOR fixes in edit-resume-with-ai (C1/H1) · deduct-first credits + refundUsage (H4)
- Stripe: transaction idempotency index/upserts (H3), lifecycle events incl. payment_failed &
  subscription.updated, expiry from Stripe period end, cancel honors paid-through period (M6)
- parse-resume hardening (H2) · seed drift guard + re-seed (H9) · broken links/pages (H6)
- Onboarding auth via HttpOnly cookies (H5) · double-submit guards (H7) · TagInput hook fix (H8)
- env.js centralization for DEEPSEEK/GEMINI keys (H11) · health endpoint exempted from auth (M1)
- check-subscription JWT-cookie auth (M2) · DB-backed permission checks everywhere (M3)
- readJson size guards on AI/PDF routes (M4) · template allowlist (M5)
- Admin API validation: bounded credit adjustments clamped ≥0, ROLES enum role changes,
  self-demotion lockout, user deletion with Stripe cancel + cascade cleanup (M7/L2/L3/L4)
- Data-exposure whitelists on verify-session/admin users/role responses (M8)
- Frontend: Navbar uses AuthContext (+ server-computed creditsRemaining), sort-mutation fix,
  res.ok checks + inline error banners, download-button alerts, a11y aria-labels & modal semantics,
  dead code removed (/test page, JobDescription, DiffViewer, empty dirs, console.logs, unused imports)
- Deps: 7 unused packages removed, heroicons moved to dependencies, eslint-config-next aligned,
  Next patched → 0 npm audit findings
- New pages: /templates, /privacy, /terms · root README.md added
