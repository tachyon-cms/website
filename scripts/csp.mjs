// Writes <dist>/_headers from a base headers file plus one Content-Security-Policy line
// for every path. The policy names each inline <script> and <style> the build emitted by
// its SHA-256 hash, so nothing inline runs unless this build produced it. Inline event
// handlers and style="" can't be allowed by hash, so finding one fails the build.
//
//   node scripts/csp.mjs <dist> <headersBase> [--wasm] [--style-attrs]
//                        [--allow-frame <origin>] [--allow-script <origin>]
//
//   --wasm            adds 'wasm-unsafe-eval' to script-src: docs search compiles a
//                     WebAssembly index reader. eval() stays blocked.
//   --style-attrs     allows style="" attributes (style-src-attr), which the docs theme
//                     puts on its icons. <style> elements stay hash-only.
//   --allow-script    adds an origin to script-src, and --allow-frame one to frame-src.
//                     The site uses both for Turnstile on the signup form.
//
// The policy is appended to the last block of the base file, so that block must be /*.

import { createHash } from "node:crypto";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { parse } from "parse5";

// Cloudflare ignores a _headers line longer than this.
const MAX_LINE = 2000;

function* htmlFiles(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* htmlFiles(path);
    else if (entry.name.endsWith(".html")) yield path;
  }
}

function* elements(node) {
  if (node.tagName) yield node;
  // A <template>'s children live in its content fragment, not childNodes.
  for (const child of node.content?.childNodes ?? []) yield* elements(child);
  for (const child of node.childNodes ?? []) yield* elements(child);
}

const attr = (el, name) => el.attrs.find((a) => a.name === name)?.value;
// The element's text as the DOM holds it, which is what the browser hashes: raw in HTML
// <script> and <style>, entity-decoded inside SVG.
const text = (el) => el.childNodes.map((c) => c.value ?? "").join("");
const hash = (s) => `'sha256-${createHash("sha256").update(s).digest("base64")}'`;

function scan(dist, { styleAttrs }) {
  const scripts = new Set();
  const styles = new Set();
  const errors = [];
  for (const file of htmlFiles(dist)) {
    const name = relative(dist, file);
    // With scripting off, <noscript> parses into elements we can check, not plain text.
    for (const el of elements(parse(readFileSync(file, "utf8"), { scriptingEnabled: false }))) {
      for (const { name: a } of el.attrs) {
        if (a === "style" && !styleAttrs) errors.push(`inline style attribute in ${name} <${el.tagName}>`);
        else if (a.startsWith("on")) errors.push(`inline event handler ${a} in ${name} <${el.tagName}>`);
      }
      if (el.tagName === "script" && attr(el, "src") === undefined) {
        // JSON-LD is data, and browsers never run it.
        if (attr(el, "type") === "application/ld+json") continue;
        scripts.add(hash(text(el)));
      } else if (el.tagName === "style") {
        styles.add(hash(text(el)));
      }
    }
  }
  return { scripts: [...scripts].sort(), styles: [...styles].sort(), errors };
}

export function policy({ scripts, styles }, { wasm = false, styleAttrs = false, scriptOrigins = [], frameOrigins = [] } = {}) {
  const src = (list) => ["'self'", ...list].join(" ");
  return [
    "default-src 'self'",
    `script-src ${src([...(wasm ? ["'wasm-unsafe-eval'"] : []), ...scriptOrigins, ...scripts])}`,
    `style-src ${src(styles)}`,
    ...(styleAttrs ? ["style-src-attr 'unsafe-inline'"] : []),
    ...(frameOrigins.length ? [`frame-src ${src(frameOrigins)}`] : []),
    "img-src 'self' data:",
    "font-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ].join("; ");
}

function options(flags) {
  const opts = { wasm: false, styleAttrs: false, scriptOrigins: [], frameOrigins: [] };
  for (let i = 0; i < flags.length; i++) {
    const flag = flags[i];
    if (flag === "--wasm") opts.wasm = true;
    else if (flag === "--style-attrs") opts.styleAttrs = true;
    else if (flag === "--allow-script" || flag === "--allow-frame") {
      const origin = flags[++i];
      if (!/^https:\/\/[^\s;,'"]+$/.test(origin ?? "")) throw new Error(`${flag} needs an origin, such as https://example.com`);
      (flag === "--allow-script" ? opts.scriptOrigins : opts.frameOrigins).push(origin);
    } else throw new Error(`unknown flag ${flag}`);
  }
  return opts;
}

function main([dist, baseFile, ...flags]) {
  const usage = "usage: node scripts/csp.mjs <dist> <headersBase> [--wasm] [--style-attrs] [--allow-frame <origin>] [--allow-script <origin>]";
  let opts;
  try {
    if (!dist || !baseFile) throw new Error(usage);
    opts = options(flags);
  } catch (e) {
    console.error(`csp: ${e.message}`);
    return 2;
  }
  const found = scan(dist, opts);
  if (found.errors.length) {
    for (const e of found.errors) console.error(`csp: ${e}`);
    return 1;
  }
  const line = `  Content-Security-Policy: ${policy(found, opts)}`;
  if (line.length > MAX_LINE) {
    console.error(`csp: policy line is ${line.length} chars, longer than ${MAX_LINE} characters (Cloudflare _headers limit). Move inline code into files.`);
    return 1;
  }
  const base = readFileSync(baseFile, "utf8").replace(/\n*$/, "\n");
  writeFileSync(join(dist, "_headers"), base + line + "\n");
  console.log(`csp: ${found.scripts.length} script and ${found.styles.length} style hashes`);
  return 0;
}

process.exitCode = main(process.argv.slice(2));
