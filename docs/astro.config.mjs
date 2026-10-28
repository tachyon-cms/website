// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import starlightSidebarTopics from 'starlight-sidebar-topics';
import starlightLinksValidator from 'starlight-links-validator';
import { fonts } from '../brand/fonts.mjs';

export default defineConfig({
  site: 'https://docs.tachyoncms.com',
  output: 'static',
  // Matches the Worker's html_handling: drop-trailing-slash (wrangler.jsonc).
  trailingSlash: 'never',
  // Directory output: Starlight writes .html into every link under format 'file'.
  // drop-trailing-slash serves reference/index.html at /reference all the same.
  build: { format: 'directory' },
  fonts,
  integrations: [
    starlight({
      title: 'TachyonCMS',
      logo: {
        dark: '../public/brand/logo-dark.svg',
        light: '../public/brand/logo-light.svg',
        replacesTitle: true,
      },
      customCss: ['./src/styles/brand.css'],
      components: {
        // Adds the <Font> tags; Starlight has no other hook into the head for them.
        Head: './src/components/Head.astro',
        // The topics render as tabs in the header, so the sidebar drops the plugin's topic list.
        Header: './src/components/TopicTabs.astro',
        Sidebar: '@astrojs/starlight/components/Sidebar.astro',
        // Dark by default whatever the OS prefers, with the site's light toggle.
        ThemeProvider: './src/components/ThemeProvider.astro',
        ThemeSelect: './src/components/ThemeSelect.astro',
      },
      editLink: { baseUrl: 'https://github.com/tachyon-cms/website/edit/main/docs/' },
      plugins: [
        // Every page lives under one of these four roots. Each topic gets its own sidebar.
        starlightSidebarTopics([
          {
            label: 'Docs',
            link: '/',
            items: [
              { label: 'Start here', items: [{ label: 'Overview', slug: 'index' }, 'install', 'concepts'] },
              {
                label: 'Content',
                items: [
                  'content-types',
                  'fields',
                  'querying',
                  'relationships',
                  'joins-and-virtual-fields',
                  'schema-files',
                ],
              },
              { label: 'Users and access', items: ['sign-in', 'roles', 'api-keys', 'access-rules'] },
              {
                label: 'Running it',
                items: ['configuration', 'deploy/docker', 'deploy/binary', 'security-model'],
              },
              { label: 'Project', items: ['get-involved'] },
            ],
          },
          {
            label: 'Tutorials',
            link: '/tutorials',
            items: [{ label: 'Overview', slug: 'tutorials' }, 'tutorials/build-a-blog'],
          },
          {
            label: 'Reference',
            link: '/reference',
            items: [
              { label: 'Overview', slug: 'reference' },
              'reference/http-api',
              'reference/field-types',
              'reference/filters',
              'reference/config',
              'reference/errors',
            ],
          },
          { label: 'CLI', link: '/cli', items: ['cli'] },
        ]),
        // Fails the build on a broken internal link or #anchor.
        starlightLinksValidator(),
      ],
    }),
  ],
});
