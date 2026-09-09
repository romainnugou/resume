import { describe, it, expect } from 'vitest';
import { parseLinkString, parsePhotoString, slugify, splitOnHeadingLevel, splitSummaryAndBody } from './parseResume';

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
