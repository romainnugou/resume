# CLAUDE.md

Static, markdown-driven personal resume site. Astro + TypeScript + Tailwind CSS + pnpm. No backend, no CMS — content lives in `resume.md` (and optional `resume.<locale>.md` files), hand-edited and git-tracked. Deployed to Cloudflare Pages.

Full design rationale: `docs/superpowers/specs/2026-09-09-resume-app-design.md`.

## Architecture

- `src/lib/parseResume.ts` — pure functions, no Astro/DOM dependency. Parses frontmatter (gray-matter) and markdown body into a typed `ParsedResume` (sections, timeline entries, links, photo). All parsing happens at build time; nothing runs client-side.
- `src/lib/discoverResumeFiles.ts` — finds `resume.md` + any `resume.<locale>.md` at the project root. Deliberately independent from `parseResume.ts` (reads frontmatter itself via gray-matter) rather than sharing code.
- `src/components/` — presentational only, no business logic. `ResumePage.astro` is the single composition point both routes render through.
- `src/pages/index.astro` (default locale) and `src/pages/[locale]/index.astro` (via `getStaticPaths`) each independently call `discoverResumeFiles`/`parseResumeMarkdown`. **This duplication is intentional** — build-time only, cheap, avoids a shared-cache abstraction for two static pages. Don't "fix" it.

## Conventions that look like bugs but aren't

- `lang` is optional in `resume.md`'s frontmatter (defaults to `en`) *unless* another `resume.<locale>.md` file exists, in which case it's required and the build fails loudly if missing. This is by design (see spec's Internationalization section) — don't make `lang` always-required or always-optional.
- `links`/`photo` in frontmatter use markdown syntax (`"[Label](url)"`, `"![alt](url)"`), never a YAML object shape — this was a deliberate correction during design, keep it that way.
- Malformed link/photo strings, or a missing `resume.md`, throw at build time with a message naming the problem. This is correct behavior (dev-time only, no silent fallback), not something to soften.
- A timeline section (one with `### Title | Org | Dates` entries) can have prelude text before the first entry — it renders as an intro paragraph (`introHtml` on `TimelineSectionData`). Don't reintroduce the earlier bug where this text was silently dropped.

## Things intentionally not done (don't add without discussion)

- No `@tailwindcss/typography` — prose sections use plain utility classes.
- No component tests — components are presentational with no branching logic worth testing in isolation. Only `src/lib/*.ts` has unit tests (Vitest).
- No build-time PDF generation — PDF export is browser print-to-PDF only (`print:hidden`/`print:bg-white print:text-black` utility classes handle the print-specific styling).
- No CMS/editing UI — `resume.md` is edited by hand.

## Commands

```bash
pnpm dev     # preview at localhost:4321
pnpm test    # unit tests for src/lib/
pnpm build   # outputs to dist/
```
