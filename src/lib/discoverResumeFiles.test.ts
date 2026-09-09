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
