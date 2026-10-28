// Fails the build on copy that claims too much or names what it shouldn't.
//
//   node scripts/claims.mjs <dir>...
//
// Scans the visible text of every .html file (text outside script and style,
// plus alt, title, aria-label, placeholder and meta content) and every .txt
// file. Exits 1 and prints file:line for:
//   - a banned word from the writing rules ("navigate" and "landscape" are
//     banned only when figurative, which a script can't tell, so they are
//     checked by hand);
//   - a benchmark-style number such as "4ms", "10x faster" or "40% faster";
//   - any word whose lowercase SHA-256 is listed in scripts/claims.hashes
//     (or the file named by CLAIMS_HASHES). The word itself is never printed.

import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { parse } from "parse5";

const banned = new RegExp(
  "\\b(" +
    [
      "seamless(?:ly|ness)?",
      "robust(?:ly|ness)?",
      "leverag(?:e|es|ed|ing)",
      "empower(?:s|ed|ing|ment)?",
      "unlock(?:s|ed|ing)?",
      "elevat(?:e|es|ed|ing)",
      "revolutionary",
      "game-changing",
      "cutting-edge",
      "best-in-class",
      "delv(?:e|es|ed|ing)",
      "tapestr(?:y|ies)",
      "testaments?",
      "realms?",
      "in today['’]s fast-paced world",
      "in an era of",
    ].join("|") +
    ")\\b",
  "gi",
);
const benchmark = /\b\d+(?:\.\d+)?\s?(?:ms\b|x faster\b|% faster\b)/gi;
const hidden = new Set(["script", "style", "template"]);
const attrs = new Set(["alt", "title", "aria-label", "placeholder"]);

const hashFile = process.env.CLAIMS_HASHES ?? new URL("./claims.hashes", import.meta.url);
const hashes = new Set(
  readFileSync(hashFile, "utf8").split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#")),
);

// Yields [text, line] for each run of visible text in an HTML document.
function* htmlText(html) {
  const stack = [parse(html, { sourceCodeLocationInfo: true })];
  while (stack.length) {
    const node = stack.pop();
    if (node.nodeName === "#text") yield [node.value, node.sourceCodeLocation?.startLine ?? 1];
    for (const a of node.attrs ?? []) {
      const isMeta = node.nodeName === "meta" && a.name === "content";
      if (attrs.has(a.name) || isMeta) yield [a.value, node.sourceCodeLocation?.startLine ?? 1];
    }
    if (hidden.has(node.nodeName)) continue;
    const kids = node.childNodes ?? [];
    for (let i = kids.length - 1; i >= 0; i--) stack.push(kids[i]);
  }
}

function check(text, line, report) {
  const at = (i) => line + (text.slice(0, i).match(/\n/g)?.length ?? 0);
  for (const m of text.matchAll(banned)) report(at(m.index), `banned word "${m[0]}"`);
  for (const m of text.matchAll(benchmark)) report(at(m.index), `benchmark number "${m[0]}"`);
  for (const m of text.matchAll(/[\p{L}\p{N}]+/gu)) {
    const h = createHash("sha256").update(m[0].toLowerCase()).digest("hex");
    if (hashes.has(h)) report(at(m.index), "hashed name");
  }
}

function* files(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true, recursive: true })) {
    if (e.isFile() && /\.(html|txt)$/.test(e.name)) yield join(e.parentPath, e.name);
  }
}

const dirs = process.argv.slice(2);
if (!dirs.length) {
  console.error("usage: node scripts/claims.mjs <dir>...");
  process.exit(2);
}

let problems = 0;
for (const dir of dirs) {
  for (const file of files(dir)) {
    const src = readFileSync(file, "utf8");
    const name = join(dir, relative(dir, file));
    const report = (line, what) => {
      problems++;
      console.log(`${name}:${line}: ${what}`);
    };
    if (file.endsWith(".txt")) check(src, 1, report);
    else for (const [text, line] of htmlText(src)) check(text, line, report);
  }
}

if (problems) {
  console.log(`\n${problems} claim problem(s). Fix the copy; see the writing rules.`);
  process.exit(1);
}
console.log("No claim problems.");
