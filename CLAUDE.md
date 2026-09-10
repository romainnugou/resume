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
- A timeline entry's title line supports an optional 4th `|`-separated piece for location: `### Title | Org | Location | Dates`. `parseResume.ts` distinguishes it from the 3-piece form by part count (`parts.length > 3`), not by position guessing — a 3-piece entry has no `location` at all (`undefined`, not empty string). `TimelineEntry.astro` renders it after `Org`, in the same style, only when present.
- `ThemeToggle.astro` renders once per locale (one `Nav` per `[data-resume-lang]` block) and deliberately does NOT use a DOM `id` — it uses a `.theme-toggle` class with a single delegated `click` listener on `document` (guarded by a `window.__themeToggleBound` flag so re-running the inline script, e.g. from Astro dev HMR, doesn't double-bind it), so every instance toggles the same shared `dark` class on `<html>` without needing one listener per node. Every `.theme-toggle` button's `aria-pressed` is synced to the current `dark` class state on load and after each toggle (`syncPressed()`), since there's one button per locale block sharing the same underlying state. `LanguageSwitcher.astro` has no state/script, so duplicating it across locale blocks is always safe.
- The timeline dot and connector line (`TimelineEntry.astro`) are laid out with a CSS grid (`grid-cols-[20px_1fr]`): the dot sits in a narrow marker column, centered via flex, so it can never overflow the entry's box — don't go back to absolute-position-plus-negative-translate tricks for this, that's what caused the dot to render outside the container before. The line is a separate absolutely-positioned span within that same marker column, offset to start below the dot and stop before the next one (`top-[26px] bottom-[-30px]`) — deliberately not touching either dot, and tuned so the gap is the same size (8px) on both ends: gap = `top` offset − dot's own bottom edge (`mt-1.5` + `h-3` = 18px) on the entry above, and = (next dot's top, i.e. this entry's height + the section's `space-y-8` gap (32px) + the next dot's own `mt-1.5`) − `bottom`'s implied position on the entry below. If you change the dot size, its margin, or the section's gap, recompute both offsets together so the two gaps stay equal — don't just eyeball one side.
- The timeline dot's fill uses `bg-*` (background-color), which browsers suppress by default when printing — it carries `print:[print-color-adjust:exact]` (plus the `-webkit-` variant) to force it to print. Don't remove that when touching the dot's styling, or it disappears in print/PDF output again.
- The theme toggle is a static SVG icon (a circle, left half filled, right half outlined only) — it does not swap between two icons/labels based on the current theme like the earlier text version did. `aria-label` carries the accessible name instead.
- The theme toggle has no border/background/padding — it's styled bare, like the plain `LanguageSwitcher` links next to it (`hover:opacity-70` for feedback instead of a button-like box). Don't add a border "for visibility"; it was deliberately removed to match the surrounding nav links.
- `ContactInfo.astro` renders two separate `<ul>`s — one for `contact` fields, one for `links` — instead of a single merged list. This is deliberate (they're conceptually different groups), not an oversight to "fix" into one list.
- `contact` in frontmatter is a list of `{label, value, type}` objects (`type` is `email`, `phone`, or `text`), not fixed `email`/`phone`/`address` keys — this is deliberate so a resume can have any number of contact fields (e.g. two phone numbers) and translate labels per-locale. Unlike `links`/`photo`, it's a plain object shape, not markdown syntax — don't convert it to a `"[Label](value)"` string form.

## Spacing rhythm

Two tiers only — **normal** and **small** — used consistently everywhere rather than picking a value per component. Never introduce a third value; every gap is one of these two.

- **Normal** (2rem / `-8` classes): between major blocks — `Header.astro` (`mb-8`, header → contact-info block), `ContactInfo.astro`'s two `<ul>`s (`mb-8` each, so contact fields → links → summary sit one normal gap apart), the summary (`ResumePage.astro`'s `mb-8`), between resume sections (`Section.astro`/`TimelineSection.astro`'s `mb-8`), and between each timeline entry — i.e. each job/education item (`TimelineSection.astro`'s `space-y-8`).
- **Small** (1rem / `-4` classes): spacing *inside* an item — a section's heading to its own content (`Section.astro`/`TimelineSection.astro`'s `mb-4`), a timeline intro paragraph to its entries (`TimelineSection.astro`'s `mb-4`), and a timeline entry's title/dates line to its own body text below (`TimelineEntry.astro`'s `mt-4`).

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
