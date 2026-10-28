// @ts-check
import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';
import { fonts } from './brand/fonts.mjs';

const noindex = ['/404', '/check-your-inbox', '/confirmed', '/link-expired', '/signup-problem'];

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
  // Unpublished posts never get a page, so they can't reach the sitemap. The filter
  // drops the pages marked noindex, which only make sense mid-signup.
  integrations: [sitemap({ filter: (page) => !noindex.some((p) => page.endsWith(p)) })],
  fonts,
  // One stylesheet for the whole site: a page waits on one request, not one per component.
  // Safe because every :global() rule is anchored to a scoped class.
  vite: { build: { cssCodeSplit: false } },
});
