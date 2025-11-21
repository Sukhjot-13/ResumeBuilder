# Suggested Changes & Improvements

## 1. Architecture & Refactoring

- [ ] **TypeScript Migration**: Convert the project to TypeScript for better type safety and developer experience.
- [ ] **Service Layer Pattern**: Continue moving business logic to dedicated services.
- [ ] **Centralized Error Handling**: Implement a custom error class and middleware to handle exceptions consistently.
- [ ] **Environment Variables**: Ensure all secrets are strictly validated on startup.

## 2. User Experience & Features

- [ ] **Usage Dashboard**: Enhance the dashboard to show detailed usage history.
- [ ] **Email Notifications**: Send emails for subscription updates or low credit warnings.

## 3. Best Practices

- [ ] **Rate Limiting**: Use `upstash/ratelimit` or similar to prevent abuse on API routes.
- [ ] **Input Validation**: Use `zod` to validate all incoming API request bodies.
- [ ] **Logging**: Add structured logging for critical actions.
