// Checks the brand colour tokens and logo files against WCAG 2.2 contrast
// minimums in both themes: 4.5:1 for text, 3:1 for accents and graphics.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const css = read("../src/brand/tokens.css");

function block(selector, source = css) {
  const start = source.indexOf(`${selector} {`);
  assert.notEqual(start, -1, `missing ${selector} block`);
  const body = source.slice(start, source.indexOf("}", start));
  return Object.fromEntries([...body.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));
}

function luminance(hex) {
  assert.match(hex, /^#[0-9a-f]{6}$/i, `${hex} is not a six-digit hex colour`);
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function ratio(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// Dark is the default; light overrides it, so light inherits anything it doesn't set.
const dark = block(":root");
const themes = { dark, light: { ...dark, ...block('[data-theme="light"]') } };

// --c-soft is the link colour; --c-on-grad is the label on the violet-to-pink button,
// so it has to clear both ends of the gradient.
const text = [
  ["--c-text", "--c-bg"], ["--c-text", "--c-surface"],
  ["--c-muted", "--c-bg"], ["--c-muted", "--c-surface"],
  ["--c-soft", "--c-bg"], ["--c-soft", "--c-surface"],
  ["--c-hi", "--c-bg"], ["--c-hi", "--c-surface"],
  ["--c-ok", "--c-bg"], ["--c-ok", "--c-surface"],
  ["--c-on-grad", "--c-violet"], ["--c-on-grad", "--c-pink"],
];

for (const [name, t] of Object.entries(themes)) {
  for (const [fg, bg] of text) {
    test(`${name}: ${fg} on ${bg} is at least 4.5:1`, () => {
      const r = ratio(t[fg], t[bg]);
      assert.ok(r >= 4.5, `${t[fg]} on ${t[bg]} is ${r.toFixed(2)}:1`);
    });
  }
  for (const accent of ["--c-violet", "--c-pink"]) {
    test(`${name}: ${accent} on --c-bg is at least 3:1`, () => {
      const r = ratio(t[accent], t["--c-bg"]);
      assert.ok(r >= 3, `${t[accent]} on ${t["--c-bg"]} is ${r.toFixed(2)}:1`);
    });
  }
  test(`${name}: --c-grad runs from --c-violet to --c-pink`, () => {
    assert.match(t["--c-grad"], /var\(--c-violet\)[^)]*var\(--c-pink\)/);
  });
}

// The docs map the tokens onto Starlight (docs/src/styles/brand.css). Links use
// accent-high in dark and accent in light; the current sidebar item puts
// text-invert (accent-low in dark, black in light) on the link colour.
const docs = read("../docs/src/styles/brand.css");
const darkDocs = block(":root", docs);
const docsThemes = {
  dark: { theme: themes.dark, sl: darkDocs, link: "--sl-color-accent-high", invert: "--sl-color-accent-low" },
  light: { theme: themes.light, sl: { ...darkDocs, ...block('[data-theme="light"]', docs) }, link: "--sl-color-accent", invert: "--sl-color-black" },
};
for (const [name, { theme, sl, link, invert }] of Object.entries(docsThemes)) {
  const colour = (v) => (sl[v].startsWith("var(") ? theme[sl[v].slice(4, -1)] : sl[v]);
  const pairs = [
    ["--sl-color-white", "--sl-color-black"], ["--sl-color-gray-1", "--sl-color-black"],
    ["--sl-color-gray-2", "--sl-color-black"], ["--sl-color-gray-3", "--sl-color-black"],
    ["--sl-color-gray-2", "--sl-color-gray-6"], ["--sl-color-gray-3", "--sl-color-gray-6"],
    ["--sl-color-accent-high", "--sl-color-accent-low"],
    [link, "--sl-color-black"], [link, "--sl-color-gray-6"], [invert, link],
  ];
  for (const [fg, bg] of pairs) {
    test(`docs ${name}: ${fg} on ${bg} is at least 4.5:1`, () => {
      const r = ratio(colour(fg), colour(bg));
      assert.ok(r >= 4.5, `${colour(fg)} on ${colour(bg)} is ${r.toFixed(2)}:1`);
    });
  }
}

// The logo files are drawn by brand/build.mjs. Every colour in them is a graphic on
// that theme's background, so it needs 3:1; the favicon brings its own dark tile.
const logos = {
  "brand/logo-dark.svg": themes.dark["--c-bg"], "brand/mark-dark.svg": themes.dark["--c-bg"],
  "brand/logo-light.svg": themes.light["--c-bg"], "brand/mark-light.svg": themes.light["--c-bg"],
  "favicon.svg": "#07060c",
};
for (const [file, bg] of Object.entries(logos)) {
  test(`${file} is at least 3:1 on ${bg} and has no inline styles`, () => {
    const svg = readFileSync(new URL(`../public/${file}`, import.meta.url), "utf8");
    assert.doesNotMatch(svg, /<style|style=/);
    const colours = [...svg.matchAll(/(?:stop-color|fill)="(#[0-9a-f]{6})"/gi)].map((m) => m[1]).filter((c) => c !== bg);
    assert.ok(colours.length > 0, "no colours found");
    for (const c of colours) assert.ok(ratio(c, bg) >= 3, `${c} on ${bg} is ${ratio(c, bg).toFixed(2)}:1`);
  });
}

test("ratio matches the WCAG reference values", () => {
  assert.equal(ratio("#000000", "#ffffff").toFixed(2), "21.00");
  assert.equal(ratio("#777777", "#ffffff").toFixed(2), "4.48");
});
