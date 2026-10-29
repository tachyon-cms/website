---
title: "Security you can check for yourself."
summary: "No unsafe Rust, no request values pasted into SQL, rules enforced inside the query, and releases you can verify before you run them."
status: today
sources:
  - Cargo.toml
  - README.md#why-another-cms
  - README.md#access-rules
  - README.md#who-can-do-what
  - crates/tachyon-db/src/query.rs
  - crates/tachyon-db/src/documents.rs
  - crates/tachyon-api/src/auth/password.rs
  - crates/tachyon-api/src/auth/principal.rs
  - .github/workflows/release.yml
  - .github/workflows/scorecard.yml
  - .github/workflows/dco.yml
  - SECURITY.md
  - https://www.bestpractices.dev/projects/16021
---

## In the code

### No `unsafe`

The workspace sets `unsafe_code = "forbid"`, so the compiler refuses any, in every crate.

### No request values pasted into SQL

Fixed queries are checked against the database schema at compile time. Filters and sorts, which change with every request, are built from a validated filter tree, and every value in them travels as a bound parameter.

### Rules compiled to SQL

An access rule becomes part of the query for whoever is asking, so a document they can't see never leaves Postgres. They get a 404, and filtering through a relationship can't be used to probe for it.

### Passwords

Hashed with Argon2id at the OWASP baseline and refused if they appear in a known breach, checked through Have I Been Pwned's range API so only five characters of a hash ever leave the server. Five wrong guesses in 15 minutes lock the account for 15 more.

### Sessions and keys

The server stores hashes, never the tokens themselves. The session cookie is `__Host-` prefixed, and a write signed in by cookie has to come from your own address.

## In every release

### Signed

The checksums file is signed with cosign, keyless, through Sigstore, and so is the Docker image.

### An SBOM per archive

Each binary is built with cargo-auditable, which records the dependency tree inside it, and each archive gets an SPDX SBOM made from that. It lists what was linked, not everything in the lock file.

### Provenance

Every archive and the image carry a build attestation saying which workflow, at which commit, produced them.

## In the open

The project holds the OpenSSF Best Practices [passing badge](https://www.bestpractices.dev/projects/16021), with every answer on the checklist public. OpenSSF Scorecard runs against the repo every week, and you can read its [latest scores](https://scorecard.dev/viewer/?uri=github.com/tachyon-cms/tachyoncms). Every commit is signed off under the Developer Certificate of Origin.

## Found something?

Please don't open a public issue. Report it privately through [GitHub's vulnerability reporting](https://github.com/tachyon-cms/tachyoncms/security/advisories/new), or email [security@tachyoncms.com](mailto:security@tachyoncms.com) if you can't use GitHub.

You'll hear back within 3 working days. Within about 14, we'll confirm whether it's a vulnerability and agree a timeline for the fix with you, and you'll be credited in the advisory unless you'd rather not be. [SECURITY.md](https://github.com/tachyon-cms/tachyoncms/blob/main/SECURITY.md) has the full policy.

## Early days, said plainly

TachyonCMS is pre-alpha. The pieces above are real, but it hasn't had the years of use that find the bugs nobody thought of. Keep it off public networks for now.
