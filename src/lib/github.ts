// Releases and contributors for /releases and /community, read once per build. A
// failure (offline, rate limit, a changed API) never fails the build: the pages fall
// back to the snapshots in src/data, which `npm run snapshot` refreshes. Set
// GITHUB_TOKEN in CI to lift the anonymous rate limit.
import { micromark } from 'micromark';
import { gfm, gfmHtml } from 'micromark-extension-gfm';
import contributorsSnapshot from '../data/contributors.snapshot.json' with { type: 'json' };
import releasesSnapshot from '../data/releases.snapshot.json' with { type: 'json' };

const API = 'https://api.github.com/repos/tachyon-cms/tachyoncms';

export interface Release {
  tag: string;
  name: string;
  /** ISO 8601, from published_at. */
  published: string;
  url: string;
  prerelease: boolean;
  /** The notes, as GitHub Markdown. Render with renderNotes. */
  body: string;
}

export interface Contributor {
  login: string;
  url: string;
  contributions: number;
}

async function list(path: string, fetcher: typeof fetch, token: string | undefined): Promise<Record<string, unknown>[]> {
  const res = await fetcher(`${API}${path}`, {
    headers: { Accept: 'application/vnd.github+json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) throw new Error(`GitHub answered ${res.status} for ${path}`);
  const body: unknown = await res.json();
  if (!Array.isArray(body)) throw new Error(`GitHub sent something other than a list for ${path}`);
  return body;
}

/** Published releases, newest first. Throws on any failure; `npm run snapshot` wants to know. */
export async function getReleases(fetcher: typeof fetch = fetch, token = process.env.GITHUB_TOKEN): Promise<Release[]> {
  return (await list('/releases?per_page=100', fetcher, token))
    .filter((r) => !r.draft)
    .map((r) => ({
      tag: String(r.tag_name),
      name: String(r.name || r.tag_name),
      published: String(r.published_at),
      url: String(r.html_url),
      prerelease: r.prerelease === true,
      body: String(r.body ?? ''),
    }));
}

/** People who have commits on the default branch, most first. Bots are left out. */
export async function getContributors(fetcher: typeof fetch = fetch, token = process.env.GITHUB_TOKEN): Promise<Contributor[]> {
  return (await list('/contributors?per_page=100', fetcher, token))
    .filter((c) => c.type !== 'Bot')
    .map((c) => ({ login: String(c.login), url: String(c.html_url), contributions: Number(c.contributions) }));
}

async function orSnapshot<T>(what: string, live: () => Promise<T>, snapshot: T): Promise<T> {
  try {
    return await live();
  } catch (error) {
    console.warn(`github: using the ${what} snapshot (${error instanceof Error ? error.message : error})`);
    return snapshot;
  }
}

export const fetchReleases = (fetcher: typeof fetch = fetch, token = process.env.GITHUB_TOKEN) =>
  orSnapshot('releases', () => getReleases(fetcher, token), releasesSnapshot as Release[]);

// Every page's announcement bar asks, so the build fetches once.
let cachedReleases: Promise<Release[]> | undefined;
export const releases = () => (cachedReleases ??= fetchReleases());

/**
 * The release the announcement bar names: the newest with a plain vX.Y.Z tag. GitHub's
 * prerelease flag can't decide it, because every pre-1.0 release (v0.1.0 included)
 * carries it; a semver suffix such as -rc.1 or -alpha.2 does.
 */
export const announced = (list: Release[]) => list.find((r) => /^v\d+\.\d+\.\d+$/.test(r.tag));

export const fetchContributors = (fetcher: typeof fetch = fetch, token = process.env.GITHUB_TOKEN) =>
  orSnapshot('contributors', () => getContributors(fetcher, token), contributorsSnapshot as Contributor[]);

/**
 * Release notes to HTML. micromark escapes raw HTML and drops javascript: and other
 * unsafe link targets by default, and emits no style="" attributes, so the output is
 * safe under the CSP. Three changes on top:
 * - headings move down a level to sit under the release's own <h2>, the footnotes one too;
 * - images become links to the image, because the CSP loads images only from this site;
 * - footnote ids take `prefix`, so several releases on one page don't share ids.
 */
export function renderNotes(markdown: string, prefix = 'notes-'): string {
  const img = /<img src="([^"]*)" alt="([^"]*)"(?: title="[^"]*")? \/>/;
  return micromark(markdown, { extensions: [gfm()], htmlExtensions: [gfmHtml({ clobberPrefix: prefix })] })
    .replace(/<(\/?)h([1-5])((?:\s[^>]*)?)>/g, (_, slash: string, level: string, attrs: string) => `<${slash}h${Number(level) + 1}${attrs}>`)
    .replaceAll('footnote-label', `${prefix}footnote-label`)
    .replace(new RegExp(`(<a [^>]*>)${img.source}</a>`, 'g'), (_, open: string, src: string, alt: string) => `${open}${alt || src}</a>`)
    .replace(new RegExp(img.source, 'g'), (_, src: string, alt: string) => `<a href="${src}">${alt || src}</a>`);
}
