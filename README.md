# ATS-Friendly Resume Builder

## Project Overview

This project is a web-based, AI-powered resume builder designed to help users create and tailor their resumes to be friendly for Applicant Tracking Systems (ATS). Users can create a profile, upload their existing resume to be parsed, and then generate new resumes tailored to specific job descriptions. The application uses a passwordless, OTP-based authentication system for security and convenience. The backend is built with Next.js API routes and uses MongoDB for data storage. The AI features are powered by Google's Gemini API.

## Features

- **Passwordless Authentication**: Secure OTP-based login system using email.
- **Resume Parsing**: Automatically parse `.pdf` and `.docx` resumes to populate the user's profile.
- **AI-Powered Content Generation**: Generate resume content tailored to a specific job description.
- **AI-Powered Resume Editing**: Edit the resume using natural language queries.
- **Multiple Resume Templates**: Choose from several HTML-based templates to generate a PDF resume.
- **Resume Management**: Save and manage multiple resume versions.
- **PDF Generation**: Render resumes as PDF files for downloading.

## Technologies Used

- **Frontend**: Next.js, React, Tailwind CSS
- **Backend**: Next.js API Routes, Node.js
- **Database**: MongoDB with Mongoose
- **AI**: Google Gemini API (`@google/generative-ai`)
- **Authentication**: `jose` for JWT, `crypto` for hashing
- **PDF/Document Processing**: `puppeteer` for PDF generation, `unpdf` for PDF text extraction, `mammoth` for DOCX text extraction
- **Email**: Brevo (`@getbrevo/brevo`) for sending OTP emails
- **Linting**: ESLint

## Architecture Overview

The application follows a standard Next.js architecture, with the frontend and backend combined in a single project.

- **Frontend**: The frontend is built with React components and Next.js pages. It uses a custom hook (`useApiClient`) to interact with the backend API.
- **Backend**: The backend is implemented using Next.js API Routes. It handles authentication, user profile management, resume operations, and AI-powered features.
- **Database**: A MongoDB database is used to store user data, refresh tokens, and resumes. Mongoose is used as the Object Data Modeling (ODM) library.
- **Services**: The business logic for AI features and PDF rendering is encapsulated in separate service modules.
- **Authentication**: The authentication system is token-based, using a short-lived access token and a long-lived refresh token (HttpOnly, SameSite=Lax). It features secure refresh token rotation with reuse detection to enhance security. The core logic is centralized in `src/lib/auth.js` and orchestrated via the `src/proxy.js` middleware.

## File Structure

The project follows a standard Next.js file structure.

```
/
├── public/               # Static assets
├── src/
│   ├── app/              # Next.js app directory
│   │   ├── actions/      # Server actions
│   │   ├── api/          # API routes
│   │   ├── (pages)/      # Page components
│   │   ├── layout.js     # Root layout
│   │   └── page.js       # Home page
│   ├── components/       # React components
│   ├── hooks/            # Custom React hooks
│   ├── lib/              # Library and utility functions
│   ├── models/           # Mongoose models
│   └── services/         # Business logic services
├── .env.local            # Environment variables
├── next.config.mjs       # Next.js configuration
├── package.json          # Project dependencies and scripts
└── README.md             # This file
```

## Detailed File Descriptions

### Root Directory

- `.gitignore`: Specifies files and directories to be ignored by Git.
- `data.json`: Contains sample resume data, likely for testing and development.
- `eslint.config.mjs`: Configuration file for ESLint.
- `jsconfig.json`: JavaScript configuration file, used here to define path aliases.
- `next.config.mjs`: Configuration file for Next.js.
- `package.json`: Defines project metadata, dependencies, and scripts.
- `postcss.config.mjs`: Configuration file for PostCSS, used with Tailwind CSS.
- `README.md`: This file.

### `src/app`

