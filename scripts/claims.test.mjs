// Runs scripts/claims.mjs against small fake builds.
// Run with: node --test scripts/*.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const script = new URL("./claims.mjs", import.meta.url).pathname;
const page = (body) => `<!doctype html><html><head><title>t</title></head>\n<body>${body}</body></html>`;

// A stand-in for the real name: its hash goes in a test-only hashes file.
const fakeName = "zorblaxcms";
const fakeHash = createHash("sha256").update(fakeName).digest("hex");

function run(pages, hashes = `${fakeName.length}:${fakeHash}`) {
  const dir = mkdtempSync(join(tmpdir(), "claims-"));
  const dist = join(dir, "dist");
  for (const [name, html] of Object.entries(pages)) {
    const file = join(dist, name);
    mkdirSync(join(file, ".."), { recursive: true });
    writeFileSync(file, html);
  }
  const hashFile = join(dir, "hashes");
  writeFileSync(hashFile, `# test\n${hashes}\n`);
  const r = spawnSync(process.execPath, [script, dist], {
    encoding: "utf8",
    env: { ...process.env, CLAIMS_HASHES: hashFile },
  });
  return { code: r.status, out: r.stdout + r.stderr };
}

test("a clean build passes", () => {
  const r = run({
    "index.html": page("<h1>Access rules in Postgres</h1><p>Requests take 2 hops. Navigate to the docs.</p>"),
    "docs/a.html": page("<p>The landscape view. A 300 KB page.</p><script>const seamless = 1; // 5ms</script>"),
    "llms.txt": "Plain notes.\n",
  });
  assert.equal(r.code, 0, r.out);
});

test("fails on a banned word with file:line", () => {
  const r = run({ "index.html": page("<p>One\nSeamless sync.</p>") });
  assert.equal(r.code, 1);
  assert.match(r.out, /index\.html:3: banned word "Seamless"/);
});

test("fails on banned words in inflected forms and phrases", () => {
  for (const text of ["We leverage it.", "It empowers you.", "Robustly built.", "best-in-class auth", "In an era of SaaS", "in today's fast-paced world"]) {
    const r = run({ "index.html": page(`<p>${text}</p>`) });
    assert.equal(r.code, 1, text);
    assert.match(r.out, /banned word/, text);
  }
});

test("fails on banned words in alt text", () => {
  const r = run({ "index.html": page('<img src="a.png" alt="a tapestry of tools">') });
  assert.equal(r.code, 1);
  assert.match(r.out, /tapestry/);
});

test("fails on benchmark-style numbers", () => {
  for (const text of ["Responds in 4ms.", "Cold start 1.5 ms.", "10x faster than before.", "40% faster."]) {
    const r = run({ "a/b.html": page(`<p>${text}</p>`) });
    assert.equal(r.code, 1, text);
    assert.match(r.out, /a\/b\.html:2: benchmark number/, text);
  }
});

test("fails on a word whose hash is listed", () => {
  const r = run({ "index.html": page(`<p>Coming from ${fakeName.toUpperCase()}?</p>`) });
  assert.equal(r.code, 1);
  assert.match(r.out, /index\.html:2: hashed name/);
  // The output never repeats the matched word.
  assert.doesNotMatch(r.out, new RegExp(fakeName, "i"));
});

test("finds the hashed name inside longer words and package names", () => {
  for (const text of [`${fakeName}cms`, `See ${fakeName}cms.com today`, `npm i @${fakeName}cms/next`, `${fakeName.toUpperCase()}s`]) {
    const r = run({ "index.html": page(`<p>${text}</p>`) });
    assert.equal(r.code, 1, text);
    assert.match(r.out, /hashed name/, text);
    assert.doesNotMatch(r.out, new RegExp(fakeName, "i"), text);
  }
});

test("fails on the other spellings of faster", () => {
  for (const text of ["10× faster.", "3 times faster than it was."]) {
    const r = run({ "index.html": page(`<p>${text}</p>`) });
    assert.equal(r.code, 1, text);
    assert.match(r.out, /benchmark number/, text);
  }
});

test("checks .xml text, CDATA included", () => {
  const r = run({ "rss.xml": `<?xml version="1.0"?><rss><channel><item>\n<description><![CDATA[<p>A seamless feed.</p>]]></description></item><title>Robust</title></channel></rss>` });
  assert.equal(r.code, 1);
  assert.match(r.out, /rss\.xml:2: banned word "seamless"/);
  assert.match(r.out, /banned word "Robust"/);
});

test("checks .txt files as text", () => {
  const r = run({ "llms.txt": "line one\nA revolutionary CMS.\n" });
  assert.equal(r.code, 1);
  assert.match(r.out, /llms\.txt:2: banned word/);
});

test("the real hashes file holds only sha256 hex lines", () => {
  const lines = readFileSync(new URL("./claims.hashes", import.meta.url), "utf8")
    .split("\n").filter((l) => l && !l.startsWith("#"));
  assert.ok(lines.length >= 1);
  for (const l of lines) assert.match(l, /^\d+:[0-9a-f]{64}$/);
});
