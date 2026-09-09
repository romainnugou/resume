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
