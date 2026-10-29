// A post goes live on its date, and not a moment before: it stays out of the
// blog index, the RSS feed, the sitemap and the home page's latest list.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { isPublished } from '../src/lib/published.js';

const root = fileURLToPath(new URL('..', import.meta.url));
const posts = join(root, 'src/content/blog');
const post = (date) => ({ data: { date: new Date(date) } });

test('a post dated today or earlier is published', () => {
  const now = new Date('2026-11-08T07:00:00Z');
  assert.equal(isPublished(post('2026-11-08'), now), true);
  assert.equal(isPublished(post('2026-10-28'), now), true);
});

test('a post dated later waits for its day', () => {
  assert.equal(isPublished(post('2026-11-08'), new Date('2026-11-07T23:59:59Z')), false);
});

const future = 'zz-scheduled-fixture';
const title = 'Scheduled fixture';

test('no test fixture has leaked into the real posts', () => {
  for (const name of readdirSync(posts)) {
    assert.ok(!name.startsWith('zz-'), `${name} looks like a test fixture`);
    assert.ok(!readFileSync(join(posts, name), 'utf8').includes(`title: ${title}`), `${name} has the fixture's title`);
  }
});

// Build the real site from a copy of the posts plus one dated far in the future.
// BLOG_DIR points the blog collection at the copy, so src is never written to.
const tmp = mkdtempSync(join(tmpdir(), 'tachyon-published-'));
const blogDir = join(tmp, 'blog');
const out = join(tmp, 'dist');
const read = (file) => readFileSync(join(out, file), 'utf8');

before(() => {
  cpSync(posts, blogDir, { recursive: true });
  writeFileSync(join(blogDir, `${future}.md`), `---\ntitle: ${title}\ndescription: Not yet.\ndate: 2999-01-01\n---\n\nLater.\n`);
  execFileSync('npx', ['astro', 'build', '--outDir', out], {
    cwd: root,
    stdio: 'pipe',
    env: { ...process.env, BLOG_DIR: blogDir },
  });
});
after(() => rmSync(tmp, { recursive: true, force: true }));

const places = { 'blog index': 'blog.html', 'RSS feed': 'rss.xml', sitemap: 'sitemap-0.xml', 'home latest list': 'index.html' };
for (const [name, file] of Object.entries(places)) {
  test(`the ${name} lists a published post and leaves out the future one`, () => {
    const text = read(file);
    assert.match(text, /\/blog\/[a-z0-9-]+/);
    assert.doesNotMatch(text, new RegExp(future));
    assert.doesNotMatch(text, new RegExp(title));
  });
}

test('the future post has no page of its own yet', () => {
  assert.equal(existsSync(join(out, `blog/${future}.html`)), false);
});
