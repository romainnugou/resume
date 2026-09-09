import matter from 'gray-matter';
import { marked } from 'marked';

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

function splitBeforeHeadingLevel(
  body: string,
  level: number
): { summaryMd: string; rest: string } {
  const marker = '#'.repeat(level) + ' ';
  const match = body.match(new RegExp(`^${marker}`, 'm'));
  if (!match || match.index === undefined) {
    return { summaryMd: body.trim(), rest: '' };
  }
  return {
    summaryMd: body.slice(0, match.index).trim(),
    rest: body.slice(match.index).trim(),
  };
}

export function splitSummaryAndBody(body: string): { summaryMd: string; rest: string } {
  return splitBeforeHeadingLevel(body, 2);
}

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
  introHtml?: string;
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

    const { summaryMd: introMd } = splitBeforeHeadingLevel(body, 3);
    const introHtml = introMd ? (marked.parse(introMd) as string) : undefined;

    const entries: TimelineEntry[] = entryBlocks.map(({ title: entryTitle, body: entryBody }) => {
      const parts = entryTitle.split('|').map((part) => part.trim());
      return {
        title: parts[0] ?? '',
        org: parts[1] ?? '',
        dates: parts[2] ?? '',
        html: entryBody ? (marked.parse(entryBody) as string) : '',
      };
    });

    return { type: 'timeline', heading, slug, introHtml, entries };
  });

  return { name, title, lang, photo, links, summaryHtml, sections };
}
