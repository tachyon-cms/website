// Fails the build on copy that claims too much or names what it shouldn't.
//
//   node scripts/claims.mjs <dir>...
//
// Scans the visible text of every .html and .xml file (text outside script and style,
// plus alt, title, aria-label, placeholder and meta content) and every .txt
// file. Exits 1 and prints file:line for:
//   - a banned word from the writing rules ("navigate" and "landscape" are
//     banned only when figurative, which a script can't tell, so they are
//     checked by hand);
//   - a benchmark-style number such as "4ms", "10x faster" or "40% faster";
//   - any word containing a name whose lowercase SHA-256 is listed in
//     scripts/claims.hashes (or the file named by CLAIMS_HASHES), one
//     "length:hex" line per name. Every substring of that length in every word
//     is hashed, so "<name>cms", "<name>cms.com" and "@<name>cms/next" all
//     match. The name itself is never printed.
//
//   node scripts/claims.mjs --source
//
// Checks every text file git tracks for the hashed name only, so it can't creep in
// through code, comments, tests or config either. Banned words and numbers are copy
// rules, so source is spared those.

import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { execFileSync } from "node:child_process";
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
const benchmark = /\b\d+(?:\.\d+)?\s?(?:ms\b|x faster\b|× faster\b|% faster\b|times faster\b)/gi;
const hidden = new Set(["script", "style", "template"]);
const attrs = new Set(["alt", "title", "aria-label", "placeholder"]);

const hashFile = process.env.CLAIMS_HASHES ?? new URL("./claims.hashes", import.meta.url);
// length -> set of hex hashes of the names of that length.
const hashes = new Map();
for (const line of readFileSync(hashFile, "utf8").split("\n").map((l) => l.trim())) {
  if (!line || line.startsWith("#")) continue;
  const m = line.match(/^(\d+):([0-9a-f]{64})$/);
  if (!m) throw new Error(`claims.hashes: bad line "${line}", want length:sha256hex`);
  if (!hashes.has(+m[1])) hashes.set(+m[1], new Set());
  hashes.get(+m[1]).add(m[2]);
}

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

function check(text, line, report, nameOnly = false) {
  const at = (i) => line + (text.slice(0, i).match(/\n/g)?.length ?? 0);
  if (!nameOnly) {
    for (const m of text.matchAll(banned)) report(at(m.index), `banned word "${m[0]}"`);
    for (const m of text.matchAll(benchmark)) report(at(m.index), `benchmark number "${m[0]}"`);
  }
  for (const m of text.matchAll(/[\p{L}\p{N}]+/gu)) {
    const word = m[0].toLowerCase();
    const hit = [...hashes].some(([len, set]) => {
      for (let i = 0; i + len <= word.length; i++) {
        if (set.has(createHash("sha256").update(word.slice(i, i + len)).digest("hex"))) return true;
      }
    });
    if (hit) report(at(m.index), "hashed name");
  }
}

function* files(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true, recursive: true })) {
    if (e.isFile() && /\.(html|txt|xml)$/.test(e.name)) yield join(e.parentPath, e.name);
  }
}

const dirs = process.argv.slice(2);
if (!dirs.length) {
  console.error("usage: node scripts/claims.mjs <dir>... | --source");
  process.exit(2);
}

let problems = 0;
if (dirs[0] === "--source") {
  const tracked = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" }).split("\0").filter(Boolean);
  for (const file of tracked) {
    const buf = readFileSync(file);
    if (buf.includes(0)) continue; // binary
    check(buf.toString("utf8"), 1, (line) => {
      problems++;
      console.log(`${file}:${line}: hashed name`);
    }, true);
  }
  dirs.length = 0;
}
for (const dir of dirs) {
  for (const file of files(dir)) {
    const src = readFileSync(file, "utf8");
    const name = join(dir, relative(dir, file));
    const report = (line, what) => {
      problems++;
      console.log(`${name}:${line}: ${what}`);
    };
    if (file.endsWith(".txt")) check(src, 1, report);
    // The HTML parser reads CDATA as a comment; unwrap it so feed content is checked.
    else if (file.endsWith(".xml")) for (const [t, l] of htmlText(src.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1"))) check(t, l, report);
    else for (const [text, line] of htmlText(src)) check(text, line, report);
  }
}

if (problems) {
  console.log(`\n${problems} claim problem(s). Fix the copy; see the writing rules.`);
  process.exit(1);
}
console.log("No claim problems.");
