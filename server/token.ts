// Confirmation links carry the address and an expiry, signed so nobody can confirm an
// address they don't own. Nothing about unconfirmed addresses is stored anywhere.

const encoder = new TextEncoder();

function base64url(bytes: Uint8Array): string {
  let text = '';
  for (const b of bytes) text += String.fromCharCode(b);
  return btoa(text).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

function fromBase64url(text: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]*$/.test(text)) return null;
  const padded = text.replaceAll('-', '+').replaceAll('_', '/') + '='.repeat((4 - (text.length % 4)) % 4);
  try {
    return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
  } catch {
    return null;
  }
}

async function key(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
    'verify',
  ]);
}

export const LINK_LIFETIME_MS = 48 * 60 * 60 * 1000;

export async function signToken(email: string, secret: string, now = Date.now()): Promise<string> {
  const payload = base64url(encoder.encode(JSON.stringify({ e: email, x: now + LINK_LIFETIME_MS })));
  const signature = await crypto.subtle.sign('HMAC', await key(secret), encoder.encode(payload));
  return `${payload}.${base64url(new Uint8Array(signature))}`;
}

/** The address a token confirms, or null when it's forged, damaged or expired. */
export async function verifyToken(token: string, secret: string, now = Date.now()): Promise<string | null> {
  const [payload, signature, ...rest] = token.split('.');
  if (!payload || !signature || rest.length > 0) return null;
  const sig = fromBase64url(signature);
  if (!sig) return null;
  const valid = await crypto.subtle.verify('HMAC', await key(secret), sig, encoder.encode(payload));
  if (!valid) return null;
  const bytes = fromBase64url(payload);
  if (!bytes) return null;
  try {
    const { e, x } = JSON.parse(new TextDecoder().decode(bytes)) as { e?: unknown; x?: unknown };
    if (typeof e !== 'string' || typeof x !== 'number' || x < now) return null;
    return e;
  } catch {
    return null;
  }
}
