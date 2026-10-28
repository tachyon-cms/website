import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';

// Each comparison cites the other product's own site for every claim about it.
const products: Record<string, string[]> = {
  wordpress: ['wordpress.org', 'developer.wordpress.org', 'wordpress.com'],
  strapi: ['strapi.io', 'docs.strapi.io'],
  contentful: ['www.contentful.com'],
  sanity: ['www.sanity.io', 'github.com'],
  directus: ['directus.com', 'github.com'],
};

const frontmatter = (slug: string) => {
  const md = readFileSync(new URL(`../src/content/compare/${slug}.md`, import.meta.url), 'utf8');
  return parse(md.split(/^---$/m)[1]);
};

const day = 24 * 60 * 60 * 1000;

describe.each(Object.keys(products))('compare/%s', (slug) => {
  const page = frontmatter(slug);

  it('cites the product’s own site for every row', () => {
    expect(page.rows.length).toBeGreaterThan(0);
    for (const row of page.rows) {
      expect(row.topic && row.tachyon && row.them, JSON.stringify(row)).toBeTruthy();
      const url = new URL(row.source);
      expect(url.protocol).toBe('https:');
      expect(products[slug], row.source).toContain(url.hostname);
    }
  });

  it('was checked in the last 180 days', () => {
    const age = Date.now() - new Date(page.checked).getTime();
    expect(age).toBeGreaterThanOrEqual(-day);
    expect(age).toBeLessThanOrEqual(180 * day);
  });

  it('says where TachyonCMS isn’t there yet', () => {
    expect(page.notYet.length).toBeGreaterThan(0);
  });
});
