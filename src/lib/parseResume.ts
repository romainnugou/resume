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
