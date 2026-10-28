import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Env } from '../server/env';
import { confirm, normalizeEmail, showConfirm, subscribe } from '../server/signup';
import { LINK_LIFETIME_MS, signToken, verifyToken } from '../server/token';

const env: Env = {
  RESEND_API_KEY: 're_test',
  RESEND_SEGMENT_ID: 'seg_1',
  TURNSTILE_SECRET_KEY: 'ts_secret',
  SIGNING_SECRET: 'a-long-random-signing-secret',
  MAIL_FROM: 'TachyonCMS <launch@tachyoncms.com>',
};

type Call = { url: string; method: string; body: unknown };

/** Stands in for Turnstile and Resend, recording every call. */
function fakeNetwork(opts: { human?: boolean; resend?: (call: Call) => number } = {}) {
  const calls: Call[] = [];
  vi.stubGlobal('fetch', async (input: string, init: RequestInit = {}) => {
    const url = String(input);
    const body =
      init.body instanceof FormData ? Object.fromEntries(init.body) : init.body ? JSON.parse(String(init.body)) : undefined;
    const call = { url, method: init.method ?? 'GET', body };
    calls.push(call);
    if (url.includes('turnstile')) return Response.json({ success: opts.human ?? true });
    return new Response('{}', { status: opts.resend?.(call) ?? 200 });
  });
  return calls;
}

function post(path: string, fields: Record<string, string>): Request {
  return new Request(`https://tachyoncms.com${path}`, {
    method: 'POST',
    body: new URLSearchParams(fields),
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'CF-Connecting-IP': '203.0.113.9' },
  });
}

const where = (res: Response) => new URL(res.headers.get('Location') ?? '').pathname;

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('confirmation tokens', () => {
  it('round-trip the address', async () => {
    expect(await verifyToken(await signToken('a@b.co', 's'), 's')).toBe('a@b.co');
  });

  it('refuse a different secret, a tampered payload and an expired link', async () => {
    const token = await signToken('a@b.co', 's', 1_000);
    expect(await verifyToken(token, 'other', 1_000)).toBeNull();
    const [payload, sig] = token.split('.');
    const forged = btoa(JSON.stringify({ e: 'victim@b.co', x: 9e15 })).replace(/=+$/, '');
    expect(await verifyToken(`${forged}.${sig}`, 's', 1_000)).toBeNull();
    expect(await verifyToken(`${payload}.${sig}x`, 's', 1_000)).toBeNull();
    expect(await verifyToken(token, 's', 1_000 + LINK_LIFETIME_MS + 1)).toBeNull();
    expect(await verifyToken(token, 's', 1_000 + LINK_LIFETIME_MS - 1)).toBe('a@b.co');
    expect(await verifyToken('garbage', 's')).toBeNull();
    expect(await verifyToken('', 's')).toBeNull();
  });
});

describe('normalizeEmail', () => {
  it('trims, lowercases and rejects what clearly is not an address', () => {
    expect(normalizeEmail('  Ann@Example.COM ')).toBe('ann@example.com');
    for (const bad of ['', 'ann', 'ann@', '@x.co', 'a b@x.co', 'ann@x', `${'a'.repeat(250)}@x.co`, 3]) {
      expect(normalizeEmail(bad)).toBeNull();
    }
  });
});

