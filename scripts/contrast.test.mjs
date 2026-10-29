// Checks the brand colour tokens and logo files against WCAG 2.2 contrast
// minimums: 4.5:1 for text, 3:1 for decorative meta text and graphics.
// The site and docs are dark only, so there is one theme to check.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";

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

const t = block(":root");

test("there is no light theme", () => {
  assert.doesNotMatch(css, /data-theme|prefers-color-scheme|color-scheme:\s*light/);
  assert.match(css, /color-scheme:\s*dark/);
});

// --c-blue-soft is the link colour; --c-on-blue is the label on blue buttons.
const pairs = [
  ["--c-text", "--c-bg", 4.5], ["--c-text", "--c-panel", 4.5],
  ["--c-muted", "--c-bg", 4.5], ["--c-muted", "--c-panel", 4.5],
  ["--c-blue-soft", "--c-bg", 4.5], ["--c-blue-soft", "--c-panel", 4.5],
  ["--c-on-blue", "--c-blue", 4.5],
  ["--c-blue", "--c-bg", 4.5], ["--c-blue", "--c-panel", 4.5],
  ["--c-code-string", "--c-bg", 4.5], ["--c-code-string", "--c-panel", 4.5],
  // Plain text in code samples.
  ["--c-code", "--c-bg", 4.5], ["--c-code", "--c-panel", 4.5],
  // Warnings in the diagrams: a 404, a data loss, a refused key.
  ["--c-warn", "--c-bg", 4.5], ["--c-warn", "--c-panel", 4.5],
  // Dim is for decorative and meta text only, never body copy.
  ["--c-dim", "--c-bg", 3], ["--c-dim", "--c-panel", 3],
];
for (const [fg, bg, min] of pairs) {
  test(`${fg} on ${bg} is at least ${min}:1`, () => {
    const r = ratio(t[fg], t[bg]);
    assert.ok(r >= min, `${t[fg]} on ${t[bg]} is ${r.toFixed(2)}:1`);
  });
}

// A warning has to read as something other than the blues around it, not only
// by brightness: a clearly different hue.
test("--c-warn is a different hue from the blues", () => {
  const hue = (hex) => {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
    const max = Math.max(r, g, b), d = max - Math.min(r, g, b);
    assert.ok(d > 0, `${hex} is a grey, so it has no hue`);
    const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return (h * 60 + 360) % 360;
  };
  for (const blue of ["--c-blue", "--c-blue-soft", "--c-code-string"]) {
    const gap = Math.abs(hue(t["--c-warn"]) - hue(t[blue]));
    assert.ok(Math.min(gap, 360 - gap) >= 90, `${blue} and --c-warn are only ${gap.toFixed(0)} degrees apart`);
  }
});

