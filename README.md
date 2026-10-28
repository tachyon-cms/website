# tachyoncms.com

The website for [TachyonCMS](https://github.com/tachyon-cms/tachyoncms). For now it's a launch page with an email signup; the full site will run on TachyonCMS itself.

## How it fits together

- **Pages** are static [Astro](https://astro.build) in `src/pages`, sharing one stylesheet at `public/site.css`.
- **Signup** runs on Cloudflare Pages Functions (`functions/`, logic in `server/`). A visitor passes Cloudflare Turnstile, gets a signed confirmation link by email through Resend, and joins the launch segment only after clicking it. Unconfirmed addresses aren't stored anywhere.
- **Security headers** for static pages live in `headers.base` (`docs/headers.base` for the docs). The build adds a content security policy hashed from its own output (`scripts/csp.mjs`) and writes `dist/_headers`. The functions set the same headers in `server/signup.ts`, and `test/headers.test.ts` keeps the two in step.

## Working on it

```sh
npm ci
npm run dev        # the pages, at http://localhost:4321
npm test           # signup logic
npm run typecheck  # functions
npm run build      # type-check the pages and build to dist/
```

To try the signup end to end, copy `.dev.vars.example` to `.dev.vars`, fill it in, then `npm run build && npm run preview`.

## Settings in Cloudflare Pages

| Name | Kind | What it is |
| --- | --- | --- |
| `PUBLIC_TURNSTILE_SITE_KEY` | build variable | Turnstile widget site key |
| `TURNSTILE_SECRET_KEY` | secret | Turnstile secret key |
| `RESEND_API_KEY` | secret | Resend key with sending and contacts access |
| `RESEND_SEGMENT_ID` | secret | Segment confirmed addresses join |
| `SIGNING_SECRET` | secret | Long random string that signs confirmation links |
| `MAIL_FROM` | variable | Sender, such as `TachyonCMS <launch@tachyoncms.com>` |

Copyright © 2026 TachyonCMS. All rights reserved.
