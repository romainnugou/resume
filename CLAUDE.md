# CLAUDE.md

Static, markdown-driven personal resume site. Astro + TypeScript + Tailwind CSS + pnpm. No backend, no CMS — content lives in `resume.md` (and optional `resume.<locale>.md` files), hand-edited and git-tracked. Deployed to Cloudflare Pages.

Full design rationale: `docs/superpowers/specs/2026-09-09-resume-app-design.md`.

## Architecture

- `src/lib/parseResume.ts` — pure functions, no Astro/DOM dependency. Parses frontmatter (gray-matter) and markdown body into a typed `ParsedResume` (sections, timeline entries, links, photo, contact fields). All parsing happens at build time; nothing runs client-side.
- `src/lib/discoverResumeFiles.ts` — finds `resume.md` + any `resume.<locale>.md` at the project root. Deliberately independent from `parseResume.ts` (reads frontmatter itself via gray-matter) rather than sharing code.
- `src/components/` — presentational only, no business logic. `ResumePage.astro` is the single composition point both routes render through. `Nav.astro` renders TWO separate `<nav>` elements — a mobile top bar (`md:hidden`, hamburger + collapsible section-links panel) and a desktop fixed sidebar (`hidden md:flex`, always expanded) — each with its own `LanguageSwitcher`/`ThemeToggle` instance, since a single shared DOM node can't be both a fixed sidebar and a sticky top bar at once. `Nav.astro` is passed into `ResumeLayout.astro` via the named `nav` slot so it renders full-width/full-height, outside the `max-w-3xl` content column. `ResumeLayout.astro`'s `md:pl-56` (body padding) reserves exactly the desktop sidebar's width (`md:w-56` on the sidebar nav) — change both together.
- `src/pages/index.astro` (default locale) and `src/pages/[locale]/index.astro` (via `getStaticPaths`) each independently call `discoverResumeFiles`/`parseResumeMarkdown`. **This duplication is intentional** — build-time only, cheap, avoids a shared-cache abstraction for two static pages. Don't "fix" it.

## Conventions that look like bugs but aren't

- `lang` is optional in `resume.md`'s frontmatter (defaults to `en`) *unless* another `resume.<locale>.md` file exists, in which case it's required and the build fails loudly if missing. This is by design (see spec's Internationalization section) — don't make `lang` always-required or always-optional.
- `links`/`photo` in frontmatter use markdown syntax (`"[Label](url)"`, `"![alt](url)"`), never a YAML object shape — this was a deliberate correction during design, keep it that way.
- Malformed link/photo strings, or a missing `resume.md`, throw at build time with a message naming the problem. This is correct behavior (dev-time only, no silent fallback), not something to soften.
- A timeline section (one with `### Title | Org | Dates` entries) can have prelude text before the first entry — it renders as an intro paragraph (`introHtml` on `TimelineSectionData`). Don't reintroduce the earlier bug where this text was silently dropped.
- The `Org` piece of a timeline entry can itself be a markdown link (`[Acme Corp](https://acme.com)`), parsed non-throwing via `tryParseLink` — unlike `parseLinkString`, a non-matching string is not an error, it's just plain org text. Don't make this throw.
- `ThemeToggle.astro` renders twice (once per `Nav.astro` block) and deliberately does NOT use a DOM `id` for its script — it uses a `.theme-toggle` class and `querySelectorAll` so every instance gets its own click listener and stays in sync via the single shared `dark` class on `<html>`. If you ever go back to a single-instance nav, an `id`-based `getElementById` would work too, but don't reintroduce an `id` while both nav blocks exist — a duplicate `id` would silently break one instance's click handler. `Nav.astro`'s own hamburger (`#nav-toggle`)/panel (`#nav-panel`) stay `id`-based safely since they only exist in the mobile block, never duplicated. `LanguageSwitcher.astro` has no state/script, so duplicating it across both nav blocks is always safe.
- The timeline dot and connector line (`TimelineEntry.astro`) are laid out with a CSS grid (`grid-cols-[20px_1fr]`): the dot sits in a narrow marker column, centered via flex, so it can never overflow the entry's box — don't go back to absolute-position-plus-negative-translate tricks for this, that's what caused the dot to render outside the container before. The line is a separate absolutely-positioned span within that same marker column, offset to start below the dot and stop before the next one (`top-[26px] bottom-[-24px]`, tuned against the dot's own `mt-1.5`/`h-3` and `TimelineSection.astro`'s `space-y-8` gap) — deliberately not touching either dot. If you change the dot size, its margin, or the section's gap, recompute these two offsets together.
- The timeline dot's fill uses `bg-*` (background-color), which browsers suppress by default when printing — it carries `print:[print-color-adjust:exact]` (plus the `-webkit-` variant) to force it to print. Don't remove that when touching the dot's styling, or it disappears in print/PDF output again.
- The theme toggle is a static SVG icon (a circle, left half filled, right half outlined only) — it does not swap between two icons/labels based on the current theme like the earlier text version did. `aria-label` carries the accessible name instead.

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