- `globals.css`: Global CSS styles.
- `layout.js`: The root layout of the application.
- `page.js`: The home page of the application.
- `proxy.js`: A Next.js middleware that acts as the central authentication gatekeeper. It orchestrates authentication and authorization for all protected API routes and pages by using the helper logic from `src/lib/auth.js`.

### `src/app/actions`

- `getTemplates.js`: A server action that retrieves the list of available resume templates from the file system.

### `src/app/api`

#### `auth`

- `otp/route.js`: Handles sending an OTP to the user's email for login.
- `verify-otp/route.js`: Verifies the OTP, generates access and refresh tokens, and creates a new user if one doesn't exist.
- `verify-token/route.js`: Verifies the refresh token and issues a new access token (token rotation).

#### Other API Routes

- `edit-resume-with-ai/route.js`: Handles editing the user's main resume using an AI query.
- `generate-content/route.js`: Generates tailored resume content based on a job description.
- `parse-resume/route.js`: Parses a resume file (`.pdf` or `.docx`) and returns structured JSON data.
- `preview-pdf/route.js`: Generates a PDF preview of a resume.
- `profile/route.js`: Handles reading from and writing to the `data.json` file.
- `render-pdf/route.js`: Renders a resume to a downloadable PDF file.
- `resumes/route.js`: Handles getting all resumes for a user and creating a new resume.
- `resumes/[id]/route.js`: Handles getting and deleting a specific resume.
- `user/profile/route.js`: Handles getting and updating a user's profile data.

### `src/components`

- `diff/DiffViewer.js`: A component to display the difference between two texts.
- `home/JobDescription.js`, `home/JobDescriptionInput.js`: Components for inputting a job description.
- `home/SpecialInstructionsInput.js`: A component for inputting special instructions for the AI.
- `home/TemplateSelector.js`: A dropdown to select a resume template. It dynamically loads the available templates using a server action.
- `preview/ResumeDisplayView.js`: Displays a structured view of the resume data.
- `preview/ResumePreview.js`: A tabbed view for previewing the resume in different formats.
- `preview/TextView.js`: Displays a text/HTML view of the resume.
- `profile/ResumeUpload.js`: A component for uploading a resume file.
- `resume-templates/html-templates/`: A directory containing HTML templates for the resumes.

### `src/hooks`

- `useApiClient.js`: A custom hook that provides an API client with automatic token handling.

### `src/lib`

- `auth.js`: A centralized module containing all core authentication logic. It handles access token verification and secure refresh token rotation with reuse detection. It is used by the `proxy.js` middleware and API routes.
- `mongodb.js`: Handles the connection to the MongoDB database.
- `utils.js`: Contains utility functions, including:
  - `sha256(string)` / `hashToken(string)`: Hashes a string using the SHA256 algorithm.
  - `generateAccessToken(userId)`: Generates a new access token.
  - `generateRefreshToken(userId)`: Generates a new refresh token.
  - `verifyToken(token, tokenType)`: Verifies an access or refresh token.

### `src/models`

- `plan.js`: Mongoose model for a subscription plan.
- `refreshToken.js`: Mongoose model for storing refresh tokens.
- `resume.js`: Mongoose model for storing resume data.
- `resumeMetadata.js`: Mongoose model for storing metadata about generated resumes.
- `user.js`: Mongoose model for user data.

### `src/services`

- `aiResumeEditorService.js`: Service for editing a resume using AI.
- `contentGenerationService.js`: Service for generating tailored resume content.
- `geminiService.js`: A centralized service for interacting with the Google Gemini API. It handles the initialization of the Gemini client.
- `resumeParsingService.js`: Service for parsing resume files.

## Known Issues and Areas for Improvement

- **Improve Error Handling**: The error handling in the API routes is basic. A more robust error handling strategy could be implemented using custom error classes and a middleware to handle errors consistently across the application.
- **Dynamic Template Loading**: <span style="color:green">**RESOLVED**</span> The `TemplateSelector` component now dynamically loads the list of available templates from the server using a server action.

