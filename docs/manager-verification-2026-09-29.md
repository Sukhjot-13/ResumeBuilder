# Manager and ResumeBuilder verification — 2026-09-29

Authenticated live Manager and local ResumeBuilder were checked using an isolated
in-memory database and a synthetic existing user. No AI generations, email sends,
Stripe transactions, or generation credits were used.

## Verified behavior

- Local test login issues valid access/refresh cookies; dashboard, saved master
  preview, templates, PDF rendering and logout work. PDF endpoint returned HTTP
  200, `application/pdf`, a `%PDF-1.3` signature and 2,160 bytes for the fixture.
  The browser download action completed without an application error; the browser
  tool did not provide a download event/path.
- Real browser info, console warning/error, uncaught error and rejected promise
  arrived in live Manager under the Resume Builder project.
- A deliberate authenticated server exception returned a safe HTTP 500 and
  appeared in Manager with the exception stack. Fake passwords/tokens were
  redacted before ingestion.
- Browser and server entries share trace
  `t_60bf94de-9232-4540-80d9-42e69745b45a`, verified in Manager's combined view.
- Analytics pageviews, clicks and `manager_integration_probe_custom` arrived.
- Server/client log keys and analytics keys work in their intended endpoints;
  wrong-kind and unknown keys are rejected. Live key/health script: 8/8 checks.
- Manager: 382 tests, lint, type checking, production build pass; production
  HTTP smoke suite: 63/63 checks (auth, roles, projects, logs, exports, vault,
  analytics, keys, SDK, kill switch and logout).
- ResumeBuilder: 180 tests pass, including six local-only bypass tests; lint
  and production build checked after diagnostic source cleanup.

## Fixes and boundaries

Fixed SDK error stacks/deduplication, fetch trace headers, capture during uploads,
browser initialization, analytics-only configuration, request trace isolation,
serverless flush completion, all route-handler coverage, repeated-error delivery/counting, source/trace deduplication and trace timeline order.

Temporary diagnostic routes and buttons were removed after testing. Synthetic
log/event evidence remains in Manager. The existing local-only login bypass and
its tests stay uncommitted. Deployable fixes are committed locally; nothing was
pushed or deployed during this check.

AI/email/payment provider workflows were covered by existing tests and the new
mocked webhook regressions. Paid generation and real transactions were not run.

## Main merge verification

The Manager integration branch was merged into `main` on 2026-09-29, preserving
the OTP form fix already on `main`. With the local login bypass and its tests
stashed, the merged deployable tree passed all 190 tests, lint and production
build. The bypass remains local-only and is excluded from the merge.
