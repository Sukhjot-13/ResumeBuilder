# Refactoring Advice — Professional Codebase Improvements

> One change, one file. Each item is self-contained and independently actionable.

---

## 🔴 CRITICAL

### 1. Unify User Identity Resolution (3 Competing Patterns)

**Problem:** Different API routes resolve the user in different ways, creating an inconsistent auth model.

| Pattern | Strategy | Routes Using It |
|---------|----------|-----------------|
| A | Read `req.headers.get('x-user-id')` only | `resumes/*`, `cover-letters/*`, `admin/*`, `api-keys/*` |
| B | `resolveUserId()` — tries Bearer API key first, then `x-user-id` | `user/profile/*`, `automation/applications/*` |
| C | Custom inline `resolveUser()` — Pattern B + rate limiting | `generate-content/*` |

**Impact:** Routes in Pattern A cannot be called via API key (only browser sessions). Routes in Pattern C duplicate logic from Pattern B.

| Action | File |
|--------|------|
| Add optional `rateLimit` param to `resolveUserId()` | `src/lib/apiKeyAuth.js` |
| Update all Pattern A routes to use `resolveUserId(request)` | `src/app/api/resumes/route.js`, `src/app/api/resumes/[id]/route.js`, `src/app/api/cover-letters/route.js`, `src/app/api/cover-letters/[id]/route.js`, `src/app/api/api-keys/route.js`, `src/app/api/admin/users/route.js` |
| Delete the inline `resolveUser()` function | `src/app/api/generate-content/route.js` |

---

## 🟠 HIGH

### 2. Role Permissions — Remove Massive Array Duplication

**Problem:** DEVELOPER and SUBSCRIBER arrays are nearly identical (both list ~25 permissions). ADMIN hardcodes all 40+ individually. No inheritance model.

**Fix approach:**

```js
const subscriberPermissions = [...basePermissions, ...proPermissions];
const developerPermissions = [...subscriberPermissions, PERMISSIONS.VIEW_USERS, ...];
const adminPermissions = 'ALL';  // wildcard
```

| Action | File |
|--------|------|
| Use inheritance/spread for role permissions | `src/lib/constants.js` |
| Add wildcard (`*`) support to `hasPermission()` | `src/lib/accessControl.js` |

---

### 3. `parse-resume` Route Ignores All Error Handling Conventions

**Problem:** Doesn't use `withErrorHandler`, `ok()`, or `fail()`. Returns raw `new Response()` objects. A thrown error produces a non-JSON 500 — completely different from every other route.

| Action | File |
|--------|------|
| Wrap with `withErrorHandler`, use `ok()`/`fail()` | `src/app/api/parse-resume/route.js` |

---

### 4. Cover Letter Route Lacks API Key Auth

**Problem:** The generate-cover-letter route only checks `x-user-id` header, meaning the automation worker (which authenticates via Bearer API key) cannot generate cover letters.

| Action | File |
|--------|------|
| Switch from `x-user-id` to `resolveUserId()` | `src/app/api/generate-cover-letter/route.js` |

---

### 5. `generate-content` Saves Metadata as Embedded Object (Not Ref)

**Problem:** The metadata object is saved directly onto the resume document instead of creating a `ResumeMetadata` document reference. This causes `populate('metadata')` to silently fail later.

| Action | File |
|--------|------|
| Create ResumeMetadata doc and store the ObjectId ref | `src/app/api/generate-content/route.js` |

**Reference pattern:** See how `resumeService.createResume()` handles metadata.

---

## 🟡 MEDIUM

### 6. `resumeSchema.js` Wasteful JSON.parse → JSON.stringify Cycle

```js
// Current — parse then re-stringify
resume: JSON.parse(RESUME_SCHEMA_FOR_PROMPT),
```

| Action | File |
|--------|------|
| Have `generateAIPromptSchema()` return raw objects, let callers stringify | `src/lib/resumeFields.js` |
| Simplify to avoid the roundtrip | `src/lib/resumeSchema.js` |

---

### 7. `PERMISSION_METADATA` Incomplete + Incorrect Labels

**Problem:** Only 12 of ~30 permissions have metadata entries. All are labeled `requiredPlan: "PRO"` — even basic ones like `VIEW_OWN_PROFILE` that free users have.

| Action | File |
|--------|------|
| Add metadata for all permissions | `src/lib/constants.js` |
| Fix `requiredPlan` to match actual role assignments | `src/lib/constants.js` |

---

### 8. `SubscriptionService` Bypasses `UserService`

**Problem:** `User.findById()` used directly instead of `UserService.getUserById()`.

| Action | File |
|--------|------|
| Import and use `UserService.getUserById()` | `src/services/subscriptionService.js` |

---

## 🟢 LOW — Quick Wins

| # | Change | File(s) |
|---|--------|---------|
| 9 | Rename lowercase model files to PascalCase | Rename `resume.js` → `Resume.js`, `plan.js` → `Plan.js`, `resumeMetadata.js` → `ResumeMetadata.js`, `refreshToken.js` → `RefreshToken.js`. Update all imports. |
| 10 | Use `{ timestamps: true }` instead of manual `createdAt` | All model files that manually declare date fields |
| 11 | Remove dead `plan` field from User model | `src/models/User.js` lines 42–45 |
| 12 | Add `currency: 'usd'` to FREE plan for consistency | `src/lib/constants.js` |
| 13 | Use `API_ENDPOINTS` constants instead of hardcoded URLs | `src/app/login/page.js`, `src/app/cover-letters/page.js`, `src/app/automation/page.js` |
| 14 | `PermissionGate` should reject when `permission` is null/undefined | `src/components/common/PermissionGate.js` line 29 |
| 15 | `generateRefreshToken()` should use `TOKEN_CONFIG` instead of hardcoded `'15d'` | `src/lib/utils.js` line 26 |
| 16 | Tie up JWT edge duplication — `verifyTokenEdge` vs `verifyToken` | `src/lib/auth-edge.js` vs `src/lib/utils.js` |
| 17 | Make `env.js` export immutable (`Object.freeze`) | `src/config/env.js` |

---

## Recommended Order of Implementation

```
Phase 1 — Security & Auth Integrity
  ├──  1. Unify user resolution across all API routes
  └──  4. Add API key auth to cover letter route

Phase 2 — Data Integrity
  └──  5. Fix metadata being saved as embedded object (not ref)

Phase 3 — Consistency & Maintainability
  ├──  2. Role permission inheritance
  ├──  3. Fix parse-resume error handling
  └──  6–8. Schema, metadata, subscription fixes

Phase 4 — Cleanup
  └──  9–17. Low-level quick wins
```