// Colours live in tokens.css, so moving a token moves everything drawn with it.
// The one exception is black, the solid half of a mask or a shadow, at any alpha.
test("components and layouts take their colours from the tokens", () => {
  const dirs = ["../src/components/", "../src/layouts/"];
  const files = dirs.flatMap((d) =>
    readdirSync(new URL(d, import.meta.url), { recursive: true }).filter((f) => f.endsWith(".astro")).map((f) => d + f),
  );
  assert.ok(files.length > 10, "no components found");
  for (const file of files) {
    // The theme-color meta is read by the browser chrome, which can't see a custom property.
    const source = read(file).replace(/<meta name="theme-color" content="#[0-9a-f]{6}"/i, "");
    const literals = [...source.matchAll(/#[0-9a-f]{6}\b|#[0-9a-f]{3}\b|\b(?:rgba?|hsla?)\([^)]*\)/gi)]
      .map((m) => m[0])
      .filter((c) => c !== "#000" && !/^rgba?\(0[ ,]+0[ ,]+0\b/.test(c));
    assert.deepEqual(literals, [], `${file} hard-codes colours`);
  }
});

// The docs map the tokens onto Starlight (docs/src/styles/brand.css). Links use
// accent-high; the current sidebar item puts text-invert (accent-low) on it.
const docs = read("../docs/src/styles/brand.css");
const sl = block(":root", docs);
const colour = (v) => (sl[v].startsWith("var(") ? t[sl[v].slice(4, -1)] : sl[v]);
// A docs colour with a token's value must name the token, or moving the token
// leaves the docs behind.
// Colours compare in one spelling, so #FFF, #ffffff and rgb(255 255 255) match.
export function normalise(colour) {
  const c = colour.trim().toLowerCase();
  let m = c.match(/^#([0-9a-f])([0-9a-f])([0-9a-f])([0-9a-f])?$/);
  if (m) return normalise("#" + m.slice(1).filter(Boolean).map((d) => d + d).join(""));
  m = c.match(/^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)\s*(?:[,/]\s*([\d.]+)(%?))?\s*\)$/);
  if (m) {
    const hex = m.slice(1, 4).map((n) => Number(n).toString(16).padStart(2, "0")).join("");
    const a = m[4] === undefined ? 1 : Number(m[4]) / (m[5] ? 100 : 1);
    return normalise(`#${hex}${a === 1 ? "" : Math.round(a * 255).toString(16).padStart(2, "0")}`);
  }
  // Opaque eight-digit hex is plain hex.
  return /^#[0-9a-f]{8}$/.test(c) && c.endsWith("ff") ? c.slice(0, 7) : c;
}
// Every docs colour that repeats a token's value, as [docs name, token name].
export function repeats(tokens, docsColours) {
  const values = new Map(Object.entries(tokens).map(([k, v]) => [normalise(v), k]));
  return Object.entries(docsColours).filter(([, v]) => values.has(normalise(v))).map(([k, v]) => [k, values.get(normalise(v))]);
}
test("colours normalise to one spelling", () => {
  for (const c of ["#fff", "#FFF", "#ffffff", "#FFFFFFFF", "rgb(255 255 255)", "rgb(255, 255, 255)", "rgba(255,255,255,1)"]) {
    assert.equal(normalise(c), "#ffffff", c);
  }
  assert.equal(normalise("rgb(255 255 255 / 0.04)"), normalise("#ffffff0a"));
  assert.notEqual(normalise("rgb(255 255 255 / 0.04)"), "#ffffff");
  assert.deepEqual(repeats({ "--c-white": "#ffffff" }, { "--sl-x": "#fff", "--sl-y": "#fffffe" }), [["--sl-x", "--c-white"]]);
});
test("the docs name a token rather than repeat its value", () => {
  for (const [name, token] of repeats(t, sl)) assert.fail(`${name} repeats ${token}; write var(${token})`);
});
test("the docs have no light theme", () => assert.doesNotMatch(docs, /data-theme/));
const docsPairs = [
  ["--sl-color-white", "--sl-color-black"], ["--sl-color-gray-1", "--sl-color-black"],
  ["--sl-color-gray-2", "--sl-color-black"], ["--sl-color-gray-3", "--sl-color-black"],
  ["--sl-color-gray-2", "--sl-color-gray-6"], ["--sl-color-gray-3", "--sl-color-gray-6"],
  ["--sl-color-gray-2", "--sl-color-gray-7"], ["--sl-color-gray-3", "--sl-color-gray-7"],
  ["--sl-color-accent-high", "--sl-color-accent-low"],
  ["--sl-color-accent-high", "--sl-color-black"], ["--sl-color-accent-high", "--sl-color-gray-6"],
  ["--sl-color-accent-low", "--sl-color-accent-high"],
];
for (const [fg, bg] of docsPairs) {
  test(`docs: ${fg} on ${bg} is at least 4.5:1`, () => {
    const r = ratio(colour(fg), colour(bg));
    assert.ok(r >= 4.5, `${colour(fg)} on ${colour(bg)} is ${r.toFixed(2)}:1`);
  });
}

// The logo files are drawn by brand/build.mjs. Every colour in them is a graphic on
// the page background, so it needs 3:1. The favicon brings its own tile in --c-bg.
// The first stroke's .35 opacity is a deliberate fade; the others carry the mark.
const logos = { "brand/logo.svg": t["--c-bg"], "brand/mark.svg": t["--c-bg"], "favicon.svg": t["--c-bg"] };
for (const [file, bg] of Object.entries(logos)) {
  test(`${file} is at least 3:1 on ${bg} and has no inline styles`, () => {
    const svg = readFileSync(new URL(`../public/${file}`, import.meta.url), "utf8");
    assert.doesNotMatch(svg, /<style|style=/);
    const colours = [...svg.matchAll(/(?:stop-color|fill|stroke)="(#[0-9a-f]{6})"/gi)].map((m) => m[1]).filter((c) => c !== bg);
    assert.ok(colours.length > 0, "no colours found");
    for (const c of colours) assert.ok(ratio(c, bg) >= 3, `${c} on ${bg} is ${ratio(c, bg).toFixed(2)}:1`);
  });
}

test("ratio matches the WCAG reference values", () => {
  assert.equal(ratio("#000000", "#ffffff").toFixed(2), "21.00");
  assert.equal(ratio("#777777", "#ffffff").toFixed(2), "4.48");
});
