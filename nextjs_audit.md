# Next.js Best Practices Audit — ATS Resume Builder

---

## Summary Scorecard

| Category | Status | Grade |
|---|---|---|
| Project Structure | Partial — no `features/` folder | ⚠️ |
| Constants — Single Source of Truth | ✅ Excellent | ✅ |
| Environment Variables | ❌ `process.env` used directly everywhere | ❌ |
| API Layer (service → hook → component) | Partial — missing hook layer | ⚠️ |
| HTTP Client | ✅ Centralised `useApiClient` hook | ✅ |
| Component Rules | ✅ Smart/dumb split generally respected | ✅ |
| State Management | ⚠️ No React Query / Zustand — uses Context + useState | ⚠️ |
| Styling | ✅ Tailwind used, globals.css present | ✅ |
| Backend Layering | ✅ Route → Service → Model pattern in place | ✅ |
| Error Handling | ⚠️ No `AppError` class, ad-hoc error messages | ⚠️ |
| Auth Middleware | ✅ Centralised `serverAuth.js` + `apiPermissionGuard.js` | ✅ |

**Overall: 5 ✅ / 4 ⚠️ / 1 ❌**

---

## 1. Project Structure — ⚠️ Partial

**What the spec says:** Feature-based folders (`features/<name>/components`, `hooks`, `services`, `store`). One feature = one folder.

**What your project has:**
```
src/
  app/           ✅ Next.js pages only
  components/    ✅ Global UI components
  services/      ✅ Present (but global, not feature-scoped)
  hooks/         ✅ Present (but only 2 files)
  lib/           ✅ Present (third-party setup)
  context/       ❌ Not in spec (should be features/<name>/store/)
  models/        ⚠️ Lives in src/ instead of server/models/
```

**Gap:** No `features/` folder. Everything is flat and global. This works fine for a small project, but as you add features (e.g., AI editing, billing), you'll end up with giant flat directories. The `context/` folder should ideally be `features/auth/store/`.

> [!NOTE]
> This is not a breaking issue — your current flat structure is still organized. But as the project grows, migrating to feature folders will save you pain.

**Recommendation:** When adding the next major feature, create it under `features/<name>/`. No need to refactor everything now.

---

## 2. Constants — Single Source of Truth — ✅ Excellent

**What the spec says:** All magic strings, URLs, numbers in `constants/index.js`.

**What your project has:** `src/lib/constants.js` — and it's excellent:
- `ROLES`, `PERMISSIONS`, `ROLE_PERMISSIONS`, `PLANS`, `TOKEN_CONFIG`, `DEFAULTS`, `OTP_CONFIG` — all centralised.

**Gap:** The spec calls for `ROUTES` and `API_ENDPOINTS` objects too. These are currently hardcoded as strings in components (e.g., `/api/resumes`, `/api/user/profile` in `dashboard/page.js` and `AuthContext.js`).

**Recommendation:** Add to `lib/constants.js`:
```js
export const ROUTES = {
  HOME: "/",
  LOGIN: "/login",
  DASHBOARD: "/dashboard",
};

export const API_ENDPOINTS = {
  USER: { PROFILE: "/api/user/profile" },
  RESUMES: { LIST: "/api/resumes", BY_ID: (id) => `/api/resumes/${id}` },
  GENERATE: "/api/generate-content",
  CHECKOUT: { VERIFY: "/api/checkout/verify-session" },
};
```

---

## 3. Environment Variables — ❌ Needs Fix

**What the spec says:** Never use `process.env.X` directly. Wrap all env vars in `config/env.js`.

**What your project has:** `process.env` used directly in **16 places** across 9 different files:

| File | Variables Used |
|---|---|
| `lib/utils.js` | `ACCESS_TOKEN_SECRET`, `REFRESH_TOKEN_SECRET` |
| `lib/auth-edge.js` | `ACCESS_TOKEN_SECRET`, `REFRESH_TOKEN_SECRET` |
| `lib/stripe.js` | `STRIPE_SECRET_KEY` |
| `lib/mongodb.js` | `MONGODB_URI` |
| `services/geminiService.js` | `GEMINI_API_KEY` |
| `app/api/checkout/create-session/route.js` | `NEXT_PUBLIC_APP_URL` |
| `app/api/checkout/create-portal-session/route.js` | `NEXT_PUBLIC_APP_URL` |
| `app/api/webhooks/stripe/route.js` | `STRIPE_WEBHOOK_SECRET` |
| `app/api/auth/otp/route.js` | `BREVO_API_KEY`, `BREVO_SENDER_EMAIL` |
| `app/api/auth/verify-otp/route.js` | `NODE_ENV` |

**The problem:** If a variable is renamed in `.env.local`, you have to hunt through 9+ files to update it.

**Recommendation:** Create `src/config/env.js`:
```js
// src/config/env.js
const env = {
  accessTokenSecret: process.env.ACCESS_TOKEN_SECRET,
  refreshTokenSecret: process.env.REFRESH_TOKEN_SECRET,
  mongodbUri: process.env.MONGODB_URI,
  geminiApiKey: process.env.GEMINI_API_KEY,
  stripeSecretKey: process.env.STRIPE_SECRET_KEY,
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  brevoApiKey: process.env.BREVO_API_KEY,
  brevoSenderEmail: process.env.BREVO_SENDER_EMAIL,
  appUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  isProduction: process.env.NODE_ENV === 'production',
};

export default env;
```
Then replace all `process.env.X` calls with `import env from '@/config/env'`.

---

## 4. API Layer (Service → Hook → Component) — ⚠️ Partial

**What the spec says:** 3 layers: service → hook → component. Components never call fetch directly.

