// The repo's star count for the header, read once per build. Any failure (offline,
// rate limit, a changed API) gives null and the header shows no number: never a
// failed build. Set GITHUB_TOKEN in CI to lift the anonymous rate limit.
const REPO = 'https://api.github.com/repos/tachyon-cms/tachyoncms';

export async function fetchStars(fetcher: typeof fetch = fetch, token = process.env.GITHUB_TOKEN): Promise<number | null> {
  try {
    const res = await fetcher(REPO, {
      headers: { Accept: 'application/vnd.github+json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const { stargazers_count: stars } = (await res.json()) as { stargazers_count?: unknown };
    return typeof stars === 'number' ? stars : null;
  } catch {
    return null;
  }
}

/** 950 → "950", 1234 → "1.2k". */
export function formatStars(n: number): string {
  return n < 1000 ? String(n) : `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`;
}

let cached: Promise<number | null> | undefined;
export const stars = () => (cached ??= fetchStars());
