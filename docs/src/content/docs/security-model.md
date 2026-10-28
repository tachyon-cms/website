---
title: Security model
description: What TachyonCMS v0.1.0 protects, how it does it, and what it leaves to you.
---

This page describes how v0.1.0 handles credentials, access and untrusted input, and what it leaves to the way you deploy it. To report a vulnerability, see [Reporting a security issue](/get-involved#report-a-security-issue).

:::caution[Pre-alpha]
v0.1.0 hasn't had an outside security review. Keep it off public networks for now.
:::

## Passwords

- Hashed with **Argon2id**: 19,456 KiB of memory (the OWASP baseline, [configurable](/configuration#auth)), time cost 2, parallelism 1. Only the hash is stored.
- 12 to 256 characters. The upper limit stops very long passwords being used to burn CPU.
- Checked against known breaches with the Have I Been Pwned range API. Only the first five characters of the password's SHA-1 leave the server, and responses are padded, so their size says nothing either.
- Five wrong passwords in 15 minutes lock the account for 15 minutes.
- Sign-in refusals all look the same and take about the same time, whether the email doesn't exist, the password is wrong or the account is locked. That keeps the API from revealing which emails have accounts.

## Sessions and tokens

- A session token is 32 random bytes. An API key's secret is another 32 random bytes. The database stores only their SHA-256 hashes, so a database leak doesn't hand out working credentials.
- API key secrets are compared in constant time.
- The browser cookie is `__Host-tachyon_session`, with `HttpOnly`, `Secure`, `SameSite=Strict` and `Path=/`.
- Sessions end after 7 days idle and 30 days in all, by default.
- Changing a password ends every other session. Deleting a user ends their sessions and revokes their API keys.
- Credentials that are present but don't work are a `401`, never a quiet fall back to signed out, so a broken client finds out.

## Cross-site requests

A browser attaches cookies to requests that other sites start. So a change signed by the session cookie must carry an `Origin` that matches `public_url` or one of `allowed_origins`, or it's refused. Bearer tokens and API keys aren't sent automatically, so they don't need the check.

Sign-in itself takes JSON. A cross-site form can't send JSON, and a cross-site script can't send it without a CORS preflight, which TachyonCMS never answers. It sends no CORS headers at all.

## API keys

- A key acts as its owner and can never do more than the owner's role and the access rules allow. Its scopes only narrow that.
- Keys are made, rotated and revoked from a signed-in session, never with another key, so a leaked key can't mint more.
- Only an Admin can make a key with the `admin` scope.
- Without an `admin` scope, a key can't see content types, roles, accounts or sessions.

## Access rules

- Read rules become part of the SQL query for each caller, everywhere a document can appear: lists, single reads, references, joins, populated links and virtual fields. A hidden document never leaves the database.
- A document you can't read is a `404`, the same as one that doesn't exist.
- Filters can't probe what you can't see. Hidden documents never match, even through a relationship, and filtering or sorting on a field you can't read is a `403`, whatever else is wrong with the filter.
- Updates and deletes are checked against the stored document inside the same database transaction as the write.
- Admins pass every rule, so a rule can't lock everyone out.

The one known leak is [unique fields](/access-rules#known-limits): a duplicate value is refused even when the document holding it is hidden.

## Queries and input

- Every database query is either checked against the schema at compile time or built from a validated filter tree with bound parameters. User input is never pasted into SQL.
- The Rust code forbids `unsafe` throughout the workspace.
- Request bodies are limited to 10 MB, and requests to 30 seconds.
- Queries are limited too: 100 query parameters, 50 filter conditions, nesting 5 deep, paths through 3 relationships, 100 documents per page and a population depth of 5.
- Schemas reject unknown options, and query strings reject unknown parameters, rather than ignoring them.
- When something fails inside the server, the response is a `500` with a request ID. The cause goes to the log, not to the caller.

## What you're responsible for

- **HTTPS.** TachyonCMS serves plain HTTP. Put a reverse proxy that terminates TLS in front of it, and set `public_url` to the HTTPS address.
- **Where it listens.** It listens on `127.0.0.1` by default, and won't listen anywhere else until `public_url` is set.
- **Rate limiting.** Apart from the password lockout, TachyonCMS doesn't limit request rates. Do that at the proxy.
- **The database.** Postgres holds everything. Protect its credentials, network access and backups.
- **Upgrades.** Security fixes ship in the next 0.x release, and older 0.x releases don't get backports. Run the latest.

## Supply chain

- Release archives carry build provenance and an SPDX SBOM, and every binary records its dependency tree.
- `checksums.txt` is signed with cosign, and so is the container image. [Deploy as a binary](/deploy/binary#download-and-verify) and [Deploy with Docker](/deploy/docker#verify-the-image) show how to check them.
- OpenSSF Scorecard runs on the repository every week, and every commit is signed off under the Developer Certificate of Origin.
