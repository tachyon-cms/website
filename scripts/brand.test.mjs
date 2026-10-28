// The committed logos must be exactly what brand/build.mjs draws, so an edit to
// one without the other fails here. Fix it with `npm run brand`.

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { build } from "../brand/build.mjs";

const files = ["brand/logo-dark.svg", "brand/logo-light.svg", "brand/mark-dark.svg", "brand/mark-light.svg", "favicon.svg"];

test("public/ logos match brand/build.mjs output", (t) => {
  const dir = mkdtempSync(join(tmpdir(), "brand-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  build(dir);
  const ids = new Set();
  for (const file of files) {
    const built = readFileSync(join(dir, file), "utf8");
    assert.equal(readFileSync(new URL(`../public/${file}`, import.meta.url), "utf8"), built, `${file} is stale`);
    const id = built.match(/<linearGradient id="([^"]+)"/)?.[1];
    assert.ok(id && !ids.has(id), `${file} needs its own gradient id, got ${id}`);
    ids.add(id);
  }
});

// server/signup.ts serves its confirm page outside the Astro build, so public/signup.css
// copies colours by value. Each must still be one of the tokens.
test("public/signup.css uses only brand token colours", () => {
  const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8").toLowerCase();
  const tokens = read("../src/brand/tokens.css");
  const colours = read("../public/signup.css").match(/#[0-9a-f]{6}\b/g) ?? [];
  assert.ok(colours.length > 0, "found no colours in public/signup.css");
  for (const hex of colours) assert.ok(tokens.includes(hex), `${hex} is not a brand token`);
});
