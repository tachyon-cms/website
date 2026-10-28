import { describe, expect, it } from 'vitest';
import type { Env } from '../server/env';
import { showConfirm, subscribe } from '../server/signup';
import { signToken } from '../server/token';
import headersBase from '../headers.base?raw';

/** The headers headers.base gives every static path (its `/*` block). */
function baseHeaders(): [string, string][] {
  const block = headersBase.split(/\n\s*\n/).find((b) => b.startsWith('/*\n'));
  if (!block) throw new Error('headers.base has no /* block');
  return block
    .split('\n')
    .slice(1)
    .filter((line) => line.trim())
    .map((line) => {
      const at = line.indexOf(':');
      return [line.slice(0, at).trim(), line.slice(at + 1).trim()];
    });
}

const env: Env = {
  RESEND_API_KEY: 're_test',
  RESEND_SEGMENT_ID: 'seg_1',
  TURNSTILE_SECRET_KEY: 'ts_secret',
  SIGNING_SECRET: 'a-long-random-signing-secret',
  MAIL_FROM: 'TachyonCMS <launch@tachyoncms.com>',
};

describe('function responses carry the static headers', () => {
  const base = baseHeaders();

  it('reads the base headers', () => {
    expect(base.map(([name]) => name)).toContain('Strict-Transport-Security');
  });

  it.each([
    ['a redirect', () => subscribe(new Request('https://tachyoncms.com/api/subscribe', { method: 'POST' }), { ...env, RESEND_API_KEY: '' })],
    [
      'the confirm page',
      async () => showConfirm(new Request(`https://tachyoncms.com/confirm/?token=${await signToken('a@b.co', env.SIGNING_SECRET)}`), env),
    ],
  ])('%s', async (_, respond) => {
    const res = await respond();
    for (const [name, value] of base) expect(res.headers.get(name), name).toBe(value);
  });
});