**What your project has:**
- ✅ **Service layer** (`src/services/`) — excellent, well-documented, single-responsibility
- ❌ **Hook layer** — missing. Only `useApiClient` (an HTTP wrapper), but no feature-specific hooks like `useResumes()`, `useProfile()`
- ⚠️ **Component layer** — `dashboard/page.js` calls `apiClient(...)` directly inside `useEffect` and handlers

**The problem in `dashboard/page.js`:**
```js
// ❌ API call logic in component — violates the pattern
const fetchResumes = async (userProfile) => {
  const resumesResponse = await apiClient("/api/resumes");
  ...
};

const handleGenerateResume = async () => {
  const generateResponse = await apiClient("/api/generate-content", { ... });
  ...
};
```

**Recommendation:** Extract these into hooks:
```js
// hooks/useResumes.js
export function useResumes() {
  const apiClient = useApiClient();
  const fetchResumes = useCallback(async () => {
    const res = await apiClient(API_ENDPOINTS.RESUMES.LIST);
    return res.json();
  }, [apiClient]);
  return { fetchResumes };
}
```

> [!NOTE]
> The best practice doc mentions React Query for server/async state. You're not using it, which means no automatic caching, background refetching, or deduplication. Worth considering if the app grows.

---

## 5. HTTP Client — ✅ Good

**What the spec says:** One configured instance handling auth headers and credentials.

**What your project has:** `useApiClient.js` — a minimal, clean hook that attaches `credentials: 'include'` to every request. This is architecturally correct for your HttpOnly-cookie-based auth (no token in localStorage, which is more secure than the spec's example).

---

## 6. Component Rules — ✅ Mostly Good

**What the spec says:** Dumb components = props in/UI out. Smart components call hooks. Use `index.js` barrel exports.

**What your project has:**
- ✅ Components in `src/components/` are generally well-structured (common, layout, preview, etc.)
- ✅ Smart/dumb split respected (e.g., `ResumeList`, `TemplateViewer` receive data via props)
- ❌ **No `index.js` barrel exports** in component folders — imports are done directly to files

**Recommendation:** Add `index.js` in component subfolders:
```js
// components/layout/index.js
export { Navbar } from './Navbar';
export { Footer } from './Footer';
```

---

## 7. State Management — ⚠️ Needs Attention

**What the spec says:**
- Local UI → `useState` ✅
- Server/async state → **React Query** ❌
- Global UI state → **Zustand** ❌

**What your project has:**
- `useState` + `useEffect` for everything including server data
- `AuthContext` for global auth state (Context API, not Zustand)
- No React Query, no Zustand

**The current approach works but has limitations:**
- Auth state fetched on every mount via `AuthContext` — no caching
- Resume list fetched manually with no automatic revalidation
- Loading/error states managed manually in each component

> [!NOTE]
> Not a bug, but this will become painful as the app scales. React Query would eliminate the manual `loading`, `error`, and refetch logic in multiple components.

---

## 8. Styling — ✅ Good

**What the spec says:** Define design tokens in `tailwind.config.js`. Use `cn()` from clsx + tailwind-merge. Use `cva` for variants.

**What your project has:**
- ✅ Tailwind v4 in use
- ✅ Custom CSS classes in `globals.css` (`.glass-card`, etc.)
- ⚠️ No `cn()` utility — conditional classNames written inline
- ⚠️ No `cva` for component variants

**Minor gap** — no `cn()` from `clsx`/`tailwind-merge` for conditional class logic.

---

## 9. Backend Layering — ✅ Good

**What the spec says:** Route → Controller → Service → Model. No business logic in routes.

**What your project has:** Next.js API routes → directly call Services → Models. This is the correct Next.js adaptation (no separate controller layer needed since route handlers are thin).

- ✅ `services/resumeService.js` — clean, well-documented
- ✅ `services/userService.js`, `subscriptionService.js`, etc.
- ✅ `models/` has clean Mongoose schemas
- ✅ `lib/apiPermissionGuard.js` — centralised permission check for API routes

---

## 10. Error Handling — ⚠️ Ad-hoc

**What the spec says:** `AppError` class + centralised error handler middleware.

**What your project has:**
- ❌ No `AppError` class
- ❌ No centralised error response shape
- API routes return `{ error: '...' }` or `{ message: '...' }` inconsistently

**Example inconsistency:**
```js
// Some routes return:
return Response.json({ error: 'Not found' }, { status: 404 });
// Others return:
return Response.json({ message: 'Unauthorized' }, { status: 401 });
```

**Recommendation:** Create `lib/AppError.js` and a `lib/apiResponse.js`:
```js
// lib/apiResponse.js
export const ok = (data, message = 'Success') =>
  Response.json({ success: true, data, message }, { status: 200 });

export const fail = (message, status = 400) =>
  Response.json({ success: false, message }, { status });
```

---

## Priority Action List

| Priority | Action | Effort |
|---|---|---|
| 🔴 High | Create `config/env.js` and remove all direct `process.env` usage | ~1 hour |
| 🟡 Medium | Add `ROUTES` and `API_ENDPOINTS` to `lib/constants.js` | ~30 min |
| 🟡 Medium | Standardise API error response shape (`lib/apiResponse.js`) | ~45 min |
| 🟡 Medium | Extract fetch logic from `dashboard/page.js` into custom hooks | ~1 hour |
| 🟢 Low | Add `index.js` barrel exports to component folders | ~20 min |
| 🟢 Low | Add `cn()` utility from `clsx` + `tailwind-merge` | ~15 min |
| 🟢 Low | Consider React Query for server data caching | Large — plan separately |
