---
title: Get involved
description: Ask questions, report bugs, contribute code or docs, and report security issues privately.
---

TachyonCMS is open source under the MIT License, and built in the open on GitHub at [tachyon-cms/tachyoncms](https://github.com/tachyon-cms/tachyoncms). Questions, bug reports, ideas and pull requests are all welcome.

## Ask a question or share an idea

Use [GitHub Discussions](https://github.com/tachyon-cms/tachyoncms/discussions) for questions, ideas and anything you're unsure is a bug.

## Report a bug

Open an [issue](https://github.com/tachyon-cms/tachyoncms/issues). Say which version you ran (`tachyon --version`), what you sent, what came back, and what you expected. A response's `requestId` helps find the matching lines in the server log.

## Contribute code

[CONTRIBUTING.md](https://github.com/tachyon-cms/tachyoncms/blob/main/CONTRIBUTING.md) covers setup and review in full. The short version:

- **Small fixes**, such as a typo or an obvious bug: open a pull request straight away.
- **Anything bigger**, such as a feature, a new dependency or a change to the API's shape: open an issue or a discussion first, so nobody spends a weekend on something that clashes with the roadmap.
- **Write a failing test first.** Database tests use `#[sqlx::test]`, which gives each test a fresh database, so Postgres isn't mocked.
- **Sign off every commit** with `git commit -s`, under the [Developer Certificate of Origin](https://developercertificate.org/). There's no CLA, and you keep the copyright to your work.
- **Use Conventional Commits** (`feat:`, `fix:`, `docs:` and so on), with a subject under 72 characters.

You'll need Rust (stable), Docker and `sqlx-cli`. Then:

```sh
cargo install sqlx-cli --locked
cp .env.example .env
docker compose up -d
set -a; source .env; set +a
sqlx migrate run --source crates/tachyon-db/migrations
cargo test --workspace
```

Every pull request needs green CI: formatting, Clippy, tests on each supported Postgres version, and the DCO check. Issues labelled [good first issue](https://github.com/tachyon-cms/tachyoncms/labels/good%20first%20issue) are a good place to start.

## Improve these docs

These pages live in the [tachyon-cms/website](https://github.com/tachyon-cms/website) repository, under `docs/`. Every page has an **Edit page** link at the bottom. Spotted something that's wrong for v0.1.0? A pull request or an issue there is welcome.

## Report a security issue

Please don't report security issues in public issues, discussions or pull requests. Report them privately through [GitHub's private vulnerability reporting](https://github.com/tachyon-cms/tachyoncms/security/advisories/new). If you can't use GitHub, email [security@tachyoncms.com](mailto:security@tachyoncms.com).

It helps to include what an attacker could do and what they'd need first, steps or a request that reproduces it, and the version you tested. [SECURITY.md](https://github.com/tachyon-cms/tachyoncms/blob/main/SECURITY.md) has the full policy, including how quickly to expect a reply.

Until 1.0, security fixes land on `main` and ship in the next 0.x release.

## How decisions are made

While the project is small, James Conway, who started it, makes the final call, in public: in issues, discussions and pull requests. [GOVERNANCE.md](https://github.com/tachyon-cms/tachyoncms/blob/main/GOVERNANCE.md) sets out the commitments that don't change. TachyonCMS stays MIT-licensed, there's never a CLA or copyright assignment, and sponsors get visibility, not control. It also explains how contributors become maintainers.

Everyone taking part agrees to the [Code of Conduct](https://github.com/tachyon-cms/tachyoncms/blob/main/CODE_OF_CONDUCT.md).
