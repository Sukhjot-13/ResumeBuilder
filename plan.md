# Plan: Nav Bar Restructure + Dashboard Hub

## Goal

Restructure navigation to mirror automation's sub-nav pattern. The main navbar gets simplified; a secondary nav bar handles section-level navigation for resumes, cover letters, and AI edit. The dashboard becomes a hub page.

## URL Structure

```
/resumes/dashboard     ← Hub page (stats, recent resumes, recent cover letters)
/resumes               ← Resume builder (current /dashboard content)
/cover-letters          ← Cover letter list (unchanged URL)
/cover-letters/[id]     ← Cover letter detail (unchanged URL)
/ai-edit                ← AI edit page (unchanged URL)
```

## What Changes

### 1. Simplify Main Navbar (`src/components/layout/Navbar.js`)

Remove section-level links: Dashboard, Cover Letters, AI Edit.
Keep only: Logo, Automation, Admin, Profile, Credits, Logout.
These section links are handled by the sub-nav now.

### 2. Create Route Group `app/(app)/layout.js` — Sub-Nav Bar

Same pattern as `automation/layout.js`:
- Slim bar below the main header with a section label and nav items
- Active link highlighted based on current pathname

Sub-nav items:

| Label | Href | Permission |
|-------|------|------------|
| Dashboard | `/resumes/dashboard` | VIEW_OWN_RESUMES |
| Resumes | `/resumes` | VIEW_OWN_RESUMES |
| Cover Letters | `/cover-letters` | VIEW_COVER_LETTERS |
| AI Edit | `/ai-edit` | ACCESS_AI_EDIT_PAGE |

### 3. New / Hub Pages

**`app/(app)/resumes/dashboard/page.js`** — Hub page:
- Stats row: total resumes count, total cover letters count, credits remaining
- Recent resumes (last 5, clickable cards)
- Recent cover letters (last 5, clickable cards)
- Quick action buttons: "New Resume" → `/resumes`, "New Cover Letter" → `/cover-letters/new`

**`app/(app)/resumes/page.js`** — Current dashboard content moved here:
- Job description input
- Special instructions input
- Template preview
- Resume list (existing ResumeList component)

### 4. Move Existing Pages into Route Group

| Current Path | New Path |
|---|---|
| `app/dashboard/page.js` | `app/(app)/resumes/page.js` (with content) |
| `app/cover-letters/page.js` | `app/(app)/cover-letters/page.js` |
| `app/cover-letters/[id]/page.js` | `app/(app)/cover-letters/[id]/page.js` |
| `app/ai-edit/page.js` | `app/(app)/ai-edit/page.js` |

Old files deleted after moving.

### 5. Update Navbar Links

- Main Navbar: "Dashboard" link → `/resumes/dashboard`
- Hub page "New Resume" button → `/resumes`
- Cover letter "New" → `/cover-letters/new`

## Implementation Order

1. Create `app/(app)/layout.js` (sub-nav)
2. Create `app/(app)/resumes/dashboard/page.js` (hub)
3. Move `app/dashboard/page.js` → `app/(app)/resumes/page.js` (update imports)
4. Move `app/cover-letters/` → `app/(app)/cover-letters/`
5. Move `app/ai-edit/page.js` → `app/(app)/ai-edit/page.js`
6. Delete old files
7. Simplify `Navbar.js`
8. Update any cross-references (links in dashboard, cover-letters, ai-edit pages)
