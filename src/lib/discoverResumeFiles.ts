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
