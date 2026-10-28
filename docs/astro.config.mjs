// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import { fonts } from '../brand/fonts.mjs';

export default defineConfig({
  site: 'https://docs.tachyoncms.com',
  output: 'static',
  // Matches the Worker's html_handling: drop-trailing-slash (wrangler.jsonc).
  trailingSlash: 'never',
  build: { format: 'file' },
  fonts,
  integrations: [
    starlight({
      title: 'TachyonCMS',
      customCss: ['./src/styles/brand.css'],
      // Adds the <Font> tags; Starlight has no other hook into the head for them.
      components: { Head: './src/components/Head.astro' },
      editLink: { baseUrl: 'https://github.com/tachyon-cms/website/edit/main/docs/' },
    }),
  ],
});
