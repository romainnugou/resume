# CLAUDE.md

Static, markdown-driven personal resume site. Astro + TypeScript + Tailwind CSS + pnpm. No backend, no CMS — content lives in `resume.md` (and optional `resume.<locale>.md` files), hand-edited and git-tracked. Deployed to Cloudflare Pages.

Full design rationale: `docs/superpowers/specs/2026-09-09-resume-app-design.md`.

## Architecture

- `src/lib/parseResume.ts` — pure functions, no Astro/DOM dependency. Parses frontmatter (gray-matter) and markdown body into a typed `ParsedResume` (sections, timeline entries, links, photo, contact fields). All parsing happens at build time; nothing runs client-side.
- `src/lib/discoverResumeFiles.ts` — finds `resume.md` + any `resume.<locale>.md` at the project root. Deliberately independent from `parseResume.ts` (reads frontmatter itself via gray-matter) rather than sharing code.
- `src/components/` — presentational only, no business logic. `ResumePage.astro` is the single composition point both routes render through. `Nav.astro` owns `LanguageSwitcher.astro` and `ThemeToggle.astro` internally (rendered once each — never duplicate them for a "desktop version"/"mobile version", see below) and is passed into `ResumeLayout.astro` via the named `nav` slot so it renders full-width, outside the `max-w-3xl` content column.
- `src/pages/index.astro` (default locale) and `src/pages/[locale]/index.astro` (via `getStaticPaths`) each independently call `discoverResumeFiles`/`parseResumeMarkdown`. **This duplication is intentional** — build-time only, cheap, avoids a shared-cache abstraction for two static pages. Don't "fix" it.

## Conventions that look like bugs but aren't

- `lang` is optional in `resume.md`'s frontmatter (defaults to `en`) *unless* another `resume.<locale>.md` file exists, in which case it's required and the build fails loudly if missing. This is by design (see spec's Internationalization section) — don't make `lang` always-required or always-optional.
- `links`/`photo` in frontmatter use markdown syntax (`"[Label](url)"`, `"![alt](url)"`), never a YAML object shape — this was a deliberate correction during design, keep it that way.
- Malformed link/photo strings, or a missing `resume.md`, throw at build time with a message naming the problem. This is correct behavior (dev-time only, no silent fallback), not something to soften.
- A timeline section (one with `### Title | Org | Dates` entries) can have prelude text before the first entry — it renders as an intro paragraph (`introHtml` on `TimelineSectionData`). Don't reintroduce the earlier bug where this text was silently dropped.
- The `Org` piece of a timeline entry can itself be a markdown link (`[Acme Corp](https://acme.com)`), parsed non-throwing via `tryParseLink` — unlike `parseLinkString`, a non-matching string is not an error, it's just plain org text. Don't make this throw.
- `Nav.astro` renders `<LanguageSwitcher>`/`<ThemeToggle>` exactly once and uses `md:hidden`/`hidden md:flex` purely to show/hide the *section links*, never to render two copies of the switcher/toggle for desktop vs. mobile — both components rely on DOM `id`s (`theme-toggle`, `nav-toggle`) for their inline scripts, so a duplicate would silently break the click handler on one of the copies.
- The timeline connector line between entries is drawn per-entry (`TimelineEntry.astro`, a `border-l-2` div with `bottom-[-2rem]`) rather than one line spanning the whole section — this is what keeps it starting exactly at the first dot (no stray line above it) and stopping at the last one. The `-2rem` matches `TimelineSection.astro`'s `space-y-8` gap; if that gap value changes, update this offset too.
- The timeline dot's fill uses `bg-*` (background-color), which browsers suppress by default when printing — it carries `print:[print-color-adjust:exact]` (plus the `-webkit-` variant) to force it to print. Don't remove that when touching the dot's styling, or it disappears in print/PDF output again.

## Things intentionally not done (don't add without discussion)

- No `@tailwindcss/typography` — rendered markdown (summary, prose sections, timeline intro/entry bodies) uses the small `.markdown-content` component class in `src/styles/global.css` (an `@layer components` `@apply` block) for list/link styling, not a typography plugin.
- No component tests — components are presentational with no branching logic worth testing in isolation. Only `src/lib/*.ts` has unit tests (Vitest).
- No build-time PDF generation — PDF export is browser print-to-PDF only (`print:hidden`/`print:bg-white print:text-black` utility classes handle the print-specific styling).
- No CMS/editing UI — `resume.md` is edited by hand.

## Commands

```bash
pnpm dev     # preview at localhost:4321
pnpm test    # unit tests for src/lib/
pnpm build   # outputs to dist/
```
