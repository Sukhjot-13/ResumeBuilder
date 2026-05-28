You are acting as a senior staff engineer, security auditor, platform architect, QA lead, performance engineer, and production reliability reviewer.

MISSION:
Perform a COMPLETE DEEP AUDIT of this ENTIRE repository.

This is NOT a superficial review.
This is NOT a sample-based review.
This is NOT a quick scan.

You MUST inspect the entire codebase methodically, trace real flows, identify risks, identify architectural weaknesses, identify redundancy/refactor opportunities, and produce persistent documentation so the audit can resume if interrupted.

==================================================
IMPORTANT OPERATING RULES
==================================================

1. THIS IS A LARGE REPOSITORY.
   Assume context limits may be hit.

Therefore:

- work incrementally
- persist progress continuously
- maintain audit state on disk
- be resumable
- checkpoint frequently

2. DO NOT MODIFY APPLICATION SOURCE CODE unless explicitly asked.

That means:

- no feature rewrites
- no large refactors
- no inline TODO comments
- no TODO/FIXME edits in source files
- no “helpful” code edits
- no changing app behavior

Allowed modifications:

- documentation files
- audit tracking files

3. ALL findings must be centralized in docs.
   Do NOT scatter notes into source files.

4. DO NOT fabricate architecture.
   Only document what is actually discovered.

5. If uncertain, explicitly mark uncertainty.

6. Reference exact file paths.

7. Reference exact functions/classes/modules when possible.

8. Continue until FULL audit is complete.

9. In addition to bugs/security concerns, identify:

- refactor opportunities
- duplicated logic
- dead code
- redundant abstractions
- repeated utilities
- unnecessary complexity
- architectural inconsistencies
- overengineering
- poor separation of concerns
- repeated API patterns
- repeated validation logic
- repeated UI patterns
- repeated database logic
- repeated AI prompt patterns
- repeated automation logic

10. For every meaningful refactor opportunity:
    document:

- what should be refactored
- why
- expected impact
- estimated complexity
- suggested architecture direction

DO NOT perform the refactor.
Only document it.

==================================================
PROJECT CONTEXT
==================================================

This is a job-tech platform with functionality likely including:

- resume builder
- AI resume workflows
- job automation / auto apply
- browser automation
- scraping / job ingestion
- AI content generation
- auth
- subscriptions/payments
- dashboard
- APIs
- background jobs
- uploads
- email notifications

Infer actual implementation from code.

==================================================
STEP 0 — AUDIT INFRASTRUCTURE (DO THIS FIRST)
==================================================

If /docs does not exist:
CREATE IT.

Create these files immediately:

/docs/audit-state.md
/docs/concerns.md

Purpose:

audit-state.md:
persistent checkpoint file so audit can resume after interruption.

concerns.md:
centralized issue tracker.

If interrupted later, FIRST read audit-state.md and continue from remaining tasks instead of restarting blindly.

==================================================
AUDIT-STATE FILE FORMAT
==================================================

Create /docs/audit-state.md with:

# Audit State

## Status

- NOT STARTED / IN PROGRESS / COMPLETE

## Repo Inventory

- [ ] framework detection
- [ ] dependency inventory
- [ ] frontend structure mapping
- [ ] backend structure mapping
- [ ] db schema review
- [ ] auth review
- [ ] payments review
- [ ] automation review
- [ ] AI integrations review
- [ ] deployment review

## File Review Progress

Track directories reviewed.

Example:

- [x] app/
- [x] components/
- [ ] lib/
- [ ] workers/
- [ ] scripts/

## Flow Review Progress

- [ ] signup
- [ ] signin
- [ ] password reset
- [ ] session refresh
- [ ] resume upload
- [ ] resume parsing
- [ ] resume builder editing
- [ ] resume export
- [ ] job search
- [ ] job matching
- [ ] job automation setup
- [ ] auto apply execution
- [ ] browser automation flow
- [ ] AI generation flow
- [ ] subscriptions
- [ ] payment webhooks
- [ ] dashboard analytics
- [ ] profile updates
- [ ] account deletion
- [ ] email notifications
- [ ] background jobs
- [ ] retry handling
- [ ] failure recovery

