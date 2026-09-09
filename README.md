# Resume

A static, developer-friendly resume site generated from a markdown file. No backend, no CMS — clone, edit `resume.md`, deploy.

## Quick start

```bash
pnpm install
pnpm dev       # preview at http://localhost:4321
```

Edit `resume.md` in the project root with your own name, title, contact info, links, and sections. Structure:

- YAML frontmatter: `name`, `title`, optionally `lang` (defaults to `en`), `photo` (markdown image syntax, e.g. `"![Alt](./photo.jpg)"`), `email`, `phone`, `address` (plain strings — email/phone become clickable `mailto:`/`tel:` links), `links` (list of markdown links, e.g. `"[GitHub](https://github.com/you)"`). Each contact field and link renders as its own line in the header, formatted `Label: url` (or `Label: value` for address), with the URL itself as the clickable text — so it stays readable and clickable in print too.
- Any text before the first `## Heading` is your summary paragraph.
- Each `## Heading` becomes a page section (nav, anchor, etc). A section's content can be plain markdown prose, or a bulleted/numbered list (`- item`) — both render normally, useful for Languages, Skills, and similar lists.
- Within a section, `### Title | Org | Dates` starts a timeline entry (used for Experience, Education, etc). The `Org` piece can optionally be a markdown link (e.g. `### Senior Engineer | [Acme Corp](https://acme.com) | 2022 - Present`) to link the company/school name — plain text also works. Any text between the section heading and the first `###` entry renders as an intro paragraph above the timeline. A section with no `###` entries just renders as plain markdown.

## Navigation, language, and dark mode

A sticky bar at the top of the page holds the section links, the language switcher (when more than one language exists), and the dark-mode toggle. On narrow screens the section links collapse behind a "Menu" button; the language switcher and theme toggle stay visible at every size. Dark mode follows your system preference by default, the toggle overrides it and is remembered for next visit, and it automatically switches back to light mode while printing regardless of the current setting.

## Multiple languages

Add `resume.<locale>.md` (e.g. `resume.fr.md`) for each additional language — same format as `resume.md`, fully independent content. Once you add one, `resume.md` must declare its own `lang` in frontmatter (e.g. `lang: en`), since it's no longer the only language. Don't want multiple languages? Just delete the extra file(s) — `lang` becomes optional again automatically.

## Print / PDF

Use your browser's print dialog (Cmd/Ctrl+P → Save as PDF). The navigation bar (section links, language switcher, theme toggle) is hidden when printing, and the page always prints in light mode regardless of your current setting.

## Build & deploy

```bash
pnpm build     # outputs to dist/
```

Deploy the `dist/` folder to Cloudflare Pages (build command: `pnpm build`, output directory: `dist`).

## Tests

```bash
pnpm test      # runs the parser/discovery unit tests
```
