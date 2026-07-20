# Refactoring Advice — Professional Codebase Improvements

> One change, one file. Each item is self-contained and independently actionable.

---

## 🟠 HIGH

### 1. `generate-content` Saves Metadata as Embedded Object (Not Ref)

**Problem:** The metadata object is saved directly onto the resume document instead of creating a `ResumeMetadata` document reference. This causes `populate('metadata')` to silently fail later.

| Action | File |
|--------|------|
| Create ResumeMetadata doc and store the ObjectId ref | `src/app/api/generate-content/route.js` |

**Reference pattern:** See how `resumeService.createResume()` handles metadata.

---

## 🟡 MEDIUM

### 2. `resumeSchema.js` Wasteful JSON.parse → JSON.stringify Cycle

```js
// Current — parse then re-stringify
resume: JSON.parse(RESUME_SCHEMA_FOR_PROMPT),
```

| Action | File |
|--------|------|
| Have `generateAIPromptSchema()` return raw objects, let callers stringify | `src/lib/resumeFields.js` |
| Simplify to avoid the roundtrip | `src/lib/resumeSchema.js` |

---

### 3. `SubscriptionService` Bypasses `UserService`

**Problem:** `User.findById()` used directly instead of `UserService.getUserById()`.

| Action | File |
|--------|------|
| Import and use `UserService.getUserById()` | `src/services/subscriptionService.js` |

---

## 🟢 LOW — Quick Wins

| # | Change | File(s) |
|---|--------|---------|
| 4 | Rename lowercase model files to PascalCase | Rename `resume.js` → `Resume.js`, `plan.js` → `Plan.js`, `resumeMetadata.js` → `ResumeMetadata.js`, `refreshToken.js` → `RefreshToken.js`. Update all imports. |
| 5 | Use `{ timestamps: true }` instead of manual `createdAt` | All model files that manually declare date fields |
| 6 | Remove dead `plan` field from User model | `src/models/User.js` lines 42–45 |
| 7 | Add `currency: 'usd'` to FREE plan for consistency | `src/lib/constants.js` |
| 8 | Use `API_ENDPOINTS` constants instead of hardcoded URLs | `src/app/login/page.js`, `src/app/cover-letters/page.js`, `src/app/automation/page.js` |
| 9 | `generateRefreshToken()` should use `TOKEN_CONFIG` instead of hardcoded `'15d'` | `src/lib/utils.js` line 26 |
| 10 | Tie up JWT edge duplication — `verifyTokenEdge` vs `verifyToken` | `src/lib/auth-edge.js` vs `src/lib/utils.js` |
| 11 | Make `env.js` export immutable (`Object.freeze`) | `src/config/env.js` |

---

## Recommended Order of Implementation

```
Phase 1 — Data Integrity
  └──  1. Fix metadata being saved as embedded object (not ref)

Phase 2 — Consistency & Maintainability
  ├──  2. Fix resumeSchema.js wasteful JSON roundtrip
  └──  3. Fix SubscriptionService bypassing UserService

Phase 3 — Cleanup
  └──  4–11. Low-level quick wins
```
