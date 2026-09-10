# CLAUDE.md

Static, markdown-driven personal resume site. Astro + TypeScript + Tailwind CSS + pnpm. No backend, no CMS — content lives in `resume.md` (and optional `resume.<locale>.md` files), hand-edited and git-tracked. Deployed to Cloudflare Pages.

Full design rationale: `docs/superpowers/specs/2026-09-09-resume-app-design.md`.

## Architecture

- `src/lib/parseResume.ts` — pure functions, no Astro/DOM dependency. Parses frontmatter (gray-matter) and markdown body into a typed `ParsedResume` (sections, timeline entries, links, photo, contact fields). All parsing happens at build time; nothing runs client-side.
- `src/lib/discoverResumeFiles.ts` — finds `resume.md` + any `resume.<locale>.md` at the project root. Deliberately independent from `parseResume.ts` (reads frontmatter itself via gray-matter) rather than sharing code.
- Single route: `src/pages/index.astro` reads every discovered resume file and passes `resumes` (one `{ locale, resume }` per file) + `defaultLocale` to `ResumePage.astro`. There is no `[locale]` route — all locales render into the same static page, and switching languages is a client-side toggle, not a navigation.
- `src/components/` — presentational only, no business logic. `ResumePage.astro` maps `resumes` to one full block per locale (`Nav` + `Header` + `ContactInfo` + summary + sections), each wrapped in `<div data-resume-lang={locale}>`, all inside a single `grid` container.
- `ResumeLayout.astro` stacks those per-locale blocks on top of each other (`grid-row:1; grid-column:1` on every `[data-resume-lang]`, injected as an inline `<style>`) and shows only the active one via `opacity`/`pointer-events`, toggled by setting `data-active-lang` on `<html>`. An inline `<script>` also sets/removes the `inert` attribute on the non-active blocks so their content and links aren't focusable or exposed to assistive tech, and resolves the initial locale from `localStorage`, then the browser's `navigator.languages`, falling back to `defaultLocale`. All locales are present in the static HTML (good for crawlers/SEO); only one is visible/interactive at a time.
- There is no section-jump navigation (no sidebar, no hamburger menu) — this was deliberately removed. `Nav.astro` is just a small floating bar, fixed to the top-right corner (`fixed inset-x-0 top-0`, content pushed right via `justify-end`), holding `LanguageSwitcher` + `ThemeToggle` and nothing else. It takes no `sections` prop. Don't reintroduce a `sections`-driven nav without discussion.
- `LanguageSwitcher.astro` renders `<button data-lang-switch={locale}>` elements, not links — switching locale never navigates, it flips `data-active-lang` via the script in `ResumeLayout.astro` and persists the choice to `localStorage`.
- Section/entry `id`s (`section.slug`, optionally prefixed with the locale so IDs stay unique across the stacked per-locale blocks) still exist on `Section.astro`/`TimelineSection.astro` even with no visible nav — they're harmless deep-link anchors, not dead code.

## Conventions that look like bugs but aren't

- `lang` is optional in `resume.md`'s frontmatter (defaults to `en`) *unless* another `resume.<locale>.md` file exists, in which case it's required and the build fails loudly if missing. This is by design (see spec's Internationalization section) — don't make `lang` always-required or always-optional.
- `links`/`photo` in frontmatter use markdown syntax (`"[Label](url)"`, `"![alt](url)"`), never a YAML object shape — this was a deliberate correction during design, keep it that way.
- Malformed link/photo strings, or a missing `resume.md`, throw at build time with a message naming the problem. This is correct behavior (dev-time only, no silent fallback), not something to soften.
- A timeline section (one with `### Title | Org | Dates` entries) can have prelude text before the first entry — it renders as an intro paragraph (`introHtml` on `TimelineSectionData`). Don't reintroduce the earlier bug where this text was silently dropped.
- The `Org` piece of a timeline entry can itself be a markdown link (`[Acme Corp](https://acme.com)`), parsed non-throwing via `tryParseLink` — unlike `parseLinkString`, a non-matching string is not an error, it's just plain org text. Don't make this throw.
- `ThemeToggle.astro` renders once per locale (one `Nav` per `[data-resume-lang]` block) and deliberately does NOT use a DOM `id` — it uses a `.theme-toggle` class with a single delegated `click` listener on `document` (guarded by a `window.__themeToggleBound` flag so re-running the inline script, e.g. from Astro dev HMR, doesn't double-bind it), so every instance toggles the same shared `dark` class on `<html>` without needing one listener per node. `LanguageSwitcher.astro` has no state/script, so duplicating it across locale blocks is always safe.
- The timeline dot and connector line (`TimelineEntry.astro`) are laid out with a CSS grid (`grid-cols-[20px_1fr]`): the dot sits in a narrow marker column, centered via flex, so it can never overflow the entry's box — don't go back to absolute-position-plus-negative-translate tricks for this, that's what caused the dot to render outside the container before. The line is a separate absolutely-positioned span within that same marker column, offset to start below the dot and stop before the next one (`top-[26px] bottom-[-30px]`) — deliberately not touching either dot, and tuned so the gap is the same size (8px) on both ends: gap = `top` offset − dot's own bottom edge (`mt-1.5` + `h-3` = 18px) on the entry above, and = (next dot's top, i.e. this entry's height + `space-y-8`'s 32px + the next dot's own `mt-1.5`) − `bottom`'s implied position on the entry below. If you change the dot size, its margin, or the section's gap, recompute both offsets together so the two gaps stay equal — don't just eyeball one side.
- The timeline dot's fill uses `bg-*` (background-color), which browsers suppress by default when printing — it carries `print:[print-color-adjust:exact]` (plus the `-webkit-` variant) to force it to print. Don't remove that when touching the dot's styling, or it disappears in print/PDF output again.
- The theme toggle is a static SVG icon (a circle, left half filled, right half outlined only) — it does not swap between two icons/labels based on the current theme like the earlier text version did. `aria-label` carries the accessible name instead.
- The theme toggle has no border/background/padding — it's styled bare, like the plain `LanguageSwitcher` links next to it (`hover:opacity-70` for feedback instead of a button-like box). Don't add a border "for visibility"; it was deliberately removed to match the surrounding nav links.

## Spacing rhythm

Two tiers, used consistently everywhere rather than picking a value per component:

- **Major block boundary** (2.5rem / `-10` classes): between resume sections (`Section.astro`/`TimelineSection.astro`'s `mb-10`), between the intro area and the first section (`ResumePage.astro`'s summary `mb-10`), and between `Header` and the contact-info/summary block (`Header.astro`'s flat `mb-10` — there's no grid gap to double up against anymore, since the layout is single-column at every breakpoint). If you need a gap between two major blocks, reuse `10`, don't invent a new value.
- **Minor internal spacing** (1rem / `-4` classes): a section's heading to its own content (`Section.astro`/`TimelineSection.astro`'s `mb-4`).

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
