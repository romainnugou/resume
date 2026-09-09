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
