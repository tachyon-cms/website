// A post goes live on its date, and not a moment before: it stays out of the
// blog index, the RSS feed, the sitemap and the home page's latest list.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { isPublished } from '../src/lib/published.js';

const root = fileURLToPath(new URL('..', import.meta.url));
const post = (date) => ({ data: { date: new Date(date) } });

test('a post dated today or earlier is published', () => {
  const now = new Date('2026-11-08T07:00:00Z');
  assert.equal(isPublished(post('2026-11-08'), now), true);
  assert.equal(isPublished(post('2026-10-28'), now), true);
});

test('a post dated later waits for its day', () => {
  assert.equal(isPublished(post('2026-11-08'), new Date('2026-11-07T23:59:59Z')), false);
});

// Build the real site, with one extra post dated tomorrow, into a temp dir.
const future = 'zz-scheduled-fixture';
const fixture = join(root, 'src/content/blog', `${future}.md`);
const out = mkdtempSync(join(tmpdir(), 'tachyon-published-'));
const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
const read = (file) => readFileSync(join(out, file), 'utf8');

before(() => {
  writeFileSync(fixture, `---\ntitle: Scheduled fixture\ndescription: Not yet.\ndate: ${tomorrow}\n---\n\nTomorrow.\n`);
  try {
    execFileSync('npx', ['astro', 'build', '--outDir', out], { cwd: root, stdio: 'pipe' });
  } finally {
    rmSync(fixture);
  }
});
after(() => rmSync(out, { recursive: true, force: true }));

const places = { 'blog index': 'blog.html', 'RSS feed': 'rss.xml', sitemap: 'sitemap-0.xml', 'home latest list': 'index.html' };
for (const [name, file] of Object.entries(places)) {
  test(`the ${name} lists a published post and leaves out tomorrow's`, () => {
    const text = read(file);
    assert.match(text, /\/blog\/v0-1-0\b/);
    assert.doesNotMatch(text, new RegExp(future));
  });
}

test("tomorrow's post has no page of its own yet", () => {
  assert.throws(() => read(`blog/${future}.html`), { code: 'ENOENT' });
});
