/** Secrets and settings the signup functions read, set in Cloudflare Pages. */
export interface Env {
  RESEND_API_KEY: string;
  /** The Resend segment confirmed addresses join. */
  RESEND_SEGMENT_ID: string;
  TURNSTILE_SECRET_KEY: string;
  /** Signs confirmation links. Any long random string. */
  SIGNING_SECRET: string;
  /** Who confirmation emails come from, such as `TachyonCMS <launch@tachyoncms.com>`. */
  MAIL_FROM: string;
}
