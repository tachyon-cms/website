// @ts-check
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://tachyoncms.com',
  output: 'static',
  // Pages serves /about.html at /about, so links never end in a slash.
  trailingSlash: 'never',
  // Stylesheets ship as files so the CSP (scripts/csp.mjs) needs no style hashes for them.
  build: { format: 'file', inlineStylesheets: 'never' },
  // Plain class selectors, which work wherever the stylesheet loads.
  scopedStyleStrategy: 'class',
  // Syntax highlighting writes style="" attributes, which the CSP refuses.
  markdown: { syntaxHighlight: false },
});
