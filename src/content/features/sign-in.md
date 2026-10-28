---
title: "Sign-in built for the day someone tries."
summary: "Sessions for people, scoped API keys for servers, and passwords hashed with Argon2id and checked against known breaches. It's all in the binary."
status: today
sources:
  - README.md#first-run
  - README.md#who-can-do-what
  - README.md#putting-it-online
  - crates/tachyon-api/src/auth/password.rs
  - crates/tachyon-api/src/auth/keys.rs
  - crates/tachyon-api/src/auth/principal.rs
  - crates/tachyon-api/src/auth/routes.rs
  - crates/tachyon-api/src/auth/mod.rs
  - crates/tachyon-core/src/auth.rs
  - crates/tachyon/src/config.rs
---

## People get sessions, servers get keys

Sign in from a browser and you get a session cookie. Its name starts `__Host-`, which makes the browser insist on HTTPS, the whole site as its path and no other domain. From a script, ask for a bearer token instead. Either way the server keeps only a hash of it.

A browser sends cookies with requests that other sites start, so a write signed in by cookie also has to come from your own address. Tokens and keys aren't sent automatically, so they don't need that check. Sessions end after 7 days unused or 30 days at most, and you can list yours and end any of them.

## Keys with the least they need

A key carries scopes: `posts:read`, `posts:write`, `*:read`, `*:write`, or `admin`. It acts as the person who made it, narrowed by those scopes and by every [access rule](/product/access-control).

You see the secret once, when it's made; the server stores a hash. Give a key an expiry date if you like. Rotate it and the old secret stops working at that moment. And keys are only made from a signed-in session, never with another key, so a leaked key can't mint more.

## Passwords

Twelve characters at the least. Each is hashed with Argon2id at the OWASP baseline: 19 MiB of memory, two passes, one lane.

Before a new password is accepted, the server asks Have I Been Pwned whether it's turned up in a breach. Only the first five characters of its SHA-1 hash leave the server, and the answer is padded so its size gives nothing away. A known password is refused. If the service can't be reached, the password goes through and a warning goes in the log, so a network hiccup never blocks a password change.

Five wrong passwords in 15 minutes lock the account for 15 more.

## The settings, and the one you can't skip

The lockout, session lengths, Argon2 memory and the breach check all live under `[auth]` in `tachyon.toml`, or in the environment as `TACHYON_AUTH__SETTING`. The one you can't leave out is `public_url`. The server won't start on a public address without it, because browser sign-ins only accept changes from that address.
