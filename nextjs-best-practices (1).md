# Next.js Best Practices (JavaScript)

Rules to follow for every project. Goal: 1 change → 1 file → reflected everywhere.

---

## Project Structure

Use feature-based folders, not type-based.

```
app/                        # Next.js pages only
features/
  users/
    components/
    hooks/
    services/
    store/
    utils/
components/                 # Globally reused UI (Button, Modal)
lib/                        # Third-party setup (axios instance, prisma, etc.)
services/                   # Global API service functions
hooks/                      # Global reusable hooks
constants/                  # All magic strings and values
config/                     # Routes, nav, feature flags
utils/                      # Pure helper functions
styles/
server/                     # Node.js backend (if separate)
  routes/
  controllers/
  services/
  middlewares/
  models/
```

Rule: one feature = one folder. If you only touch one feature, you only open `features/<name>/`.

---

## Constants — Single Source of Truth

Never write raw strings, URLs, or numbers inline. Always define them here.

```js
// constants/index.js

export const ROUTES = {
  HOME: "/",
  LOGIN: "/auth/login",
  DASHBOARD: "/dashboard",
  USER_DETAIL: (id) => `/dashboard/users/${id}`,
}

export const API_ENDPOINTS = {
  AUTH: { LOGIN: "/api/auth/login", ME: "/api/auth/me" },
  USERS: {
    LIST: "/api/users",
    BY_ID: (id) => `/api/users/${id}`,
  },
}

export const QUERY_KEYS = {
  USERS: "users",
  USER_BY_ID: (id) => ["users", id],
}
```

---

## Environment Variables

Never use `process.env.X` directly in the codebase. Wrap all env vars in one file.

```js
// config/env.js
const env = {
  apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL,
  authSecret: process.env.AUTH_SECRET,
  isProduction: process.env.NODE_ENV === "production",
}

export default env
```

Usage: `import env from "@/config/env"` — change the var name in one place.

---

## API Layer

Three layers: **service → hook → component**. Components never call fetch/axios directly.

```js
// features/users/services/userService.js
import apiClient from "@/lib/axios"
import { API_ENDPOINTS } from "@/constants"

export const userService = {
  getAll: () => apiClient.get(API_ENDPOINTS.USERS.LIST),
  getById: (id) => apiClient.get(API_ENDPOINTS.USERS.BY_ID(id)),
  create: (data) => apiClient.post(API_ENDPOINTS.USERS.LIST, data),
  delete: (id) => apiClient.delete(API_ENDPOINTS.USERS.BY_ID(id)),
}
```

```js
// features/users/hooks/useUsers.js
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { userService } from "../services/userService"
import { QUERY_KEYS } from "@/constants"

export const useUsers = () =>
  useQuery({ queryKey: [QUERY_KEYS.USERS], queryFn: userService.getAll })

export const useCreateUser = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: userService.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEYS.USERS] }),
  })
}
```

Components just call `useUsers()` — no fetch logic inside them.

---

## HTTP Client

One configured instance. All auth headers, base URLs, and error handling live here.

```js
// lib/axios.js
import axios from "axios"
import env from "@/config/env"
import { ROUTES } from "@/constants"

const apiClient = axios.create({ baseURL: env.apiBaseUrl, withCredentials: true })

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("token")
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

apiClient.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) window.location.href = ROUTES.LOGIN
    return Promise.reject(error)
  }
)

export default apiClient
```

---

## Component Rules

- **Dumb components** — only props in, UI out. No fetching.
- **Smart components (containers)** — call hooks, pass data down.
- Use `index.js` barrel exports in every component folder.

```js
// features/users/components/index.js
export { UserCard } from "./UserCard"
export { UserForm } from "./UserForm"
export { UserListContainer } from "./UserListContainer"
```

---

## State Management

- Local UI state → `useState`
- Server/async state → **React Query**
- Global UI state → **Zustand**

```js
// features/auth/store/authStore.js
import { create } from "zustand"
import { persist } from "zustand/middleware"

export const useAuthStore = create()(
  persist(
    (set) => ({
      user: null,
      token: null,
      setAuth: (user, token) => set({ user, token }),
      clearAuth: () => set({ user: null, token: null }),
    }),
    { name: "auth-storage" }
  )
)
```

Don't store server data in Zustand — that belongs in React Query.

---

## Styling

Define all design tokens in `tailwind.config.js`. Never use raw hex values or magic numbers in classNames.

```js
// tailwind.config.js
export default {
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: "#4F46E5", hover: "#4338CA" },
        danger:  { DEFAULT: "#DC2626" },
      },
    },
  },
}
```

Use `cn()` from `clsx` + `tailwind-merge` for conditional classes. Use `cva` for component variants.

---

## Node.js Backend Layering

Every request flows: **route → controller → service → model**. Never put business logic in routes or controllers.

```
routes/       — maps URL + method to controller function only
controllers/  — handles req/res, calls service, returns response
services/     — all business logic, no req/res here
models/       — DB access only
middlewares/  — auth, validation, logging
```

Centralize response shape:

```js
// utils/response.js
export const ok = (res, data, message = "Success") =>
  res.status(200).json({ success: true, data, message })

export const notFound = (res, message = "Not found") =>
  res.status(404).json({ success: false, data: null, message })
```

---

## Error Handling

```js
// lib/AppError.js
export class AppError extends Error {
  constructor(message, statusCode = 500, code) {
    super(message)
    this.statusCode = statusCode
    this.code = code
  }
}

// middlewares/errorHandler.js — register last in Express
export const errorHandler = (err, req, res, next) => {
  if (err instanceof AppError)
    return res.status(err.statusCode).json({ success: false, message: err.message })
  res.status(500).json({ success: false, message: "Internal server error" })
}
```

---

## Auth Middleware

```js
// middlewares/auth.js
import jwt from "jsonwebtoken"
import env from "@/config/env"
import { AppError } from "../lib/AppError"

export const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1]
  if (!token) return next(new AppError("Unauthorized", 401))
  try {
    req.user = jwt.verify(token, env.authSecret)
    next()
  } catch {
    next(new AppError("Invalid token", 401))
  }
}

export const authorize = (...roles) => (req, res, next) =>
  roles.includes(req.user.role) ? next() : next(new AppError("Forbidden", 403))
```

---

## Where Everything Lives

| Thing | File |
|---|---|
| Route strings | `constants/index.js` → `ROUTES` |
| API endpoint strings | `constants/index.js` → `API_ENDPOINTS` |
| React Query keys | `constants/index.js` → `QUERY_KEYS` |
| Env variables | `config/env.js` |
| HTTP client | `lib/axios.js` |
| API call functions | `features/<name>/services/` |
| React Query hooks | `features/<name>/hooks/` |
| Global UI state | `features/<name>/store/` |
| Design tokens | `tailwind.config.js` |
| Pure utils | `utils/` |
| Business logic (backend) | `server/services/` |
| Response shape (backend) | `server/utils/response.js` |
| Error class | `lib/AppError.js` |
