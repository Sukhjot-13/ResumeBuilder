# Plan: Cover Letter System + Nav Fixes

## Overview

Three workstreams:
1. **Cover letter system** — editor, preview, PDF generation (mirrors resume pattern)
2. **Dashboard checkbox** — option to save/discard resume when generating with a job description
3. **Nav bar updates** — add Automation + Cover Letters links

---

## Workstream 1: Cover Letter System

### New files needed

| File | Purpose |
|------|---------|
| `src/lib/coverLetterFields.js` | Cover letter data schema — `recipient`, `companyName`, `jobTitle`, `body`, `salutation`, `closing` |
| `src/models/CoverLetter.js` | Mongoose model — `userId`, `content` (CL fields), `metadata`, `createdAt` |
| `src/lib/coverLetter-generator.js` | AI generation — builds prompt using master resume + job description, calls `callAI()` |
| `src/app/api/generate-cover-letter/route.js` | POST — auth + rate-limit + call generator + save to DB |
| `src/app/api/cover-letters/route.js` | GET (list user's cover letters), POST (save manual) |
| `src/app/api/cover-letters/[id]/route.js` | GET/DELETE/PATCH single cover letter |
| `src/components/preview/CoverLetterDisplayView.js` | HTML text preview of cover letter |
| `src/components/preview/CoverLetterPreview.js` | Tabbed preview: Text View / PDF View (mirrors `ResumePreview.js`) |
| `src/components/cover-letter/CoverLetterTemplate.js` | `@react-pdf/renderer` PDF template for cover letter |
| `src/app/cover-letters/page.js` | Cover letter list + "New Cover Letter" button |
| `src/app/cover-letters/[id]/page.js` | Cover letter editor (view, regenerate, delete) |

### Modified files

| File | Change |
|------|--------|
| `src/lib/constants.js` | Add `GENERATE_COVER_LETTER`, `VIEW_COVER_LETTERS`, `DELETE_COVER_LETTER` permissions + routes/endpoints |
| `src/lib/pdf-generator.js` | Add support for `CoverLetterTemplate` alongside resume templates |
| `src/app/api/render-pdf-react/route.js` | Accept `type: "cover-letter"` param to route to the correct template |
| `src/components/layout/Navbar.js` | Add "Cover Letters" link (gated by `VIEW_COVER_LETTERS`) |

### How it mirrors the resume pattern

The resume flow is: **dashboard page (JD input)** → **POST /api/generate-content** → **AI generates** → **saves to Resume model** → **TemplateViewer shows preview** → **PDF via @react-pdf/renderer**

The cover letter flow will be: **dedicated page (JD + recipient)** → **POST /api/generate-cover-letter** → **AI generates** → **saves to CoverLetter model** → **CoverLetterPreview shows text view** → **PDF via same @react-pdf/renderer pipeline**

### Cover Letter PDF

Single template (not 5 like resumes) — letter format: sender info, date, recipient info, salutation, body paragraphs, closing, signature. Uses `@react-pdf/renderer` same as resume templates.

### Permissions to add

```
GENERATE_COVER_LETTER: 'generate_cover_letter',
VIEW_COVER_LETTERS: 'view_cover_letters',
DELETE_COVER_LETTER: 'delete_cover_letter',
```

Assign to ADMIN, DEVELOPER, SUBSCRIBER roles. Free users get `GENERATE_COVER_LETTER` (same treatment as resume generation — limited by credits).

---

## Workstream 2: Dashboard Save Toggle

### Modified: `src/app/dashboard/page.js`

**What:** Add a toggle checkbox below the SpecialInstructionsInput: **"Save this resume"** (default: checked).

**Behavior:**
- **Checked (default)**: Existing behavior — `createResume()` runs after generation, resume appears in the history list below.
- **Unchecked**: Skip `createResume()` call. Resume preview still shows, but it's not persisted.

**Why:** Users sometimes want to try generating against a JD without cluttering their resume history.

### Modified: `src/app/api/generate-content/route.js`

Accept a `{ save: false }` flag in the body. When false, generate and return but don't persist to DB.

---

## Workstream 3: Nav Bar Updates

### Modified: `src/components/layout/Navbar.js`

Add two new links in the authenticated desktop nav (between "AI Edit" and "Admin"):

```
{user && checkPermission(user, PERMISSIONS.VIEW_AUTOMATION) && (
  <Link href="/automation">Automation</Link>
)}

{user && checkPermission(user, PERMISSIONS.VIEW_COVER_LETTERS) && (
  <Link href="/cover-letters">Cover Letters</Link>
)}
```

Same in the mobile menu.

---

## Order of implementation

1. Constants (permissions, routes, endpoints)
2. Cover letter schema + model (`coverLetterFields.js`, `CoverLetter.js`)
3. Cover letter AI generator (`coverLetter-generator.js`)
4. API routes (`generate-cover-letter`, `cover-letters`, `cover-letters/[id]`)
5. Cover letter components (display, preview, PDF template)
6. PDF generator update (support cover letter type)
7. Cover letter pages (`/cover-letters`, `/cover-letters/[id]`)
8. Dashboard save toggle
9. Nav bar links