## Refactor Review Progress

- [ ] duplicate logic review
- [ ] dead code review
- [ ] redundant abstractions review
- [ ] repeated UI patterns review
- [ ] repeated API logic review
- [ ] repeated DB logic review
- [ ] repeated AI prompt logic review
- [ ] repeated automation logic review
- [ ] architectural consistency review

## Current Focus

What is currently being audited

## Next Steps

Precise next actions

## Blockers

Unknowns / limitations

Update this file continuously as work progresses.

==================================================
CONCERNS FILE RULES
==================================================

ALL issues go in:

/docs/concerns.md

DO NOT put findings inside source files.

Each issue format:

## Issue Title

Severity:
Critical / High / Medium / Low

Category:

- Security
- Performance
- Scalability
- Reliability
- Refactor
- Architecture
- Maintainability
- UX
- Data Integrity
- AI
- Automation
- Dependency

Affected Files:

- exact/path/file.ts

Functions/Modules:

- exact names if identifiable

Issue:
clear explanation

Risk:
what can break / exploit scenario

Recommended Fix:
specific remediation

Refactor Recommendation:
(if applicable)

Estimated Complexity:
Low / Medium / High

Expected Impact:
what improves after fix/refactor

Status:
Open

==================================================
PHASE 1 — FULL REPO INVENTORY
==================================================

Inspect the whole repository structure.

Exclude only:

- node_modules
- build artifacts
- generated caches
- vendor binaries

Document:

- frameworks
- languages
- runtimes
- package managers
- frontend architecture
- backend architecture
- DB architecture
- auth architecture
- workers
- queues
- cron jobs
- external integrations
- AI integrations
- browser automation stack
- deployment assumptions
- CI/CD
- test frameworks

Also identify:

- dead code
- abandoned modules
- duplicate logic
- inconsistent patterns
- repeated utilities
- repeated business logic
- overengineered areas
- unnecessary abstractions
- legacy code paths
- unused dependencies

Update audit-state.md continuously.

==================================================
PHASE 2 — FILE-BY-FILE REVIEW
==================================================

Review EVERY meaningful file.

For each file evaluate:

- purpose
- behavior
- dependencies
- hidden assumptions
- risk areas
- maintainability concerns
- production concerns
- refactor opportunities

Look specifically for:

GENERAL

- dead code
- code smells
- duplicated logic
- magic values
- weak abstractions
- redundant wrappers
- unnecessary complexity
- copy-pasted implementations
- large files needing separation
- poor naming
- low cohesion
- high coupling

FRONTEND

- hydration bugs
- SSR/client mismatches
- stale closures
- bad state management
- race conditions
- loading deadlocks
- UX dead ends
- navigation breaks
- repeated components
- repeated hooks
- duplicated UI logic

BACKEND

- missing validation
- weak input sanitization
- auth bypass
- missing ownership checks
- IDOR
- privilege escalation
- poor error handling
- transaction gaps
- concurrency hazards
- timeout issues
- retry storms
- missing idempotency
- duplicated service logic
- bloated routes/controllers

DATABASE

- N+1 queries
- missing indexes
- schema drift
- bad migrations
- orphaned relations
- data corruption risks
- redundant schema patterns

SECURITY

- secret leakage
- unsafe env handling
- prompt injection exposure
- unsafe parsing
- file upload risks
- path traversal
- insecure deserialization
- webhook spoofing
- weak crypto
- token misuse

AI

- trusting model output blindly
- malformed JSON handling
- prompt injection
- cost explosion risks
- fallback gaps
- retry loops
- repeated prompts that should be centralized
- duplicated AI orchestration logic

AUTOMATION

- brittle selectors
- anti-bot failures
- captcha dead ends
- session expiry issues
- concurrency scaling issues
- browser leaks
- zombie workers
- repeated automation steps

DEPENDENCIES

- deprecated packages
- dangerous packages
- version conflicts
- unused dependencies

Log findings ONLY in concerns.md.

Update audit-state.md after every major directory.

==================================================
PHASE 3 — REAL FLOW TRACING
==================================================

Trace ACTUAL execution flows.

