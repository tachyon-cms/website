import type { Env } from './env';
import { signToken, verifyToken } from './token';

const RESEND = 'https://api.resend.com';
const TURNSTILE = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

/** Plain enough to catch typos; the confirmation email is the real check. */
export function normalizeEmail(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const email = input.trim().toLowerCase();
  if (email.length > 254 || /\s/.test(email)) return null;
  return /^[^@]+@[^@]+\.[^@.]+$/.test(email) ? email : null;
}

/** Security headers for every response a function writes. Static files get theirs from `_headers`. */
export function secured(response: Response): Response {
  const h = response.headers;
  h.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  h.set('X-Content-Type-Options', 'nosniff');
  h.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  h.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), interest-cohort=()');
  h.set('Cross-Origin-Opener-Policy', 'same-origin');
  h.set(
    'Content-Security-Policy',
    "default-src 'none'; style-src 'self'; img-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
  );
  h.set('Cache-Control', 'no-store');
  return response;
}

function redirect(request: Request, path: string): Response {
  return secured(new Response(null, { status: 303, headers: { Location: new URL(path, request.url).toString() } }));
}

async function humanCheck(env: Env, request: Request, token: unknown): Promise<boolean> {
  if (typeof token !== 'string' || token === '') return false;
  const body = new FormData();
  body.set('secret', env.TURNSTILE_SECRET_KEY);
  body.set('response', token);
  const ip = request.headers.get('CF-Connecting-IP');
  if (ip) body.set('remoteip', ip);
  const res = await fetch(TURNSTILE, { method: 'POST', body });
  if (!res.ok) {
    console.error('signup: human check unavailable', res.status);
    return false;
  }
  const outcome = (await res.json()) as { success?: boolean; 'error-codes'?: string[]; hostname?: string };
  if (outcome.success !== true) {
    // The codes say whether it's the visitor or our keys, such as `invalid-input-secret`.
    console.error('signup: human check failed', outcome['error-codes'] ?? [], outcome.hostname ?? '');
  }
  return outcome.success === true;
}

function resend(env: Env, path: string, method: string, body?: unknown): Promise<Response> {
  return fetch(`${RESEND}${path}`, {
    method,
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

/** POST /api/subscribe: checks the visitor is human and emails a confirmation link. */
export async function subscribe(request: Request, env: Env): Promise<Response> {
  const form = await request.formData().catch(() => null);
  if (!form) return redirect(request, '/signup-problem/');
  // Bots fill every field; people never see this one.
  if (form.get('website')) return redirect(request, '/check-your-inbox/');
  const email = normalizeEmail(form.get('email'));
  if (!email) return redirect(request, '/signup-problem/');
  if (!(await humanCheck(env, request, form.get('cf-turnstile-response')))) {
    return redirect(request, '/signup-problem/');
  }
  const link = new URL('/confirm/', request.url);
  link.searchParams.set('token', await signToken(email, env.SIGNING_SECRET));
  const sent = await resend(env, '/emails', 'POST', {
    from: env.MAIL_FROM,
    to: [email],
    subject: 'Confirm your TachyonCMS launch alert',
    text: `One click and you're on the list:\n\n${link}\n\nDidn't ask for this? Ignore it and you won't hear from us again.`,
    html: `<p>One click and you're on the list: <a href="${escapeHtml(link.toString())}">Confirm my email</a>.</p><p>Didn't ask for this? Ignore it and you won't hear from us again.</p>`,
  });
  if (!sent.ok) {
    // Resend's message names the cause, such as an unverified domain. Never log the address.
    console.error('signup: sending the confirmation email failed', sent.status, await sent.text());
    return redirect(request, '/signup-problem/');
  }
  return redirect(request, '/check-your-inbox/');
}

function confirmPage(token: string): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Confirm your email · TachyonCMS</title>
<link rel="stylesheet" href="/site.css">
</head>
<body>
<main class="notice">
<h1>One more click</h1>
<p>Confirm and we'll let you know the day TachyonCMS launches.</p>
<form method="post" action="/confirm/">
<input type="hidden" name="token" value="${escapeHtml(token)}">
<button type="submit">Confirm my email</button>
</form>
</main>
</body>
</html>`;
}

/** GET /confirm/: a button, not the confirmation itself, because mail scanners open links. */
export async function showConfirm(request: Request, env: Env): Promise<Response> {
  const token = new URL(request.url).searchParams.get('token') ?? '';
  if (!(await verifyToken(token, env.SIGNING_SECRET))) return redirect(request, '/link-expired/');
  return secured(new Response(confirmPage(token), { headers: { 'Content-Type': 'text/html; charset=utf-8' } }));
}

/** POST /confirm/: adds the address to the launch segment. */
export async function confirm(request: Request, env: Env): Promise<Response> {
  const form = await request.formData().catch(() => null);
  const token = form?.get('token');
  const email = typeof token === 'string' ? await verifyToken(token, env.SIGNING_SECRET) : null;
  if (!email) return redirect(request, '/link-expired/');

  const created = await resend(env, '/contacts', 'POST', {
    email,
    unsubscribed: false,
    segments: [{ id: env.RESEND_SEGMENT_ID }],
  });
  if (created.ok) return redirect(request, '/confirmed/');
  // Already a contact (perhaps from an earlier signup): subscribe them and add the segment.
  const contact = `/contacts/${encodeURIComponent(email)}`;
  const updated = await resend(env, contact, 'PATCH', { unsubscribed: false });
  const joined = await resend(env, `${contact}/segments/${encodeURIComponent(env.RESEND_SEGMENT_ID)}`, 'POST');
  if (!updated.ok || !joined.ok) {
    console.error('signup: saving the contact failed', created.status, updated.status, joined.status);
    return redirect(request, '/signup-problem/');
  }
  return redirect(request, '/confirmed/');
}
