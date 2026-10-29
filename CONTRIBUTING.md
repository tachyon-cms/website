# Contributing to tachyoncms.com

This repo holds the website at tachyoncms.com (the repo root) and the docs at docs.tachyoncms.com (`docs/`). Fixes to either are welcome, from a typo to a new guide.

The project's main [contributing guide](https://github.com/tachyon-cms/tachyoncms/blob/main/CONTRIBUTING.md) and [Code of Conduct](https://github.com/tachyon-cms/tachyoncms/blob/main/CODE_OF_CONDUCT.md) apply here too. Report security issues as [SECURITY.md](https://github.com/tachyon-cms/tachyoncms/blob/main/SECURITY.md) describes, never in a public issue.

## Set up

You need the Node version in `.nvmrc`.

```sh
npm ci
npm run dev                 # the site, at http://localhost:4321
npm -w docs run dev         # the docs
```

## Check your change

These are the checks CI runs. Run them before you open a pull request:

```sh
npm run typecheck
npm test                                  # unit tests and script tests
npm run build:site && npm run build:docs
node scripts/claims.mjs dist docs/dist    # banned words, benchmark numbers
node scripts/claims.mjs --source          # the hashed name, in tracked source
node scripts/links.mjs dist docs/dist     # every site link resolves
npx playwright install chromium           # once
npm run test:e2e                          # browser tests for both builds
npm audit --audit-level=moderate
```

CI also runs Lighthouse on mobile and desktop and needs 100 in every category. To run it locally after both builds: `npx lhci autorun --config=lighthouserc.mobile.json`, then the same with `lighthouserc.json`.

## Docs previews

Each push to a branch in this repo, other than `main`, uploads the docs as a Cloudflare Worker version without deploying it. The preview URL is in the summary of the run of the Preview docs workflow. Pull requests from forks don't get a preview.

Preview URLs are public. Anyone with the link can open one. Cloudflare sends `noindex`, so search engines leave them out. A preview stays up after its branch is deleted or merged. Don't push docs that must stay private, such as an unannounced release, to a branch in this repo.

## Sign off your commits

Every commit needs a `Signed-off-by` line for its author's email, which certifies the [Developer Certificate of Origin](https://developercertificate.org/). Add it with `git commit -s`. The DCO check fails a pull request with an unsigned commit.

## Pull requests

1. Fork the repo and branch from `main`.
2. Use [Conventional Commits](https://www.conventionalcommits.org/) for messages, such as `docs: explain API key scopes`.
3. Open a pull request against `main`. It merges by squash once every check is green.
