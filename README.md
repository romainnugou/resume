# Resume

A static, developer-friendly resume site generated from a markdown file. No backend, no CMS — clone, edit `resume.md`, deploy.

## Quick start

```bash
pnpm install
pnpm dev       # preview at http://localhost:4321
```

Edit `resume.md` in the project root with your own name, title, links, and sections. Structure:

- YAML frontmatter: `name`, `title`, optionally `lang` (defaults to `en`), `photo` (markdown image syntax, e.g. `"![Alt](./photo.jpg)"`), `links` (list of markdown links, e.g. `"[GitHub](https://github.com/you)"`).
- Any text before the first `## Heading` is your summary paragraph.
- Each `## Heading` becomes a page section (nav, anchor, etc).
- Within a section, `### Title | Org | Dates` starts a timeline entry (used for Experience, Education, etc). Any text between the section heading and the first `###` entry renders as an intro paragraph above the timeline. A section with no `###` entries just renders as plain markdown — use this for Languages, Skills, and similar lists.

## Dark mode

Follows your system preference by default. A toggle button in the header lets you override it, saved for next visit. Automatically switches back to light mode while printing, regardless of the current setting.

## Multiple languages

Add `resume.<locale>.md` (e.g. `resume.fr.md`) for each additional language — same format as `resume.md`, fully independent content. Once you add one, `resume.md` must declare its own `lang` in frontmatter (e.g. `lang: en`), since it's no longer the only language. Don't want multiple languages? Just delete the extra file(s) — `lang` becomes optional again automatically.

## Print / PDF

Use your browser's print dialog (Cmd/Ctrl+P → Save as PDF). Navigation and the theme/language switches are automatically hidden when printing.

## Build & deploy

```bash
pnpm build     # outputs to dist/
```

Deploy the `dist/` folder to Cloudflare Pages (build command: `pnpm build`, output directory: `dist`).

## Tests

```bash
pnpm test      # runs the parser/discovery unit tests
```
