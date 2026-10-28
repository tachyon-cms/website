// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

export default defineConfig({
  site: 'https://docs.tachyoncms.com',
  output: 'static',
  // Matches the Worker's html_handling: drop-trailing-slash (wrangler.jsonc).
  trailingSlash: 'never',
  build: { format: 'file' },
  integrations: [
    starlight({
      title: 'TachyonCMS',
      editLink: { baseUrl: 'https://github.com/tachyon-cms/website/edit/main/docs/' },
    }),
  ],
});
