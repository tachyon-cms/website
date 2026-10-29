import { afterEach, describe, expect, it, vi } from 'vitest';
import contributorsSnapshot from '../src/data/contributors.snapshot.json';
import releasesSnapshot from '../src/data/releases.snapshot.json';
import { announced, fetchContributors, fetchReleases, renderNotes, type Release } from '../src/lib/github';

const offline = (async () => Promise.reject(new Error('offline'))) as typeof fetch;
const rateLimited = (async () => new Response('{"message":"API rate limit exceeded"}', { status: 403 })) as typeof fetch;

describe('GitHub data at build time', () => {
  afterEach(() => vi.restoreAllMocks());

  it.each([
    ['a rejected fetch', offline],
    ['a 403 rate limit', rateLimited],
    ['a body that is not a list', (async () => Response.json({})) as typeof fetch],
  ])('falls back to the snapshots, with one warning, on %s', async (_, fetcher) => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(await fetchReleases(fetcher, '')).toEqual(releasesSnapshot);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(await fetchContributors(fetcher, '')).toEqual(contributorsSnapshot);
    expect(warn).toHaveBeenCalledTimes(2);
  });

  it('maps a release and skips drafts', async () => {
    const ok = (async () =>
      Response.json([
        {
          tag_name: 'v0.2.0',
          name: 'v0.2.0',
          published_at: '2026-12-01T10:00:00Z',
          html_url: 'https://github.com/tachyon-cms/tachyoncms/releases/tag/v0.2.0',
          prerelease: false,
          draft: false,
          body: '## Notes',
        },
        { tag_name: 'v0.3.0', name: '', published_at: null, html_url: 'x', prerelease: true, draft: true, body: '' },
      ])) as typeof fetch;
    expect(await fetchReleases(ok, '')).toEqual([
      {
        tag: 'v0.2.0',
        name: 'v0.2.0',
        published: '2026-12-01T10:00:00Z',
        url: 'https://github.com/tachyon-cms/tachyoncms/releases/tag/v0.2.0',
        prerelease: false,
        body: '## Notes',
      },
    ]);
  });

  it('maps contributors and leaves out bots', async () => {
    const ok = (async () =>
      Response.json([
        { login: 'ann', html_url: 'https://github.com/ann', contributions: 3, type: 'User' },
        { login: 'dependabot[bot]', html_url: 'https://github.com/apps/dependabot', contributions: 5, type: 'Bot' },
      ])) as typeof fetch;
    expect(await fetchContributors(ok, '')).toEqual([{ login: 'ann', url: 'https://github.com/ann', contributions: 3 }]);
  });
});

describe('release notes', () => {
  it('escapes raw HTML and drops script links', () => {
    const html = renderNotes('<script>alert(1)</script>\n\n<img src=x onerror=alert(1)>\n\n[x](javascript:alert(1))');
    expect(html).not.toMatch(/<script|<img|javascript:/);
    expect(html).toContain('&lt;script&gt;');
  });

  it('demotes headings under the release title and links bare URLs', () => {
    const html = renderNotes('## Get it\n\nFull changes: https://github.com/tachyon-cms/tachyoncms/commits/v0.1.0');
    expect(html).toContain('<h3>Get it</h3>');
    expect(html).toContain('<a href="https://github.com/tachyon-cms/tachyoncms/commits/v0.1.0">');
  });

  it('turns images into links, since the CSP only loads images from this site', () => {
    const html = renderNotes('![The admin](https://example.com/a.png)\n\n[![Badge](https://example.com/b.svg)](https://example.com/ci)');
    expect(html).not.toContain('<img');
    expect(html).toContain('<a href="https://example.com/a.png">The admin</a>');
    expect(html).toContain('<a href="https://example.com/ci">Badge</a>');
    expect(html).not.toMatch(/<a [^>]*>[^<]*<a /);
  });

  it('demotes the footnotes heading and keeps footnote ids unique per release', () => {
    const md = 'Hi[^1]\n\n[^1]: Note.';
    const a = renderNotes(md, 'v0.1.0-');
    const b = renderNotes(md, 'v0.2.0-');
    expect(a).not.toMatch(/<h2/);
    expect(a).toMatch(/<h3[^>]*>Footnotes<\/h3>/);
    const ids = (html: string) => [...html.matchAll(/id="([^"]+)"/g)].map((m) => m[1]);
    expect(ids(a).filter((id) => ids(b).includes(id))).toEqual([]);
  });
});

describe('announced', () => {
  const r = (tag: string, prerelease = true) => ({ tag, prerelease }) as Release;
  it('skips -rc and -alpha tags but keeps a pre-1.0 release GitHub flags as prerelease', () => {
    expect(announced([r('v0.2.0-rc.1'), r('v0.2.0-alpha.3'), r('v0.1.0'), r('v0.0.9')])?.tag).toBe('v0.1.0');
  });
  it('is undefined when nothing qualifies', () => {
    expect(announced([r('v1.0.0-rc.1')])).toBeUndefined();
  });
});
