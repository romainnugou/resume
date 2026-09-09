# Resume/CV App — v0 Design

## Purpose

A static, developer-friendly resume site generated from one or more
hand-edited markdown files (`resume.md`, optionally per-language variants).
No backend, no CMS, no editing UI. Clone the repo, edit the markdown,
deploy. v0 targets one person's resume (the author's).

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
- Optional multilingual support: additional `resume.<locale>.md` files,
  zero config/overhead when only one resume file exists

## Non-goals (v0)

- No editing UI / CMS — `resume.md` is edited by hand in a text editor
- No multi-user support (multiple *languages* of one person's resume are
  supported — see Internationalization)
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
photo: "![Romain Nugou](./photo.jpg)"
links:
  - "[GitHub](https://github.com/romainnugou)"
  - "[Email](mailto:hello@romain.ng)"
---

Building reliable systems for **10+ years**, focused on developer tools.

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
- Frontmatter (`name`, `title`, `links`, optionally `photo`, etc.) maps to
  the header component. `links` is a list of markdown link strings
  (`"[Label](url)"`), parsed for label + url; `photo` is a markdown image
  string (`"![alt](url)"`), parsed for alt text + url — both use native
  markdown syntax rather than a bespoke YAML object shape. Any field not
  explicitly known is passed through where reasonably possible, but the
  header component only renders fields it understands — this is not a
  fully generic frontmatter renderer.
- Any body content before the first `## Heading` is the **summary** — a
  plain markdown paragraph (or few), rendered like any other section
  content, no frontmatter field needed.
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

## Internationalization

- **File convention**: `resume.md` (no suffix) is always the default
  language. Additional languages are separate, fully independent files:
  `resume.<locale>.md` (e.g. `resume.fr.md`). Each file has its own
  frontmatter, summary, and sections — no per-line/per-field language
  markers, no shared structure enforced between them.
- **Single-language case (default)**: only `resume.md` exists → the site
  behaves exactly as described elsewhere in this doc. No routing changes,
  no language switcher rendered, no i18n code path engaged. `lang` in
  frontmatter is optional here and defaults to `en` (used only for the
  `<html lang>` attribute; nothing else depends on it being correct).
- **Multi-language case**: if any `resume.<locale>.md` files exist
  alongside `resume.md`, the build enables Astro's built-in i18n routing.
  `resume.md` serves at `/`, each additional file at `/<locale>/` (e.g.
  `/fr/` for `resume.fr.md`). A small language switcher appears in the
  header, only rendered when more than one resume file exists.
- **`lang` field becomes required** on `resume.md`'s frontmatter as soon
  as any additional locale file exists (needed for a correct `<html
  lang>`, hreflang tags, and switcher labels) — the build fails with a
  clear error naming the missing field if it's absent in that case. For
  additional files, the locale code comes from the filename suffix
  (`resume.fr.md` → `fr`), not a frontmatter field.
- Each language's content is parsed independently through the same
  pipeline described below — there is no shared/merged parsing logic
  between languages.

## Architecture

Single Astro page template (`src/pages/index.astro`, plus Astro's i18n
routing generating `/<locale>/` variants when needed). At build time:

1. `lib/parseResume.ts` discovers resume files in the project root:
   `resume.md` (default) and any `resume.<locale>.md` files.
2. For each file: `gray-matter` extracts frontmatter → header data; each
   `links` entry (a markdown link string) and the `photo` field (a
   markdown image string) are parsed into `{ label, url }` / `{ alt, url }`
   with a small regex (`marked`'s inline lexer is overkill for a single
   link/image per string).
3. Any body content before the first `## ` heading is captured as the
   summary and rendered via `marked`. The rest of the body is split into
   sections on `^## `.
4. Each section's body is further split into timeline entries on `^### `
   (if any exist); each entry's remaining text is split on `|` for
   title/org/dates, and its trailing prose is rendered via `marked`.
5. The result is a typed `ResumeData` object per file (frontmatter +
   summary HTML + ordered sections, each either `{ type: 'timeline',
   entries }` or `{ type: 'prose', html }`, plus its resolved `lang`),
   passed into Astro components. When more than one file was discovered,
   the list of available locales is passed to the language switcher.

No runtime parsing — everything above happens at build time. If
`resume.md` is missing, frontmatter fails to parse, or `lang` is missing
from `resume.md` while additional locale files exist, the build fails
with a clear error (dev-time only; no user-facing runtime path hits
this).

## Components

- `src/pages/index.astro` — page shell; sets `<title>`, meta description,
  and Open Graph tags from frontmatter/summary (name, title, summary text
  stripped of markdown if present)
- `src/components/Header.astro` — name, title, photo, external links
  (icons, `target="_blank" rel="noopener"`), and summary paragraph
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
- `src/components/LanguageSwitcher.astro` — links to each locale's root
  path (e.g. `/`, `/fr/`); only rendered when more than one resume file
  was discovered at build time; `class="print:hidden"`

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
- `resume.md` missing `lang` while a `resume.<locale>.md` file exists:
  build fails with a clear message naming the missing field.
- Section with zero timeline entries: renders as prose, not an empty
  timeline.
- Timeline entry with a malformed or partial `Title | Org | Dates` line:
  still renders, missing pieces shown as empty rather than throwing.

## Testing

The only non-trivial logic in this app is the markdown parser
(`lib/parseResume.ts`). It gets one small test file covering:
- frontmatter extraction
- link string parsing (`"[Label](url)"` → `{ label, url }`)
- photo string parsing (`"![alt](url)"` → `{ alt, url }`)
- summary extraction (body content before the first `## `)
- section splitting (`## `)
- timeline entry detection and splitting (`### Title | Org | Dates`)
- a section with no entries falling back to prose
- an entry with a missing piece (e.g. no dates) not throwing
- resume file discovery: only `resume.md` present → no locales list; with
  `resume.fr.md` also present → both discovered and locale-tagged correctly
- missing `lang` on `resume.md` throwing only when another locale file
  exists, not when it's the only file

No other test coverage is planned for v0 — components are presentational
with no branching logic worth testing in isolation.

## Deployment / scaffolding

- Project has its own git repo (this repo), matching the other
  `__perso/projects/*` projects.
- README covers: clone → `pnpm install` → edit `resume.md` → `pnpm dev` to
  preview → `pnpm build` → deploy to Cloudflare Pages.
- No CI for v0.

## Open questions / future (explicitly out of scope for v0)

- Multiple resume *variants* for the same language (e.g. a shorter
  version tailored to a specific job application) — not the same as
  multilingual support, which is in scope
- Build-time PDF artifact generation
- CMS or in-browser editing