## Future Security Improvements

The following are recommended next steps to further harden the application's security:

- **TypeScript Migration**: The codebase could be progressively migrated to TypeScript. This would provide static type checking, reducing the likelihood of runtime errors and improving developer experience and code maintainability.
- **CSRF Protection**: Implement a robust Cross-Site Request Forgery (CSRF) protection mechanism, such as the double-submit cookie pattern, for all state-changing API endpoints to prevent malicious attacks.
- **Rate Limiting**: Introduce rate limiting on sensitive authentication endpoints, especially login and token refresh, to protect against brute-force and denial-of-service attacks.
- **Structured Logging**: Implement a structured logger (e.g., Pino or Winston) throughout the backend to create parseable, detailed logs for security auditing and easier debugging, ensuring no sensitive data is ever logged.
- **Unit & Integration Testing**: The project currently lacks a testing framework. Adding one (e.g., Jest or Vitest) to create unit and integration tests would significantly improve the reliability and security of the application.

### Authentication System Improvements

- **Stricter Input Validation**: Implement robust validation for `email` and `otp` inputs to ensure they are in the correct format.
- **Rate Limiting**: Introduce rate limiting on the OTP verification endpoint to prevent brute-force attacks.
- **More Secure OTP Generation**: Use a cryptographically secure random number generator (e.g., `crypto.randomInt`) for generating OTPs to enhance security.
- **Enhanced Token Security**: Consider implementing token blacklisting for immediate session revocation and refresh token replay detection to further secure the token-based authentication.
- **Granular Roles and Permissions**: Expand the simple role system into a more granular Role-Based Access Control (RBAC) system to manage user permissions more effectively.
- **CSRF Protection**: Implement a robust CSRF protection mechanism, such as the double-submit cookie pattern, to protect against Cross-Site Request Forgery attacks.
- **Security Headers**: Add more security-related HTTP headers (`Content-Security-Policy`, `Strict-Transport-Security`, etc.) to harden the application against common web vulnerabilities.
- **Improved Logging and Monitoring**: Enhance logging in the authentication routes to provide more detailed information for security auditing and debugging purposes.

## Setup and Running the Project

1.  **Clone the repository:**

    ```bash
    git clone <repository-url>
    cd ats-resume-builder
    ```

2.  **Install dependencies:**

    ```bash
    npm install
    ```

3.  **Set up environment variables:**
    Create a `.env.local` file in the root of the project and add the following environment variables:

    ```
    MONGODB_URI=<your-mongodb-connection-string>
    BREVO_API_KEY=<your-brevo-api-key>
    BREVO_SENDER_EMAIL=<your-brevo-sender-email>
    GEMINI_API_KEY=<your-google-gemini-api-key>
    ACCESS_TOKEN_SECRET=<your-access-token-secret>
    REFRESH_TOKEN_SECRET=<your-refresh-token-secret>
    ```

4.  **Run the development server:**

    ```bash
    npm run dev
    ```

    The application will be available at `http://localhost:3000`.

## Priority roadmap (what to do first)

- Add automated tests + CI (unit tests for services, integration tests for API routes).
- Introduce types (TypeScript) gradually (start with service layer & models).
- Centralize AI handling & response parsing (one aiClient and parseAIResponse utility).
- JSON schema validation for AI outputs (use AJV) to avoid silent parse errors.
- Centralized error handling & custom error types (HttpError, ValidationError).
- Refactor PDF generation into a stable pdfService (puppeteer-core + packaged Chromium options for serverless).
- Improve auth middleware & token rotation into more testable, smaller functions.
- Logging & metrics: structured logs, attach request IDs, instrument key metrics.
- Performance & caching: cache some AI responses, memoize DB connections (already present), add retries/backoff for network calls.
- Developer experience: linting, prettier, consistent file structure, README improvements (done), code owners).
