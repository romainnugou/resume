# Resume/CV App v0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a static, markdown-driven personal resume site (Astro + TypeScript + Tailwind), with a clean typography-focused layout, timeline sections, dark/light mode, print/PDF-friendly rendering, in-page nav, and optional multilingual support.

**Architecture:** A build-time pipeline reads `resume.md` (and optional `resume.<locale>.md` files) from the project root, parses frontmatter + markdown into a typed `ParsedResume` object (no runtime parsing), and renders it through a shared Astro component tree. Two page routes (`/` for the default locale, `/[locale]/` generated via `getStaticPaths`) both delegate to one `ResumePage.astro` composition component, so there is exactly one rendering code path regardless of how many languages exist.

**Tech Stack:** Astro, TypeScript, Tailwind CSS, pnpm, gray-matter (frontmatter parsing), marked (markdown-to-HTML), Vitest (unit tests for the parser/discovery logic only — components are presentational and verified via build/dev server).

**Spec:** `docs/superpowers/specs/2026-09-09-resume-app-design.md`

## Global Constraints

- No backend, no CMS, no runtime parsing — everything resolves at build time (spec: Non-goals, Architecture).
- Only two new runtime dependencies beyond the framework: `gray-matter` and `marked` (spec: Stack).
- `resume.md` is required; if missing, the build fails with a clear error naming the file (spec: Error handling).
- `lang` in `resume.md`'s frontmatter is optional (defaults to `en`) when it is the only resume file, but **required** (build fails with a clear error) as soon as any `resume.<locale>.md` file exists (spec: Internationalization, Error handling).
- Nav, theme toggle, and language switcher must all be hidden on print via Tailwind's built-in `print:hidden` utility — no custom print CSS beyond that (spec: Styling).
- Dark mode is class-based (`darkMode: 'class'` in Tailwind config), defaults to system preference, manually toggleable, persisted in `localStorage`, no flash-of-wrong-theme (spec: Goals, Components).
- `links` and `photo` in frontmatter use native markdown syntax (`"[Label](url)"`, `"![alt](url)"`), never a bespoke YAML object shape (spec: Content format).
- Deploy target is Cloudflare Pages; project has its own git repo (already initialized at `/Users/romainnugou/Web/__perso/projects/resume`, `main` branch, spec doc already committed).

---

### Task 1: Scaffold the Astro project

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `astro.config.mjs`
- Create: `tailwind.config.mjs`
- Create: `vitest.config.ts`
- Create: `src/styles/global.css`
- Create: `src/pages/index.astro` (temporary placeholder, replaced in Task 11)
- Create: `.gitignore`

**Interfaces:**
- Produces: a working `pnpm dev` / `pnpm build` / `pnpm test` toolchain that every later task builds on.

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "resume",
  "type": "module",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "test": "vitest run"
  },
  "dependencies": {
    "astro": "^5.1.0",
    "@astrojs/tailwind": "^5.1.3",
    "tailwindcss": "^3.4.17",
    "gray-matter": "^4.0.3",
    "marked": "^15.0.6"
  },
  "devDependencies": {
    "typescript": "^5.7.2",
    "vitest": "^2.1.8",
    "@types/node": "^22.10.2"
  }
}
```

- [ ] **Step 2: Create `tsconfig.json`**

```json
{
  "extends": "astro/tsconfigs/strict",
  "include": [".astro/types.d.ts", "**/*"],
  "exclude": ["dist"],
  "compilerOptions": {
    "types": ["node"]
  }
}
```

- [ ] **Step 3: Create `astro.config.mjs`**

```js
import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  integrations: [tailwind()],
});
```

- [ ] **Step 4: Create `tailwind.config.mjs`**

```js
/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,ts,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [],
};
```

- [ ] **Step 5: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
  },
});
```

- [ ] **Step 6: Create `src/styles/global.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 7: Create a temporary placeholder `src/pages/index.astro`**

This is replaced entirely in Task 11 — it only exists so the toolchain has something to build right now.

```astro
---
import '../styles/global.css';
---
<html lang="en">
  <body>
    <p>Placeholder — replaced in Task 11.</p>
  </body>
</html>
```

- [ ] **Step 8: Create `.gitignore`**

```
node_modules/
dist/
.astro/
```

- [ ] **Step 9: Install dependencies**

Run: `pnpm install`
Expected: installs successfully, creates `pnpm-lock.yaml`.

- [ ] **Step 10: Verify the build works**

Run: `pnpm build`
Expected: `Complete!` output, `dist/index.html` exists.

- [ ] **Step 11: Commit**

```bash
git add package.json tsconfig.json astro.config.mjs tailwind.config.mjs vitest.config.ts src/styles/global.css src/pages/index.astro .gitignore pnpm-lock.yaml
git commit -m "Scaffold Astro + TypeScript + Tailwind + Vitest project"
```

---

### Task 2: Parser — frontmatter, link, and photo parsing

**Files:**
- Create: `src/lib/parseResume.ts`
- Test: `src/lib/parseResume.test.ts`

**Interfaces:**
- Produces: `parseLinkString(raw: string): Link`, `parsePhotoString(raw: string): Photo`, `slugify(heading: string): string`, and the exported types `Link { label: string; url: string }`, `Photo { alt: string; url: string }`. Later tasks (3, 4) add more exports to this same file.

- [ ] **Step 1: Write the failing tests**

Create `src/lib/parseResume.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { parseLinkString, parsePhotoString, slugify } from './parseResume';

describe('parseLinkString', () => {
  it('parses a markdown link into label and url', () => {
    expect(parseLinkString('[GitHub](https://github.com/janedoe)')).toEqual({
      label: 'GitHub',
      url: 'https://github.com/janedoe',
    });
  });

  it('throws on a malformed link string', () => {
    expect(() => parseLinkString('GitHub: https://github.com/janedoe')).toThrow(
      /malformed link/i
    );
  });
});

