// Allows exactly the inline stylesheets the build produced: hashes each one and writes the
// hashes into the content security policy in dist/_headers. Also copies the stylesheet for
// the pages the signup functions render, which link it rather than inline it.
import { createHash } from 'node:crypto';
import { copyFileSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const dist = new URL('../dist/', import.meta.url).pathname;

function pages(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? pages(join(dir, e.name)) : e.name.endsWith('.html') ? [join(dir, e.name)] : [],
  );
}

const hashes = new Set();
for (const page of pages(dist)) {
  const html = readFileSync(page, 'utf8');
  if (/<style[^>]*\s(nonce|media)=/.test(html) || /\sstyle="/.test(html)) {
    throw new Error(`${page}: inline style attributes aren't allowed by the policy`);
  }
  for (const [, css] of html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)) {
    hashes.add(`'sha256-${createHash('sha256').update(css).digest('base64')}'`);
  }
}

const headersPath = join(dist, '_headers');
const headers = readFileSync(headersPath, 'utf8');
if (!headers.includes('STYLE_HASHES')) throw new Error('_headers has no STYLE_HASHES placeholder');
writeFileSync(headersPath, headers.replace('STYLE_HASHES', [...hashes].join(' ')));
copyFileSync(new URL('../src/styles/site.css', import.meta.url), join(dist, 'site.css'));
console.log(`csp: allowed ${hashes.size} inline stylesheet(s)`);
