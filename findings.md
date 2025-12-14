# Codebase Analysis Findings

This document contains a comprehensive analysis of the codebase focused on:

- **Single Responsibility Principle (SRP)**: One responsibility per file
- **One Change → One Place**: Centralizing changes
- **Readability over cleverness**
- **One Concept – One Implementation**: No duplicate logic
- **Broken functionality and improvement opportunities**

---

## ⚠️ Critical Issues: "One Change → One Place" Violations

### 1. Duplicate `getAuthenticatedUser()` Function

**Location**:

- [resumeActions.js](file:///Users/sukhjot/codes/untitled%20folder%202/ats-resume-builder-a1/src/app/actions/resumeActions.js#L16-L36)
- [profileActions.js](file:///Users/sukhjot/codes/untitled%20folder%202/ats-resume-builder-a1/src/app/actions/profileActions.js#L16-L36)
- [adminActions.js](file:///Users/sukhjot/codes/untitled%20folder%202/ats-resume-builder-a1/src/app/actions/adminActions.js#L18-L38)

**Problem**: The `getAuthenticatedUser()` function is **identically duplicated** across all 3 server action files. Each copy does the same thing: reads cookies, calls `verifyAuth()`, and returns `{userId, role}`.

**Impact**:

- If authentication logic changes (e.g., adding a new cookie or changing the response structure), **3 files must be updated**.
- High risk of inconsistency if one file is updated but others are forgotten.

**Recommendation**:

```javascript
// Create: src/lib/serverAuth.js
export async function getAuthenticatedUser() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("accessToken")?.value;
  const refreshToken = cookieStore.get("refreshToken")?.value;
  // ... rest of implementation
}
```

---

### 2. Duplicate Permission Checking Systems

**Location**:

- [accessControl.js](file:///Users/sukhjot/codes/untitled%20folder%202/ats-resume-builder-a1/src/lib/accessControl.js) (Primary - **USE THIS**)
- [featureAccessService.js](file:///Users/sukhjot/codes/untitled%20folder%202/ats-resume-builder-a1/src/services/featureAccessService.js) (Legacy duplicate)

**Problem**: `featureAccessService.js` implements permission checking using `FEATURE_ACCESS_LEVELS` which is:

1. Marked as legacy in `constants.js` (lines 218-224)
2. Duplicates the functionality of `checkPermission()` in `accessControl.js`
3. Uses a different mental model (role number comparisons vs explicit permission arrays)

**Impact**:

- Developers may accidentally use the wrong system
- Two implementations to maintain for the same concept

**Recommendation**:

- Delete `featureAccessService.js` entirely
- Remove `FEATURE_ACCESS_LEVELS` from `constants.js`
- Ensure all code uses `hasPermission()` or `checkPermission()` from `accessControl.js`

---

### 3. Inline Resume Schema Duplication in AI Services

**Location**:

- [aiResumeEditorService.js](file:///Users/sukhjot/codes/untitled%20folder%202/ats-resume-builder-a1/src/services/aiResumeEditorService.js#L31-L71) (lines 31-71)
- [contentGenerationService.js](file:///Users/sukhjot/codes/untitled%20folder%202/ats-resume-builder-a1/src/services/contentGenerationService.js#L36-L82) (lines 36-82)
- [models/resume.js](file:///Users/sukhjot/codes/untitled%20folder%202/ats-resume-builder-a1/src/models/resume.js) (Mongoose schema - source of truth)

**Problem**: The resume JSON schema is hardcoded inline as a prompt string in **both** AI services, separately from the Mongoose model.

**Impact**:

- If the resume structure changes, you must update:
  1. `models/resume.js`
  2. The inline schema in `aiResumeEditorService.js`
  3. The inline schema in `contentGenerationService.js`
- Schema definitions can drift out of sync

**Recommendation**:

```javascript
// Create: src/lib/schemas/resumeSchema.js
export const RESUME_SCHEMA_FOR_PROMPT = `{
  "profile": { ... },
  "work_experience": [ ... ],
  ...
}`;
```

Then import and use this single schema definition in both AI services.

---

### 4. Duplicate JSON Parsing Logic in AI Services

**Location**:

- [aiResumeEditorService.js](file:///Users/sukhjot/codes/untitled%20folder%202/ats-resume-builder-a1/src/services/aiResumeEditorService.js#L77-L90) (lines 77-90)
- [contentGenerationService.js](file:///Users/sukhjot/codes/untitled%20folder%202/ats-resume-builder-a1/src/services/contentGenerationService.js#L96-L109) (lines 96-109)

**Problem**: Both services contain identical JSON cleanup and parsing logic:

````javascript
let text = result.response
  .text()
  .replace(/```json/g, "")
  .replace(/```/g, "");
const lastBraceIndex = text.lastIndexOf("}");
if (lastBraceIndex !== -1) {
  text = text.substring(0, lastBraceIndex + 1);
}
// ... parse JSON
````

**Recommendation**:

````javascript
// Add to geminiService.js:
export function parseGeminiJsonResponse(responseText) {
  let text = responseText.replace(/```json/g, "").replace(/```/g, "");
  const lastBraceIndex = text.lastIndexOf("}");
  if (lastBraceIndex !== -1) {
    text = text.substring(0, lastBraceIndex + 1);
  }
  return JSON.parse(text);
}
````

---

## ⚠️ Inconsistencies: Mixed Patterns

### 5. Inconsistent API Route Permission Checking

**Good Pattern** (uses centralized helper):

- [/api/resumes/route.js](file:///Users/sukhjot/codes/untitled%20folder%202/ats-resume-builder-a1/src/app/api/resumes/route.js) - Uses `requirePermission()` from `apiPermissionGuard.js`

**Mixed Pattern** (inline permission check):

- [/api/generate-content/route.js](file:///Users/sukhjot/codes/untitled%20folder%202/ats-resume-builder-a1/src/app/api/generate-content/route.js) - Manually calls `UserService.getUserById()` then `checkPermission()`
- [/api/edit-resume-with-ai/route.js](file:///Users/sukhjot/codes/untitled%20folder%202/ats-resume-builder-a1/src/app/api/edit-resume-with-ai/route.js) - Manually calls `UserService.getUserById()` then `checkPermission()`
- [/api/parse-resume/route.js](file:///Users/sukhjot/codes/untitled%20folder%202/ats-resume-builder-a1/src/app/api/parse-resume/route.js) - Manually calls `UserService.getUserById()` then `checkPermission()`

**Recommendation**: Standardize all API routes to use `requirePermission()` from `apiPermissionGuard.js`.

---

### 6. `/api/resumes/route.js` Bypasses ResumeService

**Location**: [/api/resumes/route.js](file:///Users/sukhjot/codes/untitled%20folder%202/ats-resume-builder-a1/src/app/api/resumes/route.js)

**Problem**: The `POST` handler manually creates Resume and ResumeMetadata documents instead of using `ResumeService.createResume()`:

```javascript
// Current (bad):
const newResume = new Resume({ userId, content });
await newResume.save();
const newMetadata = new ResumeMetadata({ ... });
// ...

// Should be:
await ResumeService.createResume(userId, content, metadata);
```

**Impact**: Resume creation logic is split between the service and the API route. Changes to resume creation must be made in multiple places.

---

## 🔍 Code Quality Issues

### 7. Unused Import in `utils.js`

**Location**: [utils.js](file:///Users/sukhjot/codes/untitled%20folder%202/ats-resume-builder-a1/src/lib/utils.js#L3)

**Problem**: Line 3 imports `ROLE_PERMISSIONS` but it's never used in the file.

```javascript
import { ROLE_PERMISSIONS } from "@/lib/constants";
```

**Recommendation**: Remove unused import.

---

### 8. Legacy Code Still Present

**Location**: [constants.js](file:///Users/sukhjot/codes/untitled%20folder%202/ats-resume-builder-a1/src/lib/constants.js#L218-L228)

**Problem**: `FEATURE_ACCESS_LEVELS` and `FEATURES` constants are marked as legacy but still exist:

```javascript
// Legacy - kept for backward compatibility during migration
// TODO: Remove after all code migrated to PERMISSIONS
export const FEATURE_ACCESS_LEVELS = { ... }
export const FEATURES = { ... }
```

**Recommendation**: Complete the migration and remove these.

---

### 9. Deprecated Function Warning (Good Practice, But Consider Removing)

**Location**: [accessControl.js](file:///Users/sukhjot/codes/untitled%20folder%202/ats-resume-builder-a1/src/lib/accessControl.js#L50-L67)

**Problem**: `checkFeatureAccess()` is marked deprecated. If it's not being used anywhere, it should be removed entirely.

**Recommendation**: Search for usages; if none found, delete the function.

---

## 🧪 Missing: Automated Tests

**Finding**: No automated tests exist in the project (checked for `*.test.js` and `*spec*` files).

**Impact**:

- No safety net for refactoring
- Regressions are only caught in production or manual testing
- Makes "One Change → One Place" refactoring risky

**Recommendation**: Add at least:

1. Unit tests for `accessControl.js` (permission checking)
2. Unit tests for service layer functions
3. Integration tests for critical API routes

---

## ✅ What's Done Well

1. **Service Layer Pattern**: `UserService` and `ResumeService` are well-structured with clear, parameterized functions following SRP.

2. **Centralized Permission System**: The `PERMISSIONS` enum and `ROLE_PERMISSIONS` mapping in `constants.js` is well-designed and easy to extend.

3. **Client-Side Permission Components**: `PermissionGate` and `PremiumFeatureLock` are good abstractions for UI permission handling.

4. **Logger Usage**: Consistent logging through `logger.js` across the codebase.

5. **API Permission Guard**: `apiPermissionGuard.js` provides a good pattern for API route permission checks (though not all routes use it).

---

## 📋 Summary: Refactoring Priority List

| Priority  | Issue                                      | Effort   | Impact |
| --------- | ------------------------------------------ | -------- | ------ |
| 🔴 High   | Create shared `getAuthenticatedUser()`     | Low      | High   |
| 🔴 High   | Delete `featureAccessService.js`           | Low      | Medium |
| 🟡 Medium | Extract resume schema constant             | Medium   | High   |
| 🟡 Medium | Create shared JSON parsing utility         | Low      | Medium |
| 🟡 Medium | Standardize API route permission pattern   | Medium   | Medium |
| 🟡 Medium | Use `ResumeService` in `/api/resumes` POST | Low      | Medium |
| 🟢 Low    | Remove unused imports                      | Very Low | Low    |
| 🟢 Low    | Remove legacy constants/functions          | Low      | Low    |
| 🟢 Low    | Add automated tests                        | High     | High   |

---

## 🔧 Broken/Potential Issues Found

### 1. Potential Race Condition in Credit Tracking

**Location**: [/api/edit-resume-with-ai/route.js](file:///Users/sukhjot/codes/untitled%20folder%202/ats-resume-builder-a1/src/app/api/edit-resume-with-ai/route.js#L49-L57)

**Issue**: Credits are checked with `hasCredits()` but deducted later with `trackUsage()`. In high-concurrency scenarios, a user could potentially make multiple requests that all pass the credit check before any are deducted.

**Recommendation**: Consider atomic credit operations or optimistic locking.

---

### 2. Missing Permission Check in `setAsMainResume`

**Location**: [resumeActions.js](file:///Users/sukhjot/codes/untitled%20folder%202/ats-resume-builder-a1/src/app/actions/resumeActions.js#L146-L181)

**Issue**: The `setAsMainResume` function doesn't check any permission before allowing a user to set their main resume.

**Recommendation**: Add permission check or document why it's intentionally unrestricted.

---

### 3. Hard-coded Role Numbers

**Location**: [profileActions.js](file:///Users/sukhjot/codes/untitled%20folder%202/ats-resume-builder-a1/src/app/actions/profileActions.js#L176-L180)

**Issue**:

```javascript
isActive: user.role === 99, // SUBSCRIBER role
isPro: user.role <= 99,
```

Should use `ROLES.SUBSCRIBER` constant for consistency:

```javascript
isActive: user.role === ROLES.SUBSCRIBER,
isPro: user.role <= ROLES.SUBSCRIBER,
```

---

_Document generated: 2025-12-14_
