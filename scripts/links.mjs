// Fails when a link in the built site points at a page that doesn't exist.
//
//   node scripts/links.mjs <site-dist> <docs-dist>
//
// Checks every href in the site's HTML that is internal ("/path" or
// https://tachyoncms.com/path) against the site build, and every
// https://docs.tachyoncms.com/path link against the docs build. A #fragment
// must match an id on the target page. /api/ is skipped: it's served by
// Pages Functions, not files.

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { parse } from "parse5";

const [siteDir, docsDir] = process.argv.slice(2);
if (!siteDir || !docsDir) {
  console.error("usage: node scripts/links.mjs <site-dist> <docs-dist>");
  process.exit(2);
}

function walk(node, fn) {
  fn(node);
  for (const kid of node.childNodes ?? []) walk(kid, fn);
  if (node.content) walk(node.content, fn);
}

// The file a URL path is served from, the way Pages and Workers assets map it.
function resolve(dir, path) {
  const p = decodeURIComponent(path).replace(/\/$/, "");
  for (const c of [p, `${p}.html`, `${p}/index.html`]) {
    const file = join(dir, c);
    if (existsSync(file) && statSync(file).isFile()) return file;
  }
}

const ids = new Map();
function idsOf(file) {
  if (!ids.has(file)) {
    const set = new Set();
    walk(parse(readFileSync(file, "utf8")), (n) => {
      for (const a of n.attrs ?? []) if (a.name === "id" || (n.nodeName === "a" && a.name === "name")) set.add(a.value);
    });
    ids.set(file, set);
  }
  return ids.get(file);
}

function target(href, page) {
  let url;
  try {
    url = new URL(href, "https://tachyoncms.com" + page);
  } catch {
    return;
  }
  if (url.hostname === "tachyoncms.com" && !url.pathname.startsWith("/api/")) return [siteDir, url];
  if (url.hostname === "docs.tachyoncms.com") return [docsDir, url];
}

let bad = 0;
for (const e of readdirSync(siteDir, { withFileTypes: true, recursive: true })) {
  if (!e.isFile() || !e.name.endsWith(".html")) continue;
  const file = join(e.parentPath, e.name);
  const page = "/" + relative(siteDir, file).replace(/(index)?\.html$/, "");
  walk(parse(readFileSync(file, "utf8")), (n) => {
    if (n.nodeName !== "a" && n.nodeName !== "link") return;
    const href = n.attrs.find((a) => a.name === "href")?.value;
    const t = href && !/^(mailto|tel|javascript):/.test(href) && target(href, page);
    if (!t) return;
    const [dir, url] = t;
    const found = resolve(dir, url.pathname);
    const frag = decodeURIComponent(url.hash.slice(1));
    if (!found) {
      bad++;
      console.log(`${relative(".", file)}: ${href} has no page`);
    } else if (frag && found.endsWith(".html") && !idsOf(found).has(frag)) {
      bad++;
      console.log(`${relative(".", file)}: ${href} has no #${frag}`);
    }
  });
}

if (bad) {
  console.log(`\n${bad} broken link(s).`);
  process.exit(1);
}
console.log("All site links resolve.");