describe('parsePhotoString', () => {
  it('parses a markdown image into alt and url', () => {
    expect(parsePhotoString('![Jane Doe](./photo.jpg)')).toEqual({
      alt: 'Jane Doe',
      url: './photo.jpg',
    });
  });

  it('throws on a malformed photo string', () => {
    expect(() => parsePhotoString('./photo.jpg')).toThrow(/malformed photo/i);
  });
});

describe('slugify', () => {
  it('lowercases and dashes a heading', () => {
    expect(slugify('Work Experience')).toBe('work-experience');
  });

  it('strips non-alphanumeric characters', () => {
    expect(slugify('Éducation & Skills!')).toBe('education-skills');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test`
Expected: FAIL — `src/lib/parseResume.ts` does not exist / exports not found.

- [ ] **Step 3: Write the implementation**

Create `src/lib/parseResume.ts`:

```ts
export interface Link {
  label: string;
  url: string;
}

export interface Photo {
  alt: string;
  url: string;
}

const LINK_PATTERN = /^\[(.+)\]\((.+)\)$/;
const PHOTO_PATTERN = /^!\[(.*)\]\((.+)\)$/;

export function parseLinkString(raw: string): Link {
  const match = raw.trim().match(LINK_PATTERN);
  if (!match) {
    throw new Error(
      `Malformed link string in frontmatter: "${raw}". Expected markdown link syntax like "[Label](https://example.com)".`
    );
  }
  return { label: match[1], url: match[2] };
}

export function parsePhotoString(raw: string): Photo {
  const match = raw.trim().match(PHOTO_PATTERN);
  if (!match) {
    throw new Error(
      `Malformed photo string in frontmatter: "${raw}". Expected markdown image syntax like "![Alt text](./photo.jpg)".`
    );
  }
  return { alt: match[1], url: match[2] };
}

export function slugify(heading: string): string {
  return heading
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test`
Expected: PASS — all 6 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/parseResume.ts src/lib/parseResume.test.ts
git commit -m "Add link, photo, and slug parsing for resume frontmatter"
```

---

### Task 3: Parser — summary extraction and section splitting

**Files:**
- Modify: `src/lib/parseResume.ts`
- Modify: `src/lib/parseResume.test.ts`

**Interfaces:**
- Consumes: nothing new from Task 2 beyond what's already in the file.
- Produces: `splitOnHeadingLevel(text: string, level: number): { title: string; body: string }[]`, `splitSummaryAndBody(body: string): { summaryMd: string; rest: string }`. Task 4 uses both directly.

- [ ] **Step 1: Write the failing tests**

Append to `src/lib/parseResume.test.ts`:

```ts
import { splitOnHeadingLevel, splitSummaryAndBody } from './parseResume';

describe('splitOnHeadingLevel', () => {
  it('splits text into blocks at the given heading level', () => {
    const text = '## Experience\nSome text\n## Education\nMore text\n';
    expect(splitOnHeadingLevel(text, 2)).toEqual([
      { title: 'Experience', body: 'Some text' },
      { title: 'Education', body: 'More text' },
    ]);
  });

  it('returns an empty array when the level is not present', () => {
    expect(splitOnHeadingLevel('Just some prose, no headings.', 2)).toEqual([]);
  });

  it('does not match a deeper heading level', () => {
    const text = '## Experience\n### Senior Engineer | Acme | 2022\nDid things.\n';
    const blocks = splitOnHeadingLevel(text, 2);
    expect(blocks).toEqual([
      { title: 'Experience', body: '### Senior Engineer | Acme | 2022\nDid things.' },
    ]);
  });
});

describe('splitSummaryAndBody', () => {
  it('captures content before the first level-2 heading as the summary', () => {
    const body = 'Building things for years.\n\n## Experience\nDid stuff.\n';
    expect(splitSummaryAndBody(body)).toEqual({
      summaryMd: 'Building things for years.',
      rest: '## Experience\nDid stuff.',
    });
  });

  it('treats the whole body as summary when there is no level-2 heading', () => {
    const body = 'Just a summary, nothing else.';
    expect(splitSummaryAndBody(body)).toEqual({
      summaryMd: 'Just a summary, nothing else.',
      rest: '',
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test`
Expected: FAIL — `splitOnHeadingLevel` and `splitSummaryAndBody` not exported.

- [ ] **Step 3: Write the implementation**

Append to `src/lib/parseResume.ts`:

```ts
export function splitOnHeadingLevel(
  text: string,
  level: number
): { title: string; body: string }[] {
  const marker = '#'.repeat(level) + ' ';
  const lines = text.split('\n');
  const blocks: { title: string; body: string }[] = [];
  let current: { title: string; bodyLines: string[] } | null = null;

  for (const line of lines) {
    if (line.startsWith(marker)) {
      if (current) {
        blocks.push({ title: current.title, body: current.bodyLines.join('\n').trim() });
      }
      current = { title: line.slice(marker.length).trim(), bodyLines: [] };
    } else if (current) {
      current.bodyLines.push(line);
    }
  }
  if (current) {
    blocks.push({ title: current.title, body: current.bodyLines.join('\n').trim() });
  }
  return blocks;
}

export function splitSummaryAndBody(body: string): { summaryMd: string; rest: string } {
  const match = body.match(/^## /m);
  if (!match || match.index === undefined) {
    return { summaryMd: body.trim(), rest: '' };
  }
  return {
    summaryMd: body.slice(0, match.index).trim(),
    rest: body.slice(match.index).trim(),
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test`
Expected: PASS — all tests green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/parseResume.ts src/lib/parseResume.test.ts
git commit -m "Add heading-level splitting and summary extraction to resume parser"
```

---

### Task 4: Parser — timeline entries and full `parseResumeMarkdown`

**Files:**
- Modify: `src/lib/parseResume.ts`
- Modify: `src/lib/parseResume.test.ts`

**Interfaces:**
- Consumes: `parseLinkString`, `parsePhotoString`, `slugify`, `splitOnHeadingLevel`, `splitSummaryAndBody` (all from this file, Tasks 2-3).
- Produces: types `TimelineEntry { title: string; org: string; dates: string; html: string }`, `ProseSection { type: 'prose'; heading: string; slug: string; html: string }`, `TimelineSectionData { type: 'timeline'; heading: string; slug: string; entries: TimelineEntry[] }`, `Section = ProseSection | TimelineSectionData`, `ParsedResume { name: string; title: string; lang?: string; photo: Photo | null; links: Link[]; summaryHtml: string; sections: Section[] }`, and `parseResumeMarkdown(raw: string): ParsedResume`. Tasks 5, 6, 7, 11, 12 all consume `ParsedResume` and `parseResumeMarkdown`.

- [ ] **Step 1: Write the failing tests**

Append to `src/lib/parseResume.test.ts`:

```ts
import { parseResumeMarkdown } from './parseResume';

describe('parseResumeMarkdown', () => {
  const sample = `---
name: Jane Doe
title: Software Engineer
lang: en
photo: "![Jane Doe](./photo.jpg)"
links:
  - "[GitHub](https://github.com/janedoe)"
  - "[Email](mailto:jane@example.com)"
---

Building reliable systems for **8+ years**.

## Experience

### Senior Engineer | Acme Corp | 2022 - Present
Led the platform team.

### Engineer | Beta Inc | 2019 - 2022
Built the core API.

## Education

### MSc Computer Science | Some University | 2015 - 2019

## Languages

- English (native)
- French (fluent)
`;

  it('parses frontmatter fields', () => {
    const resume = parseResumeMarkdown(sample);
    expect(resume.name).toBe('Jane Doe');
    expect(resume.title).toBe('Software Engineer');
    expect(resume.lang).toBe('en');
    expect(resume.photo).toEqual({ alt: 'Jane Doe', url: './photo.jpg' });
    expect(resume.links).toEqual([
      { label: 'GitHub', url: 'https://github.com/janedoe' },
      { label: 'Email', url: 'mailto:jane@example.com' },
    ]);
  });

  it('renders the summary as markdown', () => {
    const resume = parseResumeMarkdown(sample);
    expect(resume.summaryHtml).toContain('<strong>8+ years</strong>');
  });

  it('builds a timeline section with parsed entries', () => {
    const resume = parseResumeMarkdown(sample);
    const experience = resume.sections.find((s) => s.heading === 'Experience');
    expect(experience?.type).toBe('timeline');
    if (experience?.type === 'timeline') {
      expect(experience.entries).toEqual([
        {
          title: 'Senior Engineer',
          org: 'Acme Corp',
          dates: '2022 - Present',
          html: expect.stringContaining('Led the platform team'),
        },
        {
          title: 'Engineer',
          org: 'Beta Inc',
          dates: '2019 - 2022',
          html: expect.stringContaining('Built the core API'),
        },
      ]);
    }
  });

  it('handles a timeline entry missing a piece without throwing', () => {
    const education = parseResumeMarkdown(sample).sections.find(
      (s) => s.heading === 'Education'
    );
    expect(education?.type).toBe('timeline');
    if (education?.type === 'timeline') {
      expect(education.entries).toEqual([
        {
          title: 'MSc Computer Science',
          org: 'Some University',
          dates: '2015 - 2019',
          html: '',
        },
      ]);
    }
  });

  it('falls back to a prose section when there are no ### entries', () => {
    const languages = parseResumeMarkdown(sample).sections.find(
      (s) => s.heading === 'Languages'
    );
    expect(languages?.type).toBe('prose');
    if (languages?.type === 'prose') {
      expect(languages.html).toContain('English (native)');
    }
  });

  it('slugifies section headings', () => {
    const experience = parseResumeMarkdown(sample).sections.find(
      (s) => s.heading === 'Experience'
    );
    expect(experience?.slug).toBe('experience');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test`
Expected: FAIL — `parseResumeMarkdown` not exported.

- [ ] **Step 3: Write the implementation**

Add to the top of `src/lib/parseResume.ts`:

```ts
import matter from 'gray-matter';
import { marked } from 'marked';
```

Append to `src/lib/parseResume.ts`:

```ts
export interface TimelineEntry {
  title: string;
  org: string;
  dates: string;
  html: string;
}

export interface ProseSection {
  type: 'prose';
  heading: string;
  slug: string;
  html: string;
}

export interface TimelineSectionData {
  type: 'timeline';
  heading: string;
  slug: string;
  entries: TimelineEntry[];
}

export type Section = ProseSection | TimelineSectionData;

export interface ParsedResume {
  name: string;
  title: string;
  lang?: string;
  photo: Photo | null;
  links: Link[];
  summaryHtml: string;
  sections: Section[];
}

export function parseResumeMarkdown(raw: string): ParsedResume {
  const { data, content } = matter(raw);

  const name = String(data.name ?? '');
  const title = String(data.title ?? '');
  const lang = data.lang ? String(data.lang) : undefined;
  const photo = data.photo ? parsePhotoString(String(data.photo)) : null;
  const rawLinks: string[] = Array.isArray(data.links) ? data.links : [];
  const links = rawLinks.map((link) => parseLinkString(link));

  const { summaryMd, rest } = splitSummaryAndBody(content);
  const summaryHtml = summaryMd ? (marked.parse(summaryMd) as string) : '';

  const sections: Section[] = splitOnHeadingLevel(rest, 2).map(({ title: heading, body }) => {
    const slug = slugify(heading);
    const entryBlocks = splitOnHeadingLevel(body, 3);

    if (entryBlocks.length === 0) {
      return { type: 'prose', heading, slug, html: marked.parse(body) as string };
    }

    const entries: TimelineEntry[] = entryBlocks.map(({ title: entryTitle, body: entryBody }) => {
      const parts = entryTitle.split('|').map((part) => part.trim());
      return {
        title: parts[0] ?? '',
        org: parts[1] ?? '',
        dates: parts[2] ?? '',
        html: entryBody ? (marked.parse(entryBody) as string) : '',
      };
    });

    return { type: 'timeline', heading, slug, entries };
  });

  return { name, title, lang, photo, links, summaryHtml, sections };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test`
Expected: PASS — all tests green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/parseResume.ts src/lib/parseResume.test.ts
git commit -m "Add timeline entry parsing and full parseResumeMarkdown"
```

---

### Task 5: Resume file discovery and the `lang`-required rule

**Files:**
- Create: `src/lib/discoverResumeFiles.ts`
- Test: `src/lib/discoverResumeFiles.test.ts`

**Interfaces:**
- Consumes: nothing from other lib files (reads frontmatter itself via `gray-matter` directly, to avoid coupling to `parseResumeMarkdown`'s section-parsing cost for a discovery-only concern).
- Produces: `DiscoveredResumeFile { locale: string; filePath: string; isDefault: boolean }`, `discoverResumeFiles(rootDir: string): DiscoveredResumeFile[]`. Tasks 11 and 12 call this directly.

- [ ] **Step 1: Write the failing tests**

Create `src/lib/discoverResumeFiles.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { discoverResumeFiles } from './discoverResumeFiles';

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), 'resume-test-'));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe('discoverResumeFiles', () => {
  it('throws when resume.md is missing', () => {
    expect(() => discoverResumeFiles(dir)).toThrow(/missing resume\.md/i);
  });

  it('returns just the default file when only resume.md exists, defaulting lang to en', () => {
    writeFileSync(path.join(dir, 'resume.md'), '---\nname: Jane\ntitle: Engineer\n---\n');
    const files = discoverResumeFiles(dir);
    expect(files).toEqual([
      { locale: 'en', filePath: path.join(dir, 'resume.md'), isDefault: true },
    ]);
  });

  it('uses the lang frontmatter field for the default locale when present, single file', () => {
    writeFileSync(
      path.join(dir, 'resume.md'),
      '---\nname: Jane\ntitle: Engineer\nlang: fr\n---\n'
    );
    const files = discoverResumeFiles(dir);
    expect(files[0].locale).toBe('fr');
  });

  it('discovers additional resume.<locale>.md files', () => {
    writeFileSync(
      path.join(dir, 'resume.md'),
      '---\nname: Jane\ntitle: Engineer\nlang: en\n---\n'
    );
    writeFileSync(path.join(dir, 'resume.fr.md'), '---\nname: Jane\ntitle: Ingénieure\n---\n');
    const files = discoverResumeFiles(dir);
    expect(files).toEqual([
      { locale: 'en', filePath: path.join(dir, 'resume.md'), isDefault: true },
      { locale: 'fr', filePath: path.join(dir, 'resume.fr.md'), isDefault: false },
    ]);
  });

  it('throws when resume.md has no lang and another locale file exists', () => {
    writeFileSync(path.join(dir, 'resume.md'), '---\nname: Jane\ntitle: Engineer\n---\n');
    writeFileSync(path.join(dir, 'resume.fr.md'), '---\nname: Jane\ntitle: Ingénieure\n---\n');
    expect(() => discoverResumeFiles(dir)).toThrow(/missing.*lang/i);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test`
Expected: FAIL — `src/lib/discoverResumeFiles.ts` does not exist.

- [ ] **Step 3: Write the implementation**

Create `src/lib/discoverResumeFiles.ts`:

```ts
import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';

export interface DiscoveredResumeFile {
  locale: string;
  filePath: string;
  isDefault: boolean;
}

const LOCALE_FILE_PATTERN = /^resume\.([a-z]{2}(?:-[A-Z]{2})?)\.md$/;

export function discoverResumeFiles(rootDir: string): DiscoveredResumeFile[] {
  const defaultPath = path.join(rootDir, 'resume.md');
  if (!fs.existsSync(defaultPath)) {
    throw new Error(`Missing resume.md in ${rootDir}. This file is required.`);
  }

  const localeFiles: DiscoveredResumeFile[] = fs
    .readdirSync(rootDir)
    .map((entry) => ({ entry, match: entry.match(LOCALE_FILE_PATTERN) }))
    .filter(
      (result): result is { entry: string; match: RegExpMatchArray } => result.match !== null
    )
    .map(({ entry, match }) => ({
      locale: match[1],
      filePath: path.join(rootDir, entry),
      isDefault: false,
    }));

  const { data } = matter(fs.readFileSync(defaultPath, 'utf-8'));

  let defaultLocale: string;
  if (localeFiles.length > 0) {
    if (!data.lang) {
      throw new Error(
        `resume.md is missing a "lang" frontmatter field, which is required because ` +
          `additional locale file(s) exist: ${localeFiles.map((f) => f.locale).join(', ')}.`
      );
    }
    defaultLocale = String(data.lang);
  } else {
    defaultLocale = data.lang ? String(data.lang) : 'en';
  }

  return [{ locale: defaultLocale, filePath: defaultPath, isDefault: true }, ...localeFiles];
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test`
Expected: PASS — all tests green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/discoverResumeFiles.ts src/lib/discoverResumeFiles.test.ts
git commit -m "Add resume file discovery with lang-required-when-multilingual rule"
```

---

### Task 6: Header and prose Section components

**Files:**
- Create: `src/components/Header.astro`
- Create: `src/components/Section.astro`

**Interfaces:**
- Consumes: `Link`, `Photo` types from `src/lib/parseResume.ts` (Task 2); `ProseSection` type from `src/lib/parseResume.ts` (Task 4).
- Produces: `<Header>` and `<Section>` components used by `ResumePage.astro` (Task 11).

- [ ] **Step 1: Create `src/components/Header.astro`**

```astro
---
import type { Link, Photo } from '../lib/parseResume';

export interface Props {
  name: string;
  title: string;
  photo: Photo | null;
  links: Link[];
  summaryHtml: string;
}

const { name, title, photo, links, summaryHtml } = Astro.props;
---

<header class="mb-10 flex flex-col sm:flex-row gap-6 sm:items-center">
  {
    photo && (
      <img
        src={photo.url}
        alt={photo.alt}
        class="w-24 h-24 rounded-full object-cover shrink-0"
      />
    )
  }
  <div>
    <h1 class="text-3xl font-bold tracking-tight">{name}</h1>
    <p class="text-lg text-gray-600 dark:text-gray-400">{title}</p>
    {
      links.length > 0 && (
        <ul class="flex flex-wrap gap-4 mt-2 text-sm">
          {links.map((link) => (
            <li>
              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                class="underline hover:no-underline"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>
      )
    }
    {
      summaryHtml && (
        <div
          class="mt-4 space-y-2 text-gray-800 dark:text-gray-200"
          set:html={summaryHtml}
        />
      )
    }
  </div>
</header>
```

- [ ] **Step 2: Create `src/components/Section.astro`**

```astro
---
import type { ProseSection } from '../lib/parseResume';

export interface Props {
  section: ProseSection;
}

const { section } = Astro.props;
---

<section id={section.slug} class="mb-10 scroll-mt-20">
  <h2 class="text-xl font-semibold mb-3 border-b border-gray-200 dark:border-gray-800 pb-1">
    {section.heading}
  </h2>
  <div class="space-y-2 text-gray-800 dark:text-gray-200" set:html={section.html} />
</section>
```

- [ ] **Step 3: Verify the build still passes**

Run: `pnpm build`
Expected: `Complete!` — these components aren't wired into a page yet, so this just confirms no syntax errors (Astro type-checks `.astro` files during build).

- [ ] **Step 4: Commit**

```bash
git add src/components/Header.astro src/components/Section.astro
git commit -m "Add Header and prose Section components"
```

---

### Task 7: TimelineSection and TimelineEntry components

**Files:**
- Create: `src/components/TimelineEntry.astro`
- Create: `src/components/TimelineSection.astro`

**Interfaces:**
- Consumes: `TimelineEntry` type and `TimelineSectionData` type from `src/lib/parseResume.ts` (Task 4).
- Produces: `<TimelineSection>` used by `ResumePage.astro` (Task 11).

- [ ] **Step 1: Create `src/components/TimelineEntry.astro`**

```astro
---
import type { TimelineEntry } from '../lib/parseResume';

export interface Props {
  entry: TimelineEntry;
}

const { entry } = Astro.props;
---

<div class="relative">
  <span
    class="absolute -left-[29px] top-1 w-3 h-3 rounded-full bg-gray-400 dark:bg-gray-600 border-2 border-white dark:border-gray-900"
  />
  <div class="flex flex-wrap items-baseline justify-between gap-x-4">
    <h3 class="font-medium">
      {entry.title}
      {entry.org && <span class="text-gray-600 dark:text-gray-400"> · {entry.org}</span>}
    </h3>
    {entry.dates && <span class="text-sm text-gray-500 whitespace-nowrap">{entry.dates}</span>}
  </div>
  {
    entry.html && (
      <div class="mt-1 text-sm text-gray-700 dark:text-gray-300" set:html={entry.html} />
    )
  }
</div>
```

- [ ] **Step 2: Create `src/components/TimelineSection.astro`**

```astro
---
import TimelineEntry from './TimelineEntry.astro';
import type { TimelineSectionData } from '../lib/parseResume';

export interface Props {
  section: TimelineSectionData;
}

const { section } = Astro.props;
---

<section id={section.slug} class="mb-10 scroll-mt-20">
  <h2 class="text-xl font-semibold mb-4 border-b border-gray-200 dark:border-gray-800 pb-1">
    {section.heading}
  </h2>
  <div class="relative border-l-2 border-gray-300 dark:border-gray-700 pl-6 space-y-8">
    {section.entries.map((entry) => <TimelineEntry entry={entry} />)}
  </div>
</section>
```

- [ ] **Step 3: Verify the build still passes**

Run: `pnpm build`
Expected: `Complete!`

- [ ] **Step 4: Commit**

```bash
git add src/components/TimelineEntry.astro src/components/TimelineSection.astro
git commit -m "Add TimelineSection and TimelineEntry components"
```

---

### Task 8: Nav component

**Files:**
- Create: `src/components/Nav.astro`

**Interfaces:**
- Consumes: `Section` type from `src/lib/parseResume.ts` (Task 4).
- Produces: `<Nav>` used by `ResumePage.astro` (Task 11).

- [ ] **Step 1: Create `src/components/Nav.astro`**

```astro
---
import type { Section } from '../lib/parseResume';

export interface Props {
  sections: Section[];
}

const { sections } = Astro.props;
---

{
  sections.length > 0 && (
    <nav class="print:hidden mb-8 flex flex-wrap gap-4 text-sm border-b border-gray-200 dark:border-gray-800 pb-4">
      {sections.map((section) => (
        <a href={`#${section.slug}`} class="hover:underline">
          {section.heading}
        </a>
      ))}
    </nav>
  )
}
```

- [ ] **Step 2: Verify the build still passes**

Run: `pnpm build`
Expected: `Complete!`

- [ ] **Step 3: Commit**

```bash
git add src/components/Nav.astro
git commit -m "Add in-page Nav component, hidden on print"
```

---

### Task 9: ThemeToggle component

**Files:**
- Create: `src/components/ThemeToggle.astro`

**Interfaces:**
- Produces: `<ThemeToggle>` used by `ResumePage.astro` (Task 11). No props — it's self-contained (reads/writes `localStorage` and toggles the `dark` class on `<html>`).

- [ ] **Step 1: Create `src/components/ThemeToggle.astro`**

```astro
<button
  id="theme-toggle"
  type="button"
  class="print:hidden text-sm px-3 py-1 rounded border border-gray-300 dark:border-gray-700"
  aria-label="Toggle dark mode"
>
  <span class="dark:hidden">🌙 Dark</span>
  <span class="hidden dark:inline">☀️ Light</span>
</button>

<script is:inline>
  document.getElementById('theme-toggle')?.addEventListener('click', () => {
    const root = document.documentElement;
    const isDark = root.classList.toggle('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  });
</script>
```

- [ ] **Step 2: Verify the build still passes**

Run: `pnpm build`
Expected: `Complete!`

- [ ] **Step 3: Commit**

```bash
git add src/components/ThemeToggle.astro
git commit -m "Add ThemeToggle component with localStorage persistence"
```

---

### Task 10: ResumeLayout (page shell, metadata, pre-paint dark-mode script)

**Files:**
- Create: `src/layouts/ResumeLayout.astro`

**Interfaces:**
- Consumes: `src/styles/global.css` (Task 1).
- Produces: `<ResumeLayout>` with props `{ name: string; title: string; lang: string }` and a default `<slot />`, used by `ResumePage.astro` (Task 11).

- [ ] **Step 1: Create `src/layouts/ResumeLayout.astro`**

```astro
---
import '../styles/global.css';

export interface Props {
  name: string;
  title: string;
  lang: string;
}

const { name, title, lang } = Astro.props;
const pageTitle = `${name} — ${title}`;
---

<html lang={lang}>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{pageTitle}</title>
    <meta name="description" content={title} />
    <meta property="og:title" content={pageTitle} />
    <meta property="og:description" content={title} />
    <meta property="og:type" content="profile" />
    <script is:inline>
      (function () {
        const stored = localStorage.getItem('theme');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (stored === 'dark' || (!stored && prefersDark)) {
          document.documentElement.classList.add('dark');
        }
      })();
    </script>
  </head>
  <body class="bg-white text-gray-900 dark:bg-gray-900 dark:text-gray-100 print:bg-white print:text-black">
    <div class="max-w-3xl mx-auto px-4 py-8">
      <slot />
    </div>
  </body>
</html>
```

- [ ] **Step 2: Verify the build still passes**

Run: `pnpm build`
Expected: `Complete!`

- [ ] **Step 3: Commit**

```bash
git add src/layouts/ResumeLayout.astro
git commit -m "Add ResumeLayout page shell with metadata and dark-mode pre-paint script"
```

---

### Task 11: ResumePage composition, default-locale route, and sample resume.md

**Files:**
- Create: `src/components/ResumePage.astro`
- Modify: `src/pages/index.astro` (replaces the Task 1 placeholder)
- Create: `resume.md` (project root — sample content)

**Interfaces:**
- Consumes: `ResumeLayout` (Task 10), `Header`, `Section`, `TimelineSection`, `Nav`, `ThemeToggle` (Tasks 6-9), `ParsedResume` type + `parseResumeMarkdown` (Task 4), `discoverResumeFiles` (Task 5). `LanguageSwitcher` (added in Task 12) is referenced here but stubbed until then — see Step 1 note.
- Produces: the working single-language site at `/`.

- [ ] **Step 1: Create `src/components/ResumePage.astro`**

Note: this references `LanguageSwitcher`, which doesn't exist until Task 12. To keep this task's build green on its own, render the language switcher inline as a no-op placeholder for now, then Task 12 replaces this whole block with the real `<LanguageSwitcher>` import and usage.

```astro
---
import ResumeLayout from '../layouts/ResumeLayout.astro';
import Header from './Header.astro';
import Nav from './Nav.astro';
import Section from './Section.astro';
import TimelineSection from './TimelineSection.astro';
import ThemeToggle from './ThemeToggle.astro';
import type { ParsedResume } from '../lib/parseResume';

export interface Props {
  resume: ParsedResume;
  lang: string;
}

const { resume, lang } = Astro.props;
---

<ResumeLayout name={resume.name} title={resume.title} lang={lang}>
  <div class="flex justify-end mb-6">
    <ThemeToggle />
  </div>
  <Header
    name={resume.name}
    title={resume.title}
    photo={resume.photo}
    links={resume.links}
    summaryHtml={resume.summaryHtml}
  />
  <Nav sections={resume.sections} />
  {
    resume.sections.map((section) =>
      section.type === 'timeline' ? (
        <TimelineSection section={section} />
      ) : (
        <Section section={section} />
      )
    )
  }
</ResumeLayout>
```

- [ ] **Step 2: Replace `src/pages/index.astro`**

```astro
---
import fs from 'node:fs';
import ResumePage from '../components/ResumePage.astro';
import { discoverResumeFiles } from '../lib/discoverResumeFiles';
import { parseResumeMarkdown } from '../lib/parseResume';

const files = discoverResumeFiles(process.cwd());
const defaultFile = files.find((f) => f.isDefault)!;
const raw = fs.readFileSync(defaultFile.filePath, 'utf-8');
const resume = parseResumeMarkdown(raw);
---

<ResumePage resume={resume} lang={defaultFile.locale} />
```

- [ ] **Step 3: Create the sample `resume.md` at the project root**

```md
---
name: Jane Doe
title: Software Engineer
lang: en
links:
  - "[GitHub](https://github.com/janedoe)"
  - "[Email](mailto:jane@example.com)"
---

Building reliable systems for **8+ years**, with a focus on developer tools and distributed systems.

## Experience

### Senior Engineer | Acme Corp | 2022 - Present
Led the platform team rewriting the deployment pipeline, cutting release time by half.

### Engineer | Beta Inc | 2019 - 2022
Built and maintained the core API serving 2M+ daily requests.

## Education

### MSc Computer Science | Some University | 2015 - 2019

## Languages

- English (native)
- French (fluent)

## Skills

- TypeScript, Node.js, React
- PostgreSQL, Redis
- AWS, Docker
```

- [ ] **Step 4: Verify the build works and produces expected output**

Run: `pnpm build`
Expected: `Complete!`, `dist/index.html` contains "Jane Doe" and "Senior Engineer".

Run: `pnpm dev`, open `http://localhost:4321/` in a browser.
Expected: header with name/title/links, nav bar linking to Experience/Education/Languages/Skills, Experience and Education render as a timeline with dots, Languages and Skills render as plain lists, dark mode toggle works and persists across reload, jumping via nav scrolls to the right section.

- [ ] **Step 5: Commit**

```bash
git add src/components/ResumePage.astro src/pages/index.astro resume.md
git commit -m "Wire up default-locale resume page with sample content"
```

---

### Task 12: LanguageSwitcher and the `/[locale]/` route

**Files:**
- Create: `src/components/LanguageSwitcher.astro`
- Modify: `src/components/ResumePage.astro` (replace the placeholder from Task 11 with the real switcher)
- Modify: `src/pages/index.astro` (pass locale info down)
- Create: `src/pages/[locale]/index.astro`
- Create: `resume.fr.md` (project root — sample French content)

**Interfaces:**
- Consumes: `discoverResumeFiles` (Task 5), `parseResumeMarkdown` (Task 4), `ResumePage` (Task 11).
- Produces: the working multi-language site at `/` and `/fr/`.

- [ ] **Step 1: Create `src/components/LanguageSwitcher.astro`**

```astro
---
export interface Props {
  defaultLocale: string;
  otherLocales: string[];
  currentLocale: string;
}

const { defaultLocale, otherLocales, currentLocale } = Astro.props;
const allLocales = [defaultLocale, ...otherLocales];
---

{
  allLocales.length > 1 && (
    <nav class="print:hidden flex gap-3 text-sm">
      {allLocales.map((locale) => (
        <a
          href={locale === defaultLocale ? '/' : `/${locale}/`}
          class={locale === currentLocale ? 'font-semibold underline' : 'hover:underline'}
          aria-current={locale === currentLocale ? 'page' : undefined}
        >
          {locale.toUpperCase()}
        </a>
      ))}
    </nav>
  )
}
```

- [ ] **Step 2: Update `src/components/ResumePage.astro`**

Replace the whole file content with:

```astro
---
import ResumeLayout from '../layouts/ResumeLayout.astro';
import Header from './Header.astro';
import Nav from './Nav.astro';
import Section from './Section.astro';
import TimelineSection from './TimelineSection.astro';
import ThemeToggle from './ThemeToggle.astro';
import LanguageSwitcher from './LanguageSwitcher.astro';
import type { ParsedResume } from '../lib/parseResume';

export interface Props {
  resume: ParsedResume;
  lang: string;
  defaultLocale: string;
  otherLocales: string[];
}

const { resume, lang, defaultLocale, otherLocales } = Astro.props;
---

<ResumeLayout name={resume.name} title={resume.title} lang={lang}>
  <div class="flex justify-between items-center mb-6">
    <LanguageSwitcher defaultLocale={defaultLocale} otherLocales={otherLocales} currentLocale={lang} />
    <ThemeToggle />
  </div>
  <Header
    name={resume.name}
    title={resume.title}
    photo={resume.photo}
    links={resume.links}
    summaryHtml={resume.summaryHtml}
  />
  <Nav sections={resume.sections} />
  {
    resume.sections.map((section) =>
      section.type === 'timeline' ? (
        <TimelineSection section={section} />
      ) : (
        <Section section={section} />
      )
    )
  }
</ResumeLayout>
```

- [ ] **Step 3: Update `src/pages/index.astro`**

Replace the whole file content with:

```astro
---
import fs from 'node:fs';
import ResumePage from '../components/ResumePage.astro';
import { discoverResumeFiles } from '../lib/discoverResumeFiles';
import { parseResumeMarkdown } from '../lib/parseResume';

const files = discoverResumeFiles(process.cwd());
const defaultFile = files.find((f) => f.isDefault)!;
const otherFiles = files.filter((f) => !f.isDefault);
const raw = fs.readFileSync(defaultFile.filePath, 'utf-8');
const resume = parseResumeMarkdown(raw);
---

<ResumePage
  resume={resume}
  lang={defaultFile.locale}
  defaultLocale={defaultFile.locale}
  otherLocales={otherFiles.map((f) => f.locale)}
/>
```

- [ ] **Step 4: Create `src/pages/[locale]/index.astro`**

```astro
---
import fs from 'node:fs';
import ResumePage from '../../components/ResumePage.astro';
import { discoverResumeFiles } from '../../lib/discoverResumeFiles';
import { parseResumeMarkdown } from '../../lib/parseResume';

export function getStaticPaths() {
  const files = discoverResumeFiles(process.cwd());
  return files
    .filter((f) => !f.isDefault)
    .map((f) => ({
      params: { locale: f.locale },
      props: { filePath: f.filePath, locale: f.locale },
    }));
}

const { filePath, locale } = Astro.props;
const files = discoverResumeFiles(process.cwd());
const defaultFile = files.find((f) => f.isDefault)!;
const otherFiles = files.filter((f) => !f.isDefault);
const raw = fs.readFileSync(filePath, 'utf-8');
const resume = parseResumeMarkdown(raw);
---

<ResumePage
  resume={resume}
  lang={locale}
  defaultLocale={defaultFile.locale}
  otherLocales={otherFiles.map((f) => f.locale)}
/>
```

- [ ] **Step 5: Create the sample `resume.fr.md` at the project root**

```md
---
name: Jane Doe
title: Ingénieure Logicielle
links:
  - "[GitHub](https://github.com/janedoe)"
  - "[Email](mailto:jane@example.com)"
---

Je construis des systèmes fiables depuis **8+ ans**, avec un focus sur les outils pour développeurs et les systèmes distribués.

## Expérience

### Ingénieure Senior | Acme Corp | 2022 - Présent
J'ai dirigé l'équipe plateforme dans la réécriture du pipeline de déploiement, réduisant de moitié le temps de release.

### Ingénieure | Beta Inc | 2019 - 2022
J'ai construit et maintenu l'API principale servant plus de 2M de requêtes par jour.

## Éducation

### MSc Informatique | Some University | 2015 - 2019

## Langues

- Anglais (natif)
- Français (courant)

## Compétences

- TypeScript, Node.js, React
- PostgreSQL, Redis
- AWS, Docker
```

- [ ] **Step 6: Verify the build works and produces both locales**

Run: `pnpm build`
Expected: `Complete!`, `dist/index.html` and `dist/fr/index.html` both exist; the French page contains "Ingénieure Logicielle".

Run: `pnpm dev`, open `http://localhost:4321/` then `http://localhost:4321/fr/`.
Expected: switcher shows "EN" / "FR", the current one bold/underlined, clicking the other navigates to the other locale's page with its own content; switcher and toggle both disappear in print preview (Cmd+P).

- [ ] **Step 7: Run the full test suite one more time**

Run: `pnpm test`
Expected: PASS — all unit tests from Tasks 2-5 still green (no regressions).

- [ ] **Step 8: Commit**

```bash
git add src/components/LanguageSwitcher.astro src/components/ResumePage.astro src/pages/index.astro src/pages/[locale]/index.astro resume.fr.md
git commit -m "Add language switcher and per-locale route"
```

---

### Task 13: README and deployment docs

**Files:**
- Create: `README.md`

**Interfaces:**
- None — documentation only.

- [ ] **Step 1: Create `README.md`**

```md
# Resume

A static, developer-friendly resume site generated from a markdown file. No backend, no CMS — clone, edit `resume.md`, deploy.

## Quick start

\`\`\`bash
pnpm install
pnpm dev       # preview at http://localhost:4321
\`\`\`

Edit `resume.md` in the project root with your own name, title, links, and sections. Structure:

- YAML frontmatter: `name`, `title`, optionally `lang` (defaults to `en`), `photo` (markdown image syntax, e.g. `"![Alt](./photo.jpg)"`), `links` (list of markdown links, e.g. `"[GitHub](https://github.com/you)"`).
- Any text before the first `## Heading` is your summary paragraph.
- Each `## Heading` becomes a page section (nav, anchor, etc).
- Within a section, `### Title | Org | Dates` starts a timeline entry (used for Experience, Education, etc). A section with no `###` entries just renders as plain markdown — use this for Languages, Skills, and similar lists.

## Multiple languages

Add `resume.<locale>.md` (e.g. `resume.fr.md`) for each additional language — same format as `resume.md`, fully independent content. Once you add one, `resume.md` must declare its own `lang` in frontmatter (e.g. `lang: en`), since it's no longer the only language. Don't want multiple languages? Just delete the extra file(s) — `lang` becomes optional again automatically.

## Print / PDF

Use your browser's print dialog (Cmd/Ctrl+P → Save as PDF). Navigation and the theme/language switches are automatically hidden when printing.

## Build & deploy

\`\`\`bash
pnpm build     # outputs to dist/
\`\`\`

Deploy the `dist/` folder to Cloudflare Pages (build command: `pnpm build`, output directory: `dist`).
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "Add README with usage and deployment instructions"
```

---

## Self-Review Notes

- **Spec coverage:** every spec section maps to a task — Content format/parsing (2-4), Internationalization (5, 12), Architecture (2-5, 11-12), Components (6-10, 12), Styling/print (8, 9, 10), Error handling (2-5 tests), Testing (2-5), Deployment (1, 13). Print-specific PDF behavior is native browser functionality plus `print:hidden`/`print:bg-white` utilities already present in Tasks 8-10 — no separate task needed.
- **Placeholder scan:** no TBDs; the one intentional stand-in (Task 11's inline theme-toggle-only header, replaced in Task 12) is fully specified code, not a placeholder, and is explicitly called out and resolved one task later.
- **Type consistency:** `ParsedResume`, `Section`, `TimelineSectionData`, `ProseSection`, `TimelineEntry`, `Link`, `Photo` (Tasks 2-4) are the only shared types; every later task imports them by these exact names. `discoverResumeFiles`/`DiscoveredResumeFile` (Task 5) and `parseResumeMarkdown` (Task 4) are the only cross-file functions consumed downstream, and their signatures are stable from the task that introduces them through Task 12.
