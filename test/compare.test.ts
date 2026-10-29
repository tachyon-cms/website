import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';

// Each comparison cites the other product's own site for every claim about it:
// one of its hosts, or its own organisation on GitHub.
const products: Record<string, { hosts: string[]; github: string }> = {
  wordpress: { hosts: ['wordpress.org', 'developer.wordpress.org', 'wordpress.com'], github: '/WordPress/' },
  strapi: { hosts: ['strapi.io', 'docs.strapi.io'], github: '/strapi/' },
  contentful: { hosts: ['www.contentful.com'], github: '/contentful/' },
  sanity: { hosts: ['www.sanity.io'], github: '/sanity-io/' },
  directus: { hosts: ['directus.com'], github: '/directus/' },
};

// A path, not a URL: the Workers and Node typings each declare their own URL.
const dir = join(import.meta.dirname, '../src/content/compare');
const slugs = readdirSync(dir)
  .filter((f) => f.endsWith('.md'))
  .map((f) => f.slice(0, -3));
const frontmatter = (slug: string) => parse(readFileSync(join(dir, `${slug}.md`), 'utf8').split(/^---$/m)[1]);

const day = 24 * 60 * 60 * 1000;

it('has a page for every product it knows, and no others', () => {
  expect(slugs.sort()).toEqual(Object.keys(products).sort());
});

describe.each(slugs)('compare/%s', (slug) => {
  const page = frontmatter(slug);
  const own = products[slug];

  it('cites the product’s own site for every row', () => {
    expect(own, `unknown product ${slug}`).toBeDefined();
    expect(page.rows.length).toBeGreaterThan(0);
    for (const row of page.rows) {
      expect(row.topic && row.tachyon && row.them, JSON.stringify(row)).toBeTruthy();
      const url = new URL(row.source);
      expect(url.protocol).toBe('https:');
      const ok =
        own.hosts.includes(url.hostname) || (url.hostname === 'github.com' && url.pathname.startsWith(own.github));
      expect(ok, row.source).toBe(true);
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
