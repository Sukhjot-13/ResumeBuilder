# Profile permissions verification — 2026-09-30

Reported warning: authenticated user role `0`, permission `view_own_profile`, source `role-not-in-store`.

The role store had been loaded without an Admin policy row. The shared resolver incorrectly required that row to grant root access. The protected root policy now recognizes the canonical numeric Admin role independently of mutable Role rows. API guards still retrieve the authenticated account from the User collection, so a claimed role, invalid identity or account-database failure cannot bypass authentication. Ordinary permissions remain authoritative database grants with cache invalidation and bounded last-known-good snapshots.

The same verification exposed a birthday bug: MongoDB's `1990-01-01T00:00:00Z` displayed as `1989-12-31` in Toronto. The profile now preserves the stored calendar day for birth dates, while subscription renewal timestamps retain local-time display.

## Automated checks

- `npm test`: 230/230 tests across 20 files, including the six pre-existing temporary local-login tests. Their uncommitted route/test files were preserved byte-for-byte and excluded from this fix's commit.
- `npm run lint`: passed.
- Production Next.js build: passed with synthetic configuration and a disposable MongoDB database.
- Unit/route regressions cover missing/edited root rows, policy outages, ordinary revocation, expired snapshots, unknown permissions/malformed ranks, refusing lower-role `isAdmin`/`ALL` authority, profile GET/PUT through the real guard/resolver, field privacy, and birthday formatting in Toronto/Los Angeles/UTC/Auckland.

## Live verification

29/29 assertions passed against a real local production server and Chromium in `America/Toronto`, using real MongoDB storage, JWT cookies, authentication proxy, OTP verification, profile routes, and permission administration API.

| Boundary | Verified result |
|---|---|
| Database setup | USER role exists; Admin role row deliberately absent. |
| Authentication | Real OTP verification creates root/ordinary-user sessions; no email is sent. Anonymous forged identity/role headers are refused. |
| Production bypass | Temporary `resume-test` login is refused. |
| Profile read/UI | Root profile returns 200; name and correct birthday render. |
| Profile write/storage | Form returns 200 and shows success; changed name persists; unchanged birthday remains the same UTC date. |
| Reload | Saved name persists; subscription renewal date still renders. |
| Root invariants | Missing or empty/false Admin policy row cannot disable profile, unlimited credits or permission administration. |
| Ordinary permissions | A real profile grant works; root revocation through the real administration API immediately returns 403. |
| Spoofing | Client role headers and a synthetic stale root-role JWT claim cannot replace the ordinary account's current database role. |
| Protected policy | Non-root wildcard grants and root-role permission CRUD are refused. |
| Browser | No uncaught errors. |

No AI, Stripe, Brevo or remote Manager calls were made. The verification OTP was hashed directly into isolated fixture users; the real OTP verification endpoint then issued the session. No mail delivery or OTP-request UI is claimed by these checks.

All temporary database fixtures were destroyed and verification server/browser processes stopped. No deployed database, environment variables or real account were modified. Fixes remain local; nothing was pushed or deployed.
