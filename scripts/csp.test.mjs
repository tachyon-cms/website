// Runs scripts/csp.mjs against small fake builds and checks the _headers it writes.
// Run with: node --test scripts/*.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const script = new URL("./csp.mjs", import.meta.url).pathname;
const base = "/*\n  X-Content-Type-Options: nosniff\n";

function site(pages) {
  const dir = mkdtempSync(join(tmpdir(), "csp-"));
  const dist = join(dir, "dist");
  for (const [name, html] of Object.entries(pages)) {
    const file = join(dist, name);
    mkdirSync(join(file, ".."), { recursive: true });
    writeFileSync(file, html);
  }
  const baseFile = join(dir, "headers.base");
  writeFileSync(baseFile, base);
  return { dist, baseFile };
}

function run(pages, flags = []) {
  const { dist, baseFile } = site(pages);
  const r = spawnSync(process.execPath, [script, dist, baseFile, ...flags], { encoding: "utf8" });
  let headers = "";
  try { headers = readFileSync(join(dist, "_headers"), "utf8"); } catch {}
  return { code: r.status, stderr: r.stderr, headers };
}

const sha = (s) => `'sha256-${createHash("sha256").update(s).digest("base64")}'`;
const page = (body) => `<!doctype html><html><head><title>t</title></head><body>${body}</body></html>`;
const directive = (headers, name) => headers.match(new RegExp(`(?:: |; )(${name} [^;\\n]*)`))?.[1];

test("hashes inline script", () => {
  const r = run({ "index.html": page("<script>a()</script>") });
  assert.equal(r.code, 0, r.stderr);
  assert.ok(r.headers.startsWith(base), "keeps the base headers");
  assert.match(r.headers, /^  Content-Security-Policy: default-src 'self'; script-src 'self' /m);
  assert.ok(r.headers.includes(sha("a()")));
});

test("hashes inline style", () => {
  const r = run({ "index.html": page("<style>b{c:d}</style>") });
  assert.equal(r.code, 0, r.stderr);
  assert.ok(r.headers.includes(`style-src 'self' ${sha("b{c:d}")}`));
});

test("dedupes hashes across pages", () => {
  const r = run({ "index.html": page("<script>a()</script>"), "x/y.html": page("<script>a()</script>") });
  assert.equal(r.code, 0, r.stderr);
  assert.equal(r.headers.split(sha("a()")).length - 1, 1);
});

test("ignores json-ld and external scripts", () => {
  const r = run({ "index.html": page('<script type="application/ld+json">{"a":1}</script><script src="/x.js"></script>') });
  assert.equal(r.code, 0, r.stderr);
  assert.ok(!r.headers.includes("sha256-"), r.headers);
});

test("fails on style attribute", () => {
  const r = run({ "index.html": page('<p style="color:red">x</p>') });
  assert.equal(r.code, 1);
  assert.match(r.stderr, /inline style attribute in index\.html/);
});

test("fails on onclick", () => {
  const r = run({ "index.html": page('<button onclick="go()">x</button>') });
  assert.equal(r.code, 1);
  assert.match(r.stderr, /inline event handler onclick in index\.html/);
});

test("no unsafe-inline ever", () => {
  const r = run({ "index.html": page("<script>a()</script><style>b{}</style>") });
  assert.equal(r.code, 0, r.stderr);
  assert.ok(!r.headers.includes("unsafe-inline"));
  assert.ok(!r.headers.includes("unsafe-eval"));
});

test("writes exactly one policy line", () => {
  const r = run({ "index.html": page("<script>a()</script>") });
  assert.equal(r.code, 0, r.stderr);
  assert.equal(r.headers.match(/Content-Security-Policy:/g)?.length, 1);
});

test("line length guard", () => {
  const scripts = Array.from({ length: 40 }, (_, i) => `<script>f${i}()</script>`).join("");
  const r = run({ "index.html": page(scripts) });
  assert.equal(r.code, 1);
  assert.match(r.stderr, /longer than 2000 characters/);
});

test("sees inline code inside noscript", () => {
  const r = run({ "index.html": page('<noscript><img src="x" onerror="a()"></noscript>') });
  assert.equal(r.code, 1);
  assert.match(r.stderr, /inline event handler onerror in index\.html/);
});

