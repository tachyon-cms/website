// @ts-check
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://tachyoncms.com',
  output: 'static',
  // The stylesheet is small, so it's inlined to avoid a render-blocking request. Its hash
  // goes into the content security policy after the build (scripts/csp.mjs).
  build: { inlineStylesheets: 'always' },
});