describe('subscribe', () => {
  it('emails a signed confirmation link after the human check', async () => {
    const calls = fakeNetwork();
    const res = await subscribe(post('/api/subscribe', { email: 'Ann@Example.com', 'cf-turnstile-response': 't' }), env);
    expect(res.status).toBe(303);
    expect(where(res)).toBe('/check-your-inbox');
    expect(calls[0]?.body).toMatchObject({ secret: 'ts_secret', response: 't', remoteip: '203.0.113.9' });
    const mail = calls[1]?.body as { to: string[]; from: string; subject: string; text: string; html: string };
    expect(calls[1]?.url).toBe('https://api.resend.com/emails');
    // One list behind every form, so the email promises what each form's fine print does.
    expect(mail.subject).toBe('Confirm your TachyonCMS updates');
    expect(mail.text).toContain('releases and news about the admin');
    expect(mail.html).toContain('releases and news about the admin');
    expect(mail.to).toEqual(['ann@example.com']);
    expect(mail.from).toBe(env.MAIL_FROM);
    const link = new URL(mail.text.match(/https:\/\/\S+/)?.[0] ?? '');
    expect(link.pathname).toBe('/confirm/');
    expect(await verifyToken(link.searchParams.get('token') ?? '', env.SIGNING_SECRET)).toBe('ann@example.com');
    expect(res.headers.get('Strict-Transport-Security')).toContain('max-age=');
  });

  it('stores nothing and sends nothing for bots, bad addresses or a failed check', async () => {
    const calls = fakeNetwork({ human: false });
    const trap = await subscribe(post('/api/subscribe', { email: 'a@b.co', website: 'spam' }), env);
    expect(where(trap)).toBe('/check-your-inbox');
    const bad = await subscribe(post('/api/subscribe', { email: 'nope', 'cf-turnstile-response': 't' }), env);
    expect(where(bad)).toBe('/signup-problem');
    const robot = await subscribe(post('/api/subscribe', { email: 'a@b.co', 'cf-turnstile-response': 't' }), env);
    expect(where(robot)).toBe('/signup-problem');
    const missing = await subscribe(post('/api/subscribe', { email: 'a@b.co' }), env);
    expect(where(missing)).toBe('/signup-problem');
    expect(calls.filter((c) => c.url.includes('resend'))).toEqual([]);
  });

  it('says so when the email fails to send, and logs why without the address', async () => {
    fakeNetwork({ resend: () => 403 });
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = await subscribe(post('/api/subscribe', { email: 'a@b.co', 'cf-turnstile-response': 't' }), env);
    expect(where(res)).toBe('/signup-problem');
    expect(log).toHaveBeenCalledWith('signup: sending the confirmation email failed', 403, '{}');
    expect(JSON.stringify(log.mock.calls)).not.toContain('a@b.co');
  });

  it('names settings that are missing instead of calling out with them', async () => {
    const calls = fakeNetwork();
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const broken = { ...env, TURNSTILE_SECRET_KEY: '', RESEND_API_KEY: undefined } as unknown as Env;
    const res = await subscribe(post('/api/subscribe', { email: 'a@b.co', 'cf-turnstile-response': 't' }), broken);
    expect(where(res)).toBe('/signup-problem');
    expect(log).toHaveBeenCalledWith('signup: settings missing', ['TURNSTILE_SECRET_KEY', 'RESEND_API_KEY']);
    expect(calls).toEqual([]);
  });

  it('logs the reason Turnstile gives even when it answers 400', async () => {
    vi.stubGlobal('fetch', async () =>
      Response.json({ success: false, 'error-codes': ['missing-input-secret'] }, { status: 400 }),
    );
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    await subscribe(post('/api/subscribe', { email: 'a@b.co', 'cf-turnstile-response': 't' }), env);
    expect(log).toHaveBeenCalledWith('signup: human check failed', ['missing-input-secret'], '');
  });

  it('logs why the human check failed', async () => {
    vi.stubGlobal('fetch', async () =>
      Response.json({ success: false, 'error-codes': ['invalid-input-secret'], hostname: 'tachyoncms.com' }),
    );
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = await subscribe(post('/api/subscribe', { email: 'a@b.co', 'cf-turnstile-response': 't' }), env);
    expect(where(res)).toBe('/signup-problem');
    expect(log).toHaveBeenCalledWith('signup: human check failed', ['invalid-input-secret'], 'tachyoncms.com');
  });
});

describe('confirm', () => {
  it('shows a button for a good link and sends a bad one to link-expired', async () => {
    const token = await signToken('ann@example.com', env.SIGNING_SECRET);
    const page = await showConfirm(new Request(`https://tachyoncms.com/confirm/?token=${token}`), env);
    expect(page.status).toBe(200);
    const html = await page.text();
    expect(html).toContain('method="post"');
    expect(html).toContain(`value="${token}"`);
    expect(html).toContain('releases and news about the admin');
    expect(page.headers.get('Content-Security-Policy')).toContain("frame-ancestors 'none'");
    // The function page has no Astro build behind it, so it links a plain static stylesheet.
    expect(html).toContain('<link rel="stylesheet" href="/signup.css">');
    const bad = await showConfirm(new Request('https://tachyoncms.com/confirm/?token=x'), env);
    expect(where(bad)).toBe('/link-expired');
  });

  it('adds a new contact to the subscriber segment', async () => {
    const calls = fakeNetwork();
    const token = await signToken('ann@example.com', env.SIGNING_SECRET);
    const res = await confirm(post('/confirm/', { token }), env);
    expect(where(res)).toBe('/confirmed');
    expect(calls).toEqual([
      {
        url: 'https://api.resend.com/contacts',
        method: 'POST',
        body: { email: 'ann@example.com', unsubscribed: false, segments: [{ id: 'seg_1' }] },
      },
    ]);
  });

  it('resubscribes an existing contact and adds the segment', async () => {
    const calls = fakeNetwork({ resend: (c) => (c.method === 'POST' && c.url.endsWith('/contacts') ? 409 : 200) });
    const token = await signToken('ann@example.com', env.SIGNING_SECRET);
    const res = await confirm(post('/confirm/', { token }), env);
    expect(where(res)).toBe('/confirmed');
    expect(calls.slice(1).map((c) => `${c.method} ${c.url}`)).toEqual([
      'PATCH https://api.resend.com/contacts/ann%40example.com',
      'POST https://api.resend.com/contacts/ann%40example.com/segments/seg_1',
    ]);
  });

  it('refuses forged tokens without calling Resend', async () => {
    const calls = fakeNetwork();
    const res = await confirm(post('/confirm/', { token: 'forged.token' }), env);
    expect(where(res)).toBe('/link-expired');
    expect(calls).toEqual([]);
  });
});
