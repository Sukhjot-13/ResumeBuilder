# Site Audit — Open Items

**Last updated:** 2026-08-21
All findings from the 2026-08-21 audit (1 Critical, 11 High, 18 Medium, Low items, suggestions)
have been **fixed**. Only the open items below remain. The full original findings are preserved
in git history (`docs/audit.md` at commit `4a5b2a3`).

---

## 🔴 Action Required (manual)

### 1. Rotate archived worker secrets, then delete the file
`automation/worker/.env` still contains real credentials on disk (gitignored — never committed).
Rotate any secrets that are shared with production (Brevo, DeepSeek, Resend, MongoDB), then delete
the file. The worker is inert; nothing needs them until automation is restored.

---

## 🟡 Accepted As-Is (documented, not bugs)

1. **3 exhaustive-deps lint warnings remain** (`cover-letters/page.js`, `ai-edit/page.js`,
   `admin/dashboard/page.js`) — fetch-on-mount patterns where adding the dependency would cause
   refetch loops; intentional. Lint otherwise runs at **0 errors**.
2. **Mixed response envelopes kept deliberately** — list/detail GETs return unwrapped data (`ok()`),
   mutations use `{ success, data }` (`success()`). Convention documented in
   `docs/architecture.md` → `apiResponse.js`.
3. **Index keys on bullet-list inputs** in ManualResumeForm — cosmetic input-state quirk when
   deleting middle items; tag lists already use composite keys.
4. **Next.js upgraded 16.0.7 → 16.3.2** to clear all high-severity npm advisories (production audit:
   **0 vulnerabilities**). Worth a staging regression pass before deploy.