Do not just inspect isolated files.

Trace:

UI click
→ route
→ component
→ hook
→ API call
→ backend route
→ service
→ db
→ queue
→ worker
→ external API
→ callback
→ UI completion

Minimum flows:

1. signup
2. signin
3. password reset
4. session refresh
5. onboarding
6. resume upload
7. parsing
8. resume editing
9. resume export
10. job search
11. job scoring
12. AI recommendations
13. automation setup
14. auto apply execution
15. browser automation lifecycle
16. subscription checkout
17. webhook handling
18. plan enforcement
19. dashboard analytics
20. profile updates
21. account deletion
22. email notifications
23. background jobs
24. retry flows
25. failure recovery

For each:
identify:

- breaking points
- silent failure risks
- inconsistent state risks
- UX failures
- scalability risks
- repeated logic
- refactor opportunities
- unnecessary complexity

==================================================
PHASE 4 — PRODUCTION READINESS REVIEW
==================================================

Evaluate:

SECURITY

- auth hardening
- RBAC
- abuse prevention
- rate limiting
- secrets management
- webhook validation
- AI safety boundaries

SCALABILITY

- DB hotspots
- expensive queries
- polling inefficiency
- browser automation scaling
- worker bottlenecks
- memory-heavy flows

RELIABILITY

- retries
- circuit breakers
- graceful degradation
- observability
- structured logging
- monitoring readiness
- timeout controls

MAINTAINABILITY

- modularity
- architecture consistency
- coupling
- naming quality
- upgrade risk
- testability
- redundant architecture
- duplicated patterns
- abstraction quality

COMPLIANCE / DATA

- PII handling
- resume data exposure
- credential storage
- user data lifecycle
- scraping legal risk indicators

==================================================
PHASE 5 — DOCUMENTATION GENERATION
==================================================

Create/update:

/docs/architecture.md
/docs/frontend.md
/docs/backend.md
/docs/database.md
/docs/auth.md
/docs/ai.md
/docs/automation.md
/docs/deployment.md
/docs/security.md
/docs/testing.md
/docs/technical-debt.md
/docs/user-flows.md
/docs/api-reference.md
/docs/refactor-opportunities.md

Rules:

- based ONLY on actual discovered code
- no assumptions
- detailed
- architecture-quality documentation

==================================================
PHASE 6 — REFACTOR ANALYSIS
==================================================

Create detailed refactor analysis.

Document:

- duplicate modules
- repeated code patterns
- repeated utilities
- repeated hooks
- repeated API wrappers
- repeated DB queries
- repeated AI prompts
- repeated automation flows
- oversized files
- poor boundaries
- overengineering
- unnecessary abstractions
- tight coupling
- weak modularity

For each refactor opportunity:

- affected files
- why current approach is weak
- recommended architecture
- migration complexity
- risk level
- expected payoff

==================================================
PHASE 7 — FINAL CONCERNS REPORT
==================================================

/docs/concerns.md must include:

# Executive Summary

Severity totals:

- Critical
- High
- Medium
- Low

# Critical Issues

# High Priority Issues

# Breaking Production Risks

# Security Risks

# Performance Risks

# Scalability Risks

# Reliability Risks

# UX/Product Risks

# Data Integrity Risks

# AI Risks

# Browser Automation Risks

# Dependency Risks

# Refactor Opportunities

# Dead Code

# Redundant Logic

# Architectural Weaknesses

# Overengineered Areas

# Missing Monitoring

# Missing Safeguards

# Missing Tests

# Refactor Priorities

# Fast Wins

# Deployment Concerns

# Go / No-Go Assessment

==================================================
RESUME BEHAVIOR
==================================================

If session resumes:

1. read /docs/audit-state.md
2. determine incomplete work
3. continue from next unfinished section
4. do NOT restart completed sections unless inconsistency found

==================================================
SUCCESS CRITERIA
==================================================

Audit is complete only when:

- all meaningful files reviewed
- all major directories reviewed
- all critical flows traced
- docs generated
- concerns centralized
- refactor opportunities documented
- duplicate/redundant logic identified
- audit-state shows COMPLETE
