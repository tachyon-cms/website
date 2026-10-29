// Runs scripts/links.mjs against small fake site and docs builds.
// Run with: node --test scripts/*.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const script = new URL("./links.mjs", import.meta.url).pathname;
const page = (body) => `<!doctype html><html><head><title>t</title></head><body>${body}</body></html>`;

function run(site) {
  const dir = mkdtempSync(join(tmpdir(), "links-"));
  const files = {
    "site/index.html": page(site),
    "site/blog.html": page("<h2 id='latest'>x</h2>"),
    "site/blog/post.html": page(""),
    "site/rss.xml": "<rss/>",
    "docs/index.html": page(""),
    "docs/access-rules/index.html": page("<h2 id='rules'>x</h2>"),
  };
  for (const [name, html] of Object.entries(files)) {
    mkdirSync(join(dir, name, ".."), { recursive: true });
    writeFileSync(join(dir, name), html);
  }
  const r = spawnSync(process.execPath, [script, join(dir, "site"), join(dir, "docs")], { encoding: "utf8" });
  return { code: r.status, out: r.stdout + r.stderr };
}

test("links that resolve pass", () => {
  const r = run(`
    <a href="/">home</a><a href="/blog">blog</a><a href="/blog/">blog</a><a href="/blog/post">p</a>
    <a href="/blog#latest">l</a><a href="/rss.xml">rss</a><a href="https://tachyoncms.com/blog">abs</a>
    <a href="/api/subscribe">fn</a><a href="mailto:hello@tachyoncms.com">m</a><a href="https://github.com/x">gh</a>
    <a href="https://docs.tachyoncms.com">docs</a><a href="https://docs.tachyoncms.com/access-rules#rules">rules</a>`);
  assert.equal(r.code, 0, r.out);
});

test("a missing site page fails", () => {
  const r = run(`<a href="/roadmap">r</a>`);
  assert.equal(r.code, 1);
  assert.match(r.out, /\/roadmap has no page/);
});

test("a missing docs page fails", () => {
  const r = run(`<a href="https://docs.tachyoncms.com/reference/http-api">api</a>`);
  assert.equal(r.code, 1);
  assert.match(r.out, /http-api has no page/);
});

test("a missing fragment fails", () => {
  const r = run(`<a href="https://docs.tachyoncms.com/access-rules#nope">x</a><a href="/blog#gone">y</a>`);
  assert.equal(r.code, 1);
  assert.match(r.out, /has no #nope/);
  assert.match(r.out, /has no #gone/);
});
