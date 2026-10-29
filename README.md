# tachyoncms.com

This repo holds the two websites for [TachyonCMS](https://github.com/tachyon-cms/tachyoncms):

- **tachyoncms.com**, at the repo root: an [Astro](https://astro.build) static site, plus the email signup in `functions/` (Cloudflare Pages Functions) with its logic in `server/`.
- **docs.tachyoncms.com**, in `docs/`: an Astro [Starlight](https://starlight.astro.build) site, an npm workspace of this repo.

To work on either, see [CONTRIBUTING.md](CONTRIBUTING.md). It covers setup and every check CI runs.

## Deploying

- **The site** deploys through Cloudflare Pages' Git integration: Pages builds every push, and `main` goes to production. `.github/workflows/rebuild-site.yml` calls a Pages deploy hook (the `PAGES_DEPLOY_HOOK` secret) once a day, so a blog post dated for today goes live.
- **The docs** deploy to Cloudflare Workers static assets from `.github/workflows/deploy-docs.yml`, on every push to `main` and once a day. It needs the `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` secrets.

Security headers for both live in `headers.base`. Each build adds a content security policy hashed from its own output (`scripts/csp.mjs`).

## Settings in Cloudflare Pages

| Name | Kind | What it is |
| --- | --- | --- |
| `PUBLIC_TURNSTILE_SITE_KEY` | build variable | Turnstile widget site key |
| `GITHUB_TOKEN` | secret, optional | Read-only GitHub token. The build reads the star count, releases and contributors from GitHub's API, and this lifts the anonymous rate limit. If a call fails, the header shows no star count and the pages use the snapshots in `src/data`. |
| `TURNSTILE_SECRET_KEY` | secret | Turnstile secret key |
| `RESEND_API_KEY` | secret | Resend key with sending and contacts access |
| `RESEND_SEGMENT_ID` | secret | Segment confirmed addresses join |
| `SIGNING_SECRET` | secret | Long random string that signs confirmation links |
| `MAIL_FROM` | variable | Sender, such as `TachyonCMS <launch@tachyoncms.com>` |

## License

The code is under the [MIT License](LICENSE). The TachyonCMS name and logo aren't: the [trademark page](https://tachyoncms.com/trademark) says how you can use them.
