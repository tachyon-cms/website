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

test('http-api has one section per endpoint', () => {
  const headings = [...page('http-api').matchAll(/^### `([A-Z]+ \/api\/[^`]*)`$/gm)].map((m) => m[1]);
  assert.deepEqual(sorted(headings), sorted(routes));
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

test('config lists every key with its environment variable', () => {
  const text = page('config');
  for (const key of configKeys) {
    const name = key.split('.').pop();
    assert.match(text, new RegExp(`^\\| \`${name}\` \\|`, 'm'), key);
    assert.ok(text.includes(`TACHYON_${key.replace('.', '__').toUpperCase()}`), key);
  }
});

test('errors lists every status and title', () => {
  const text = page('errors');
  for (const [status, title] of errors) {
    assert.match(text, new RegExp(`^\\| \`${status}\` \\| ${title} \\|`, 'm'), `${status} ${title}`);
  }
});
