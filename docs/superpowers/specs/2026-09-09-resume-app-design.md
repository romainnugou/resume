# Resume/CV App — v0 Design

## Purpose

A static, developer-friendly resume site generated from a single hand-edited
`resume.md` file. No backend, no CMS, no editing UI. Clone the repo, edit the
markdown, deploy. v0 targets one person's resume (the author's).

## Goals

- Clean, typography-focused, responsive (mobile-first) resume page
- Content lives entirely in `resume.md`, hand-edited, git-tracked
- Flexible structure — not locked to a rigid schema
- Timeline-style layout for experience/education-like sections
- Print/PDF-friendly (browser print-to-PDF), nav hidden on print
- In-page navigation to jump between sections
- Dark/light mode: system preference by default, manual toggle, persisted
- External links (contact, socials) open safely in new tabs
- Metadata + Open Graph tags for link previews
- Static generation, deployed to Cloudflare Pages, no server/backend

## Non-goals (v0)

- No editing UI / CMS — `resume.md` is edited by hand in a text editor
- No multi-resume / multi-user support
- No build-time PDF generation — PDF export is browser print-to-PDF only
- No backend, database, or API

## Stack

- **Astro** (static site generator) + **TypeScript** + **Tailwind CSS**
- **pnpm** as package manager
- **gray-matter** — frontmatter parsing
- **marked** — markdown-to-HTML for prose within sections/entries
- Deploy target: Cloudflare Pages

## Content format (`resume.md`)

YAML frontmatter for the header, then plain markdown sections:

```md
---
name: Romain Nugou
title: Software Engineer
email: hello@romain.ng
links:
  - { label: GitHub, url: https://github.com/... }
---

## Experience

### Senior Engineer | Acme Corp | 2022 - Present
Did great things.

### Engineer | Beta Inc | 2019 - 2022
Did other things.

## Education

### MSc Computer Science | Some University | 2015 - 2019

## Languages

- French (native)
- English (fluent)
```

Rules:
- Frontmatter (`name`, `title`, `email`, `links`, optionally `summary`,
  `photo`, etc.) maps to the header component. Any field not explicitly
  known is passed through where reasonably possible, but the header
  component only renders fields it understands — this is not a fully
  generic frontmatter renderer.
- Each `## Heading` becomes a page section, in file order. The heading text
  becomes both the display title and the nav anchor slug.
- Within a section, each `### Title | Org | Dates` line starts a **timeline
  entry**; everything after it until the next `###` or `##` is that entry's
  body, rendered as markdown prose.
- A section with no `###` entries renders its body as plain markdown
  (prose/lists) — no timeline scaffolding is forced onto it. This is how
  "Languages", "Skills", "About", etc. stay simple.
- The `Title | Org | Dates` pattern is split on `|`; missing pieces (e.g. no
  dates) are treated as empty strings, not errors — the entry still renders.

## Architecture

Single Astro page (`src/pages/index.astro`). At build time:

1. `lib/parseResume.ts` reads `resume.md` from the project root.
2. `gray-matter` extracts frontmatter → header data.
3. The remaining markdown body is split into sections on `^## `.
4. Each section's body is further split into timeline entries on `^### `
   (if any exist); each entry's remaining text is split on `|` for
   title/org/dates, and its trailing prose is rendered via `marked`.
5. The result is a single typed `ResumeData` object (frontmatter + ordered
   sections, each either `{ type: 'timeline', entries }` or
   `{ type: 'prose', html }`), passed into Astro components.

No runtime parsing — everything above happens at build time. If
`resume.md` is missing or frontmatter fails to parse, the build fails with
a clear error (dev-time only; no user-facing runtime path hits this).

## Components

- `src/pages/index.astro` — page shell; sets `<title>`, meta description,
  and Open Graph tags from frontmatter (name, title, summary if present)
- `src/components/Header.astro` — name, title, contact info, external
  links (icons, `target="_blank" rel="noopener"`)
- `src/components/Nav.astro` — in-page nav generated from the section
  list, anchor links to `#<section-slug>`, `class="print:hidden"`
- `src/components/Section.astro` — generic section wrapper (heading +
  content) for `prose`-type sections
- `src/components/TimelineSection.astro` + `TimelineEntry.astro` —
  vertical timeline rail (CSS-only) for `timeline`-type sections, each
  entry showing title/org/dates + rendered prose body
- `src/components/ThemeToggle.astro` — toggle button + localStorage
  persistence; a small inline `<script>` in `<head>` sets the theme class
  before first paint to avoid flash-of-wrong-theme

## Styling

- Tailwind CSS, mobile-first breakpoints
- Dark mode via Tailwind's `dark:` variant, class-based (`darkMode:
  'class'`), driven by the pre-paint script + toggle
- Print styles via Tailwind's `print:` variant: hide `Nav` and
  `ThemeToggle`, adjust spacing/colors for paper, ensure timeline layout
  degrades sensibly on a printed page

## Error handling & edge cases

- Missing/unreadable `resume.md`, or unparseable frontmatter: build fails
  with a clear message naming the file. No silent fallback.
- Section with zero timeline entries: renders as prose, not an empty
  timeline.
- Timeline entry with a malformed or partial `Title | Org | Dates` line:
  still renders, missing pieces shown as empty rather than throwing.

## Testing

The only non-trivial logic in this app is the markdown parser
(`lib/parseResume.ts`). It gets one small test file covering:
- frontmatter extraction
- section splitting (`## `)
- timeline entry detection and splitting (`### Title | Org | Dates`)
- a section with no entries falling back to prose
- an entry with a missing piece (e.g. no dates) not throwing

No other test coverage is planned for v0 — components are presentational
with no branching logic worth testing in isolation.

## Deployment / scaffolding

- Project has its own git repo (this repo), matching the other
  `__perso/projects/*` projects.
- README covers: clone → `pnpm install` → edit `resume.md` → `pnpm dev` to
  preview → `pnpm build` → deploy to Cloudflare Pages.
- No CI for v0.

## Open questions / future (explicitly out of scope for v0)

- Multiple resumes / variants from one repo
- Build-time PDF artifact generation
- CMS or in-browser editing
