/** The main nav. `section` is the path prefix that marks the link as the current page. */
export const nav = [
  { href: '/product/content-modelling', section: '/product', label: 'Product' },
  { href: '/compare', section: '/compare', label: 'Compare' },
  { href: 'https://docs.tachyoncms.com', section: null, label: 'Docs' },
  { href: '/blog', section: '/blog', label: 'Blog' },
  { href: '/roadmap', section: '/roadmap', label: 'Roadmap' },
];

export const isCurrent = (path: string, section: string | null) =>
  section !== null && (path === section || path.startsWith(`${section}/`));
