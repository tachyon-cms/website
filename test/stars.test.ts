import { describe, expect, it } from 'vitest';
import { fetchStars, formatStars } from '../src/lib/stars';

describe('GitHub star count', () => {
  it('reads stargazers_count', async () => {
    const ok = async () => Response.json({ stargazers_count: 42 });
    expect(await fetchStars(ok as typeof fetch, '')).toBe(42);
  });

  it.each([
    ['a rejected fetch', async () => Promise.reject(new Error('offline'))],
    ['a rate limit', async () => new Response('{}', { status: 403 })],
    ['an unexpected body', async () => Response.json({})],
    ['a body that is not JSON', async () => new Response('<html>')],
  ])('gives null for %s', async (_, fetcher) => {
    expect(await fetchStars(fetcher as typeof fetch, '')).toBeNull();
  });

  it('formats thousands', () => {
    expect([950, 1000, 1234, 15600].map(formatStars)).toEqual(['950', '1k', '1.2k', '15.6k']);
  });
});
