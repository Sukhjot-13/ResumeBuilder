# Resume generation ReferenceError verification — 2026-09-30

Reported server exception: `ReferenceError: userRole is not defined`.

`POST /api/generate-content` passed an undeclared `userRole` to `generateResume` and referenced it again in its success log. Valid requests failed before reaching the model transport. The route now derives `userRole` from the authenticated account's populated database document, keeping request role claims out of prompt-tier selection.

The new generation tests reproduced the exact exception before the change: nine of twelve cases failed. Normal Next.js lint had not enabled JavaScript `no-undef`. An explicit source-wide scan found only the two reported references; that rule now runs on all source JS/JSX in `npm run lint`. A synthetic undeclared route variable supplied via ESLint stdin was also correctly rejected without creating a fixture file.

## Automated verification

- `npm test`: 242/242 tests across 21 files, including six pre-existing temporary local-login tests. The temporary bypass files were preserved unchanged and are excluded from this commit.
- `npm run lint`: passed with the new source-wide undeclared-variable rule.
- New route coverage uses the real permission resolver/guard, resume generator and prompt builder with mocked model data, metering, persistence and AI transport. Covers every role, request-role spoofing, special instructions, input/master resume selection, saved/preview results, missing authentication/permissions/jobs/credits, malformed/oversized input, provider-failure refund/logging, nonfatal save failures and Manager completion.
- Production build: passed with isolated synthetic configuration.

## Live browser/API/data verification

28/28 assertions passed using Chromium, a real local production server, disposable MongoDB, real OTP verification/JWT cookies/proxy, the real generation route, prompt builder, provider runner/parser, resume/metadata persistence, account linking and credit service.

| Boundary | Result |
|---|---|
| Authentication | Anonymous generation rejected before provider usage; real fixture OTP creates normal and root sessions. |
| Dashboard | Generate button returns 200, displays the generated preview and releases the loading state. |
| Persistence | Returned resume ID exists in MongoDB; metadata is linked; user.generatedResumes and resume-list API include it. |
| Metering | A saved generation spends one credit; preview generation spends one credit and does not persist another resume. |
| Role provenance | Normal account uses its stored basic prompt even when request role fields claim Admin; unauthorized instructions never reach the prompt. |
| Provider failure | Synthetic HTTP 400 becomes safe generation 500; exactly one credit is refunded; no resume is saved; the real cause is logged. |
| Early refusals | Insufficient credits and missing job description do not reach the provider transport. |
| Root | Admin generation selects the premium prompt and retains unlimited-credit behavior. |
| Browser/runtime | No uncaught browser errors; the reported ReferenceError is absent. |

The model HTTP transport was intercepted by a temporary Node preload used only by the verification server. It returned four synthetic provider responses and made zero paid model calls. The app's real runner, JSON parser and all downstream application/database behavior still ran. This does not claim validation of live provider keys or model availability.

No AI fixture, test-only endpoint or provider interception was added to application code. No email, Stripe or remote Manager requests were sent. All temporary database fixtures were destroyed, server/browser stopped, and real environment/account/database data remained untouched. Fixes remain local; nothing was pushed or deployed.
