# Plan: Tools & Automation Nav Restructure

## Concept

Main navbar has two section links: **Tools** and **Automation**. Each section has its own sub-navigation bar.

## Main Navbar

`Dashboard` → renamed/linked to `/tools`
`Cover Letters` → removed (handled by Tools sub-nav)
`AI Edit` → removed (handled by Tools sub-nav)
Keep: Logo → `/tools`, Automation, Admin, Profile, Credits, Logout

## Tools Sub-Nav

New layout at `app/(tools)/layout.js` — bar below main header:

```
Tools  |  Dashboard  |  Resumes  |  Cover Letters  |  AI Edit
```

URLs:
- `/tools` — hub page (stats, resumes, cover letters)
- `/resumes` — resume builder (current dashboard content)
- `/cover-letters` — cover letter list
- `/cover-letters/[id]` — cover letter detail
- `/ai-edit` — AI edit page

## Files to Create

| File | Purpose |
|------|---------|
| `app/(tools)/layout.js` | Tools sub-nav bar |
| `app/(tools)/page.js` | Hub page at `/tools` |

## Files to Move

| From | To |
|------|-----|
| `app/dashboard/page.js` | `app/(tools)/resumes/page.js` |
| `app/cover-letters/page.js` | `app/(tools)/cover-letters/page.js` |
| `app/cover-letters/[id]/page.js` | `app/(tools)/cover-letters/[id]/page.js` |
| `app/ai-edit/page.js` | `app/(tools)/ai-edit/page.js` |

## Files to Modify

| File | Change |
|------|--------|
| `Navbar.js` | Replace Dashboard/CoverLetters/AIEdit links with single Tools link |
| Moved pages | Update internal link references |

## Hub Page (`/tools`)

Dashboard-style overview: stats row (resume count, cover letter count, credits), recent resumes list, recent cover letters list, quick action buttons.
