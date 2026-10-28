// The reference pages must cover the whole v0.1.0 surface, and nothing else.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { configKeys, errors, fieldOptions, fieldTypes, operators, routes } from './v0.1.0-surface.mjs';

const page = (name) =>
  readFileSync(new URL(`../src/content/docs/reference/${name}.md`, import.meta.url), 'utf8');

// The lines from `## title` up to the next heading at that level or above.
const section = (text, title) => {
  const lines = text.split('\n');
  const start = lines.findIndex((l) => l.trim() === title);
  assert.ok(start >= 0, `missing section ${title}`);
  const level = title.match(/^#+/)[0].length;
  const end = lines.findIndex((l, i) => i > start && /^#+ /.test(l) && l.match(/^#+/)[0].length <= level);
  return lines.slice(start + 1, end < 0 ? undefined : end).join('\n');
};

// First-column names in a table: `| \`name\` |`.
const tableNames = (text) => [...text.matchAll(/^\| `([^`]+)` \|/gm)].map((m) => m[1]);

const sorted = (xs) => [...xs].sort();

const apiAreas = ['auth', 'users-and-roles', 'collections', 'documents'];

test('the http-api area pages have one section per endpoint between them', () => {
  const headings = apiAreas.flatMap((area) =>
    [...page(`http-api/${area}`).matchAll(/^### `([A-Z]+ \/api\/[^`]*)`$/gm)].map((m) => m[1]),
  );
  assert.deepEqual(sorted(headings), sorted(routes));
});

test('the http-api overview lists every endpoint once, linking to its section', () => {
  const rows = [...section(page('http-api'), '## All endpoints').matchAll(/^\| \[`([^`]+)`\]\(\/reference\/http-api\/([a-z-]+)#[a-z0-9-]+\) \|/gm)];
  assert.deepEqual(sorted(rows.map((m) => m[1])), sorted(routes));
  for (const [, route, area] of rows) {
    assert.ok(page(`http-api/${area}`).includes(`### \`${route}\``), `${route} is not on ${area}`);
  }
});

test('field-types has a section per type, listing every option', () => {
  const text = page('field-types');
  const headings = [...text.matchAll(/^### `([a-z]+)`$/gm)].map((m) => m[1]);
  assert.deepEqual(sorted(headings), sorted(Object.keys(fieldTypes)));
  for (const [type, options] of Object.entries(fieldTypes)) {
    assert.deepEqual(sorted(tableNames(section(text, `### \`${type}\``))), sorted(options), type);
  }
  assert.deepEqual(sorted(tableNames(section(text, '## Options on every field'))), sorted(fieldOptions));
  assert.match(text, /`checkbox`/);
});

test('filters lists exactly the operators', () => {
  assert.deepEqual(sorted(tableNames(section(page('filters'), '## Operators'))), sorted(operators));
});

test('config lists exactly the keys, each with its own variable', () => {
  const text = page('config');
  const rows = [
    ...section(text, '## Top-level keys').matchAll(/^\| `([^`]+)` \| `([^`]+)` \|/gm),
    ...section(text, '## `[auth]`').matchAll(/^\| `([^`]+)` \| `([^`]+)` \|/gm),
  ];
  const found = Object.fromEntries(rows.map((m) => [m[1], m[2]]));
  const want = Object.fromEntries(
    configKeys.map((k) => [k.split('.').pop(), `TACHYON_${k.replace('.', '__').toUpperCase()}`]),
  );
  assert.deepEqual(found, want);
});

test('errors lists exactly the statuses and titles', () => {
  const rows = [...page('errors').matchAll(/^\| `(\d{3})` \| ([^|]+?) \|/gm)].map((m) => `${m[1]} ${m[2]}`);
  assert.deepEqual(sorted(rows), sorted(errors.map(([status, title]) => `${status} ${title}`)));
});
