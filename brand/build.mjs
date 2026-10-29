// Draws the TachyonCMS mark and logo and writes them to public/:
//
//   node brand/build.mjs [outDir]    (outDir defaults to public/)
//
// The mark is "slipstream": three forward-leaning strokes that brighten left to
// right, then a point lands. src/components/Mark.astro draws the same geometry
// inline, so keep the two in step. The wordmark is "TachyonCMS" in
// Inter 600, converted to outlines so the SVG needs no font. Colours are
// presentation attributes, never <style> or style="", because the CSP refuses both.
//
// Run as a script, it also renders the avatar and social preview PNGs from
// brand/card.html with Playwright. Those aren't byte-stable across machines, so
// scripts/brand.test.mjs checks only their sizes.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import * as fontkit from "fontkit";
import { optimize } from "svgo";

const require = createRequire(import.meta.url);
const tokens = readFileSync(new URL("../src/brand/tokens.css", import.meta.url), "utf8");
const token = (name) => tokens.match(new RegExp(`--c-${name}:\\s*(#[0-9a-f]{6})`, "i"))[1];
const c = { bg: token("bg"), text: token("text"), blue: token("blue"), point: token("blue-soft") };

// On a 64-unit grid.
const MARK =
  `<g fill="none" stroke="${c.blue}" stroke-width="6" stroke-linecap="round">` +
  `<path d="M10 50 L22 14" opacity=".35"/><path d="M24 50 L36 14" opacity=".65"/><path d="M38 50 L50 14"/>` +
  `</g><circle cx="54" cy="50" r="5" fill="${c.point}"/>`;

// fontkit lays the text out with Inter's own kerning; each glyph's outline is then
// flipped (fonts draw y-up) and placed on the baseline. Tracking matches the header.
// The path is written by hand, not with fontkit's toSVG(), which rounds every
// coordinate to two decimals; svgo does the one rounding, below.
const SVG_COMMANDS = { moveTo: "M", lineTo: "L", quadraticCurveTo: "Q", bezierCurveTo: "C", closePath: "Z" };
const font = fontkit.openSync(require.resolve("@fontsource/inter/files/inter-latin-600-normal.woff2"));
function wordmark(text, x, baseline, fontSize, tracking) {
  const scale = fontSize / font.unitsPerEm;
  const run = font.layout(text);
  let d = "";
  run.glyphs.forEach((glyph, i) => {
    for (const { command, args } of glyph.path.commands) {
      const points = args.map((v, j) => (j % 2 ? baseline - v * scale : x + v * scale));
      d += SVG_COMMANDS[command] + points.join(" ");
    }
    x += run.positions[i].xAdvance * scale + tracking * fontSize;
  });
  return { d, width: x - tracking * fontSize };
}

// Three decimals on a 64-unit grid is 1/1000 of the mark's height, so curves stay
// smooth even at 512 px. Coarser rounding snaps control points and facets the curves.
function svg(width, height, body) {
  const raw = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">${body}</svg>`;
  return optimize(raw, { multipass: true, floatPrecision: 3, plugins: ["preset-default"] }).data + "\n";
}

// The header sets the mark at 26 px beside 17 px text with a 10 px gap; this is the
// same lockup scaled to the 64-unit mark, with the cap height centred on the strokes.
const fontSize = (64 * 17) / 26;
const capHeight = (fontSize * font.capHeight) / font.unitsPerEm;
const word = wordmark("TachyonCMS", 64 + (64 * 10) / 26, 32 + capHeight / 2, fontSize, -0.02);
const logoWidth = Math.ceil(word.width + 2);

export function build(dir) {
  mkdirSync(join(dir, "brand"), { recursive: true });
  writeFileSync(join(dir, "brand/mark.svg"), svg(64, 64, MARK));
  writeFileSync(join(dir, "brand/logo.svg"), svg(logoWidth, 64, `${MARK}<path fill="${c.text}" d="${word.d}"/>`));
  // Browser tabs can be light or dark, so the favicon carries its own dark tile.
  writeFileSync(join(dir, "favicon.svg"), svg(64, 64, `<rect width="64" height="64" rx="14" fill="${c.bg}"/>${MARK}`));
}

async function renderPngs(dir) {
  const { chromium } = await import("@playwright/test");
  const browser = await chromium.launch();
  const card = new URL("card.html", import.meta.url).href;
  const shots = [
    ["avatar", 512, "avatar-512.png"],
    ["avatar", 1024, "avatar-1024.png"],
    ["social", 1280, "social-preview.png"],
  ];
  try {
    for (const [kind, width, file] of shots) {
      const height = kind === "social" ? width / 2 : width;
      const page = await browser.newPage({ viewport: { width, height } });
      await page.goto(`${card}#${kind}`);
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({ path: join(dir, "brand", file) });
      await page.close();
    }
  } finally {
    await browser.close();
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const dir = process.argv[2] ?? fileURLToPath(new URL("../public", import.meta.url));
  build(dir);
  await renderPngs(dir);
}
