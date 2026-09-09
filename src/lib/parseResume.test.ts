import { describe, it, expect } from 'vitest';
import { parseLinkString, parsePhotoString, slugify, splitOnHeadingLevel, splitSummaryAndBody, parseResumeMarkdown } from './parseResume';

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