test("hashes styles inside noscript", () => {
  const r = run({ "index.html": page("<noscript><style>y{}</style></noscript>") });
  assert.equal(r.code, 0, r.stderr);
  assert.ok(r.headers.includes(sha("y{}")));
});

test("--wasm lets WebAssembly compile, for search", () => {
  const { dist, baseFile } = site({ "index.html": "<html><body><p>hi</p></body></html>" });
  for (const [args, want] of [[[], false], [["--wasm"], true]]) {
    const r = spawnSync(process.execPath, [script, dist, baseFile, ...args], { encoding: "utf8" });
    assert.equal(r.status, 0, r.stderr);
    const headers = readFileSync(join(dist, "_headers"), "utf8");
    assert.equal(/script-src 'self' 'wasm-unsafe-eval'/.test(headers), want, headers);
  }
});

test("--style-attrs allows style attributes, and nothing else inline", () => {
  const { dist, baseFile } = site({ "index.html": '<html><body><svg style="--size: 1em"></svg><p onclick="x()">hi</p></body></html>' });
  const r = spawnSync(process.execPath, [script, dist, baseFile, "--style-attrs"], { encoding: "utf8" });
  assert.notEqual(r.status, 0, "an event handler must still fail the build");
  assert.doesNotMatch(r.stderr, /inline style attribute/);
  const ok = site({ "index.html": '<html><body><svg style="--size: 1em"></svg></body></html>' });
  const r2 = spawnSync(process.execPath, [script, ok.dist, ok.baseFile, "--style-attrs"], { encoding: "utf8" });
  assert.equal(r2.status, 0, r2.stderr);
  assert.match(readFileSync(join(ok.dist, "_headers"), "utf8"), /style-src-attr 'unsafe-inline'/);
});

test("--allow-script adds the origin beside the hashes, never unsafe-inline", () => {
  const turnstile = "https://challenges.cloudflare.com";
  const r = run({ "index.html": page("<script>a()</script>") }, ["--allow-script", turnstile]);
  assert.equal(r.code, 0, r.stderr);
  const scriptSrc = directive(r.headers, "script-src");
  assert.ok(scriptSrc, r.headers);
  // An exact source token, not a substring (a Set lookup also keeps CodeQL from reading it as one).
  assert.ok(new Set(scriptSrc.split(" ")).has(turnstile), scriptSrc);
  assert.ok(scriptSrc.includes(sha("a()")), scriptSrc);
  assert.ok(!r.headers.includes("unsafe-inline"), r.headers);
});

test("--allow-frame adds a frame-src for the origin", () => {
  const turnstile = "https://challenges.cloudflare.com";
  const plain = run({ "index.html": page("<p>hi</p>") });
  assert.equal(directive(plain.headers, "frame-src"), undefined, plain.headers);
  const r = run({ "index.html": page("<p>hi</p>") }, ["--allow-frame", turnstile]);
  assert.equal(r.code, 0, r.stderr);
  assert.equal(directive(r.headers, "frame-src"), `frame-src 'self' ${turnstile}`);
});

test("an origin flag without an origin is a usage error", () => {
  const r = run({ "index.html": page("<p>hi</p>") }, ["--allow-script"]);
  assert.equal(r.code, 2);
  assert.match(r.stderr, /--allow-script needs an origin/);
});

test("form-action allows the site itself, so the signup form can post", () => {
  const r = run({ "index.html": page("<p>hi</p>") });
  assert.equal(directive(r.headers, "form-action"), "form-action 'self'");
});

// Browsers check a hash against the element's text as the DOM holds it. In HTML <style>
// that is the bytes as written; inside SVG the parser decodes entities first.
test("hashes the text the browser checks, in HTML and in SVG", () => {
  const r = run({ "index.html": page("<style>a::after{content:'&amp;'}</style><svg><style>b::after{content:'&amp;'}</style></svg>") });
  assert.equal(r.code, 0, r.stderr);
  assert.ok(r.headers.includes(sha("a::after{content:'&amp;'}")), "HTML style is raw text");
  assert.ok(r.headers.includes(sha("b::after{content:'&'}")), "SVG style is decoded");
  assert.ok(!r.headers.includes(sha("b::after{content:'&amp;'}")), r.headers);
});
