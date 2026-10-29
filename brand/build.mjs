// Draws the TachyonCMS mark and logo and writes them to public/:
//
//   node brand/build.mjs [outDir]    (outDir defaults to public/)
//
// The mark is a "T" with speed lines, filled with the violet-to-pink gradient.
// The wordmark is "TachyonCMS" set in Instrument Sans 700 and converted to
// outlines, so the SVGs need no font. Colours use presentation attributes and a
// <linearGradient>, never <style> or style="", because the CSP refuses both.

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import * as fontkit from "fontkit";
import { optimize } from "svgo";

const require = createRequire(import.meta.url);

// Graphics need 3:1 on their background (WCAG 1.4.11); scripts/contrast.test.mjs
// checks every stop below against the theme it is drawn for.
const themes = {
  dark: { from: "#8b5cf6", to: "#ec4899", text: "#e9e3ff" },
  light: { from: "#7c3aed", to: "#db2777", text: "#17112b" },
};

// On a 32-unit grid: the T, then three speed lines trailing off to its left.
const MARK = [
  '<path d="M9 7h18v4.5h-6.75V26h-4.5V11.5H9z"/>',
  '<rect x="4" y="14" width="9.5" height="2" rx="1"/>',
  '<rect x="1" y="18.5" width="12.5" height="2" rx="1"/>',
  '<rect x="6" y="23" width="7.5" height="2" rx="1"/>',
].join("");

// Each file gets its own gradient id, so two of them inlined on one page don't
// paint with each other's gradient.
const gradient = (id, { from, to }) =>
  `<defs><linearGradient id="${id}" x1="1" y1="7" x2="27" y2="26" gradientUnits="userSpaceOnUse">` +
  `<stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs>`;

// fontkit lays the text out with the font's own kerning; each glyph's outline is
// then flipped (fonts draw y-up) and placed on the baseline.
function wordmark(text, x, baseline, capHeight) {
  const font = fontkit.openSync(require.resolve("@fontsource/instrument-sans/files/instrument-sans-latin-700-normal.woff2"));
  const scale = capHeight / font.capHeight;
  const run = font.layout(text);
  let d = "";
  run.glyphs.forEach((glyph, i) => {
    d += glyph.path.scale(scale, -scale).translate(x, baseline).toSVG();
    x += run.positions[i].xAdvance * scale;
  });
  return { d, width: x };
}

function svg(width, height, body) {
  const raw = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">${body}</svg>`;
  const plugins = [{ name: "preset-default", params: { overrides: { cleanupIds: false } } }];
  return optimize(raw, { multipass: true, floatPrecision: 2, plugins }).data + "\n";
}

// The T's top and baseline (7 and 26) set the wordmark's cap height and baseline.
const word = wordmark("TachyonCMS", 34, 26, 19);
const logoWidth = Math.ceil(word.width + 1);
const mark = (id, t) => `${gradient(id, t)}<g fill="url(#${id})">${MARK}</g>`;

export function build(dir) {
  mkdirSync(join(dir, "brand"), { recursive: true });
  for (const [name, t] of Object.entries(themes)) {
    writeFileSync(join(dir, `brand/mark-${name}.svg`), svg(32, 32, mark(`tc-mark-${name}`, t)));
    writeFileSync(
      join(dir, `brand/logo-${name}.svg`),
      svg(logoWidth, 32, `${mark(`tc-logo-${name}`, t)}<path fill="${t.text}" d="${word.d}"/>`),
    );
  }
  // Browser tabs can be light or dark, so the favicon carries its own dark tile.
  writeFileSync(
    join(dir, "favicon.svg"),
    svg(32, 32, `<rect width="32" height="32" rx="7" fill="#07060c"/>${mark("tc-favicon", themes.dark)}`),
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  build(process.argv[2] ?? fileURLToPath(new URL("../public", import.meta.url)));
}
