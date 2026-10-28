---
title: Deploy as a binary
description: Download a TachyonCMS v0.1.0 release archive, verify it, and run it against your own Postgres.
---

Each release attaches a `tachyon` binary for four platforms. It's a single file with no runtime dependencies beyond a Postgres database to talk to.

| Archive | For |
|---|---|
| `tachyon_0.1.0_x86_64-unknown-linux-musl.tar.gz` | Linux on x86_64, statically linked |
| `tachyon_0.1.0_aarch64-unknown-linux-musl.tar.gz` | Linux on arm64, statically linked |
| `tachyon_0.1.0_x86_64-apple-darwin.tar.gz` | macOS on Intel |
| `tachyon_0.1.0_aarch64-apple-darwin.tar.gz` | macOS on Apple silicon |

Each archive has an SPDX SBOM next to it (`.sbom.json`), and `checksums.txt` lists the SHA-256 of every file.

## Download and verify

Download your archive with `checksums.txt` and its signature bundle from the [v0.1.0 release](https://github.com/tachyon-cms/tachyoncms/releases/tag/v0.1.0). With the GitHub CLI:

```sh
gh release download v0.1.0 -R tachyon-cms/tachyoncms \
  -p 'tachyon_0.1.0_aarch64-apple-darwin.tar.gz' \
  -p 'checksums.txt' -p 'checksums.txt.sigstore.json'
```

Check that the release workflow signed the checksums, using [cosign](https://docs.sigstore.dev/cosign/):

```sh
cosign verify-blob \
  --certificate-identity 'https://github.com/tachyon-cms/tachyoncms/.github/workflows/release.yml@refs/heads/main' \
  --certificate-oidc-issuer https://token.actions.githubusercontent.com \
  --bundle checksums.txt.sigstore.json checksums.txt
```

```text
Verified OK
```

Then check the archive against them. On Linux use `sha256sum`; on macOS, `shasum -a 256`:

```sh
shasum -a 256 --check --ignore-missing checksums.txt
```

```text
tachyon_0.1.0_aarch64-apple-darwin.tar.gz: OK
```

## Unpack and run

The archive holds a folder with `tachyon`, `README.md` and `LICENSE`:

```sh
tar xzf tachyon_0.1.0_aarch64-apple-darwin.tar.gz
./tachyon_0.1.0_aarch64-apple-darwin/tachyon --version
```

```text
tachyon 0.1.0
```

Point it at a Postgres database and start it:

```sh
TACHYON_DATABASE_URL=postgres://tachyon:tachyon@127.0.0.1:5432/tachyon \
  ./tachyon_0.1.0_aarch64-apple-darwin/tachyon serve
```

```json
{"timestamp":"2026-10-28T21:30:56.119497Z","level":"INFO","fields":{"message":"listening","addr":"127.0.0.1:3000"},"target":"tachyon"}
```

This database already had an Admin. On first start against an empty one it also logs `setup needed`; create the first Admin as in [Install](/install#create-the-first-admin). Without other settings it listens on `127.0.0.1:3000`. To listen beyond this machine, set `public_url` too. See [Configuration](/configuration).

## Run it as a service

For a long-running server, put the settings in a `tachyon.toml` (or the environment) and run `tachyon serve` under your service manager, such as a systemd unit. The server stops cleanly on `SIGTERM` or Ctrl+C, finishing the requests in flight.

Put a reverse proxy that terminates HTTPS in front of it, and set `public_url` to the HTTPS address. Browsers only send the session cookie over HTTPS, `localhost` aside.

## Upgrade

Stop the server, replace the binary, and start it again. Pending database migrations run on start. To run them on their own first, use `tachyon migrate`.
