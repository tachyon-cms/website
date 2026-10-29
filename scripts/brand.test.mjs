// The committed logos must be exactly what brand/build.mjs draws, so an edit to
// one without the other fails here. Fix it with `npm run brand`.

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { build } from "../brand/build.mjs";

const files = ["brand/logo.svg", "brand/mark.svg", "favicon.svg"];
const root = new URL("../", import.meta.url);
const read = (path) => readFileSync(new URL(path, root), "utf8");

test("public/ logos match brand/build.mjs output", (t) => {
  const dir = mkdtempSync(join(tmpdir(), "brand-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  build(dir);
  for (const file of files) {
    assert.equal(read(`public/${file}`), readFileSync(join(dir, file), "utf8"), `${file} is stale`);
  }
});

test("public/brand has no light variants", () => {
  const light = readdirSync(new URL("public/brand/", root)).filter((f) => f.includes("-light"));
  assert.deepEqual(light, []);
});

// The old "T" mark's first path command, from `git show main:public/favicon.svg`.
const oldMark = "M9 7h18v4.5h-6.75V26h-4.5V11.5H9z";
function* walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const url = new URL(entry.name + (entry.isDirectory() ? "/" : ""), dir);
    if (entry.isDirectory()) yield* walk(url);
    else if (/\.(svg|html|astro|css|mjs|js|ts|md|mdx|json|txt)$/.test(entry.name)) yield url;
  }
}
test("the old T mark is gone from public/, src/ and the docs", () => {
  for (const dir of ["public/", "src/", "docs/src/", "docs/public/"]) {
    for (const url of walk(new URL(dir, root))) {
      assert.ok(!readFileSync(url, "utf8").includes(oldMark), `${url.pathname} still has the old T mark`);
    }
  }
});

// Width and height from the PNG's IHDR chunk.
const size = (file) => {
  const png = readFileSync(new URL(`public/brand/${file}`, root));
  return [png.readUInt32BE(16), png.readUInt32BE(20)];
};
test("the avatar and social preview PNGs are the exact sizes", () => {
  assert.deepEqual(size("avatar-512.png"), [512, 512]);
  assert.deepEqual(size("avatar-1024.png"), [1024, 1024]);
  assert.deepEqual(size("social-preview.png"), [1280, 640]);
});

// Starlight serves the docs favicon from docs/public, so it keeps a copy of the site's.
test("docs/public/favicon.svg matches the site's", () => {
  assert.equal(read("docs/public/favicon.svg"), read("public/favicon.svg"), "copy public/favicon.svg to docs/public/");
});

// server/signup.ts serves its confirm page outside the Astro build, and brand/card.html
// renders outside it too, as do the post graphics, so each copies colours by value.
// Each must still be a token.
for (const file of ["public/signup.css", "brand/card.html", "scripts/post-graphics/shared.css"]) {
  test(`${file} uses only brand token colours`, () => {
    const tokens = read("src/brand/tokens.css").toLowerCase();
    const colours = read(file).toLowerCase().match(/#[0-9a-f]{6}\b/g) ?? [];
    assert.ok(colours.length > 0, `found no colours in ${file}`);
    for (const hex of colours) assert.ok(tokens.includes(hex), `${hex} is not a brand token`);
  });
}
