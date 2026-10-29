/** The Product menu: the six product pages, then Security and Why. */
export const product = [
  { href: '/product/content-modelling', label: 'Content modelling', note: 'Define a content type and its API exists.' },
  { href: '/product/querying', label: 'Querying', note: 'Filter, sort and populate from the query string.' },
  { href: '/product/access-control', label: 'Access control', note: 'Rules compiled into the SQL, down to a field.' },
  { href: '/product/sign-in', label: 'Sign-in', note: 'Sessions, scoped API keys and Argon2id.' },
  { href: '/product/schema-as-code', label: 'Schema as code', note: 'Export, diff and apply it from version control.' },
  { href: '/product/admin', label: 'The admin', note: "Planned. Here's the bar it has to clear." },
  { href: '/security', label: 'Security', note: 'Releases you can verify before you run them.' },
  { href: '/why', label: 'Why TachyonCMS', note: "Why you shouldn't have to pick a side." },
];

/** The rest of the main nav, after Product. `section` is the path prefix that marks the link as the current page. */
export const nav = [
  { href: 'https://docs.tachyoncms.com', section: null, label: 'Docs' },
  { href: '/compare', section: '/compare', label: 'Compare' },
  { href: '/blog', section: '/blog', label: 'Blog' },
  { href: '/roadmap', section: '/roadmap', label: 'Roadmap' },
];

export const isCurrent = (path: string, section: string | null) =>
  section !== null && (path === section || path.startsWith(`${section}/`));
