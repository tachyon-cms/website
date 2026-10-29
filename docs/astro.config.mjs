// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import starlightSidebarTopics from 'starlight-sidebar-topics';
import starlightLinksValidator from 'starlight-links-validator';
import { docsFonts } from '../brand/fonts.mjs';

// Starlight fetches the Pagefind UI (about 95 KB of script) as soon as the page is idle,
// which Lighthouse counts against mobile first paint. This loads it when a reader reaches
// for search instead: hovering or focusing the button, clicking it, or pressing Ctrl/Cmd+K.
const idleSearch =
  /const onIdle = window\.requestIdleCallback \|\| \(\(cb\) => setTimeout\(cb, 1\)\);\s*onIdle\(async \(\) => \{/;
let searchPatched = false;
const searchOnDemand = {
  name: 'search-on-demand',
  apply: 'build',
  transform(code, id) {
    if (!/@astrojs\/starlight\/.*Search\.astro\?astro&type=script/.test(id)) return;
    if (!idleSearch.test(code)) throw new Error('search-on-demand: Starlight Search changed; update the patch');
    searchPatched = true;
    return code.replace(
      idleSearch,
      `let started;
      const onDemand = (load) => {
        const go = () => {
          started ??= load()
            .then(() => dialog.open && this.querySelector('input')?.focus())
            .catch((err) => {
              // Let the next attempt try again, say after a dropped connection.
              started = undefined;
              console.error('Search failed to load', err);
            });
        };
        for (const type of ['pointerenter', 'focus', 'click']) openBtn.addEventListener(type, go);
        window.addEventListener('keydown', (e) => (e.metaKey || e.ctrlKey) && e.key === 'k' && go());
      };
      onDemand(async () => {`,
    );
  },
  // Astro builds the client in its own Vite pass; only that pass sees the Search script.
  generateBundle() {
    if (this.environment?.name === 'client' && !searchPatched) {
      throw new Error('search-on-demand: Starlight Search script not found; update the patch');
    }
  },
};

export default defineConfig({
  site: 'https://docs.tachyoncms.com',
  output: 'static',
  // Matches the Worker's html_handling: drop-trailing-slash (wrangler.jsonc).
  trailingSlash: 'never',
  // Directory output: Starlight writes .html into every link under format 'file'.
  // drop-trailing-slash serves reference/index.html at /reference all the same.
  build: { format: 'directory' },
  fonts: docsFonts,
  vite: { plugins: [searchOnDemand] },
  integrations: [
    starlight({
      title: 'TachyonCMS',
      // The mark beside the title as live text, the same lockup as the site header.
      logo: { src: '../public/brand/mark.svg' },
      social: [{ icon: 'github', label: 'TachyonCMS on GitHub', href: 'https://github.com/tachyon-cms/tachyoncms' }],
      customCss: ['./src/styles/brand.css'],
      components: {
        // Adds the <Font> tags; Starlight has no other hook into the head for them.
        Head: './src/components/Head.astro',
        // The topics render as tabs in the header, so the sidebar drops the plugin's topic list.
        Header: './src/components/TopicTabs.astro',
        Sidebar: '@astrojs/starlight/components/Sidebar.astro',
        // Dark only: an empty provider, so nothing switches to light, and no picker.
        ThemeProvider: './src/components/ThemeProvider.astro',
        ThemeSelect: './src/components/ThemeProvider.astro',
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
              {
                label: 'HTTP API',
                items: [
                  { label: 'Overview', slug: 'reference/http-api' },
                  'reference/http-api/auth',
                  'reference/http-api/users-and-roles',
                  'reference/http-api/collections',
                  'reference/http-api/documents',
                ],
              },
              'reference/field-types',
              'reference/filters',
              'reference/config',
              'reference/errors',
            ],
          },
          {
            label: 'CLI',
            link: '/cli',
            // The command pages are generated (docs/scripts/gen-cli.mjs), so a new command shows up on its own.
            items: [
              { label: 'Overview', slug: 'cli' },
              { autogenerate: { directory: 'cli' } },
            ],
          },
        ]),
        // Fails the build on a broken internal link or #anchor.
        starlightLinksValidator(),
      ],
    }),
  ],
});
