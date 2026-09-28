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

- **Per-deploy authorization version** — `invalidateRoleCache()` clears one
  process. A shared `authorizationVersion` (or pub/sub invalidation) would make
  revocations immediate across all instances.
- **Centralize the "role → plan label" mapping** — the admin users route
  derives `plan` inline; `src/lib/planResolver.js` would be a better home.
