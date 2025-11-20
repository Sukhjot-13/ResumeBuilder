# Suggested Changes & Improvements

This document outlines recommended changes and improvements for the ATS-Friendly Resume Builder project.

## High Priority

- [ ] **TypeScript Migration**: Migrating to TypeScript will improve code reliability and developer experience by adding static type checking.
- [ ] **Unit & Integration Tests**: Implement a testing framework (e.g., Jest, Vitest) to ensure code stability and prevent regressions.
- [ ] **Rate Limiting**: Implement rate limiting on sensitive endpoints (OTP generation, login) to prevent abuse.
- [ ] **Error Handling**: Centralize error handling with a custom middleware or utility to ensure consistent API responses.

## Medium Priority

- [ ] **Email Service Abstraction**: Create a dedicated service for email sending to decouple it from the API routes and allow for easier provider switching.
- [ ] **Input Validation**: Use a library like `zod` or `joi` for robust input validation in API routes.
- [ ] **Logging**: Implement structured logging (e.g., Pino) for better observability in production.

## Low Priority

- [ ] **UI/UX Polish**: Further refine the UI with more animations and responsive design tweaks.
- [ ] **Performance Optimization**: Optimize image loading and bundle size.
- [ ] **Accessibility**: Ensure the application meets WCAG accessibility standards.
