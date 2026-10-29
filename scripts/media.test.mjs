// Every PNG under public/media and public/brand is in the current look: no pixel of
// the old purple palette, its background or the old pink "T" mark. Re-render with
// `node scripts/post-graphics/render.mjs <slug>` (or `npm run brand`) to fix it.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { inflateSync } from "node:zlib";

const root = new URL("../", import.meta.url);

// Decodes an 8-bit, non-interlaced RGB or RGBA PNG (what Playwright and Chromium
// write) into rows of raw pixels.
export function decode(png) {
  assert.equal(png.toString("latin1", 1, 4), "PNG", "not a PNG");
  let pos = 8, width, height, channels;
  const idat = [];
  while (pos < png.length) {
    const len = png.readUInt32BE(pos);
    const type = png.toString("latin1", pos + 4, pos + 8);
    const data = png.subarray(pos + 8, pos + 8 + len);
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      assert.equal(data[8], 8, "bit depth");
      assert.equal(data[12], 0, "interlaced");
      channels = { 2: 3, 6: 4 }[data[9]];
      assert.ok(channels, `colour type ${data[9]}`);
    } else if (type === "IDAT") idat.push(data);
    pos += len + 12;
  }
  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const out = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let x = 0; x < stride; x++) {
      const a = x >= channels ? out[y * stride + x - channels] : 0;
      const b = y > 0 ? out[(y - 1) * stride + x] : 0;
      const c = x >= channels && y > 0 ? out[(y - 1) * stride + x - channels] : 0;
      const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
      const pred = [0, a, b, (a + b) >> 1, pa <= pb && pa <= pc ? a : pb <= pc ? b : c][filter];
      out[y * stride + x] = line[x] + pred;
    }
  }
  return { width, height, channels, pixels: out };
}

// Every colour in the old palette, from the near-black background to the pink, is a
// purple: red and blue both above green. No token in the new palette is: the greys
// and blues have red below green, and the amber has blue below it. The graphics use
// only the greys and blues, whose blends and anti-aliasing keep red below green, so
// one purple pixel means part of the old look survived.
const isOldLook = (r, g, b) => r > g && b > g;
const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

test("the rule catches every old palette colour", () => {
  // From scripts/post-graphics/shared.css before the redesign.
  for (const hex of ["#07060c", "#140d24", "#2b1d4a", "#e9e3ff", "#a99cc9", "#8b5cf6", "#ec4899", "#f0abfc", "#c3a6ff"]) {
    assert.ok(isOldLook(...rgb(hex)), hex);
  }
});

test("the rule passes every brand token", () => {
  const tokens = readFileSync(new URL("src/brand/tokens.css", root), "utf8").match(/#[0-9a-f]{6}\b/gi);
  assert.ok(tokens.length >= 10);
  for (const hex of tokens) assert.ok(!isOldLook(...rgb(hex)), hex);
});

function* pngs(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const url = new URL(entry.name + (entry.isDirectory() ? "/" : ""), dir);
    if (entry.isDirectory()) yield* pngs(url);
    else if (entry.name.endsWith(".png")) yield url;
  }
}

const files = ["public/media/", "public/brand/"].flatMap((dir) => [...pngs(new URL(dir, root))]);

test("there are media PNGs to check", () => assert.ok(files.length >= 4));

for (const url of files) {
  const name = url.pathname.slice(root.pathname.length);
  test(`${name} has no pixels in the old purple palette`, () => {
    const { pixels, channels } = decode(readFileSync(url));
    let old = 0;
    for (let i = 0; i < pixels.length; i += channels) if (isOldLook(pixels[i], pixels[i + 1], pixels[i + 2])) old++;
    assert.equal(old, 0, `${old} pixels are in the old palette`);
  });
}

// The post's <img> carries the infographic's real size, so a re-render that changes
// its height must update the post too, or the page shifts as it loads.
for (const file of readdirSync(new URL("src/content/blog/", root))) {
  const md = readFileSync(new URL(`src/content/blog/${file}`, root), "utf8");
  for (const [, src, w, h] of md.matchAll(/src="(\/media\/[^"]+\.png)"[^>]*?width="(\d+)" height="(\d+)"/g)) {
    test(`${file} gives ${src} its real size`, () => {
      const png = readFileSync(new URL(`public${src}`, root));
      assert.deepEqual([png.readUInt32BE(16), png.readUInt32BE(20)], [Number(w), Number(h)]);
    });
  }
}
