---
title: Reference
description: Every endpoint, field type, filter operator, setting and error in TachyonCMS v0.2.0, plus the drafts and history work on main.
---

The reference lists everything TachyonCMS v0.2.0 offers, one subject per page, in tables you can scan. What v0.2.0 added, blocks and rich text, is marked as new. Drafts, versions, scheduling and the trash are on `main` and arrive in the next release; they're marked "on `main`", and none of it is in v0.2.0. It describes; the [Docs](/) topic explains, and the [Tutorials](/tutorials) build something.

| Page | Covers |
|---|---|
| [HTTP API](/reference/http-api) | Every endpoint: who can call it, its parameters, body, response and errors, with a real example. [Drafts and history](/reference/http-api/drafts-and-history) holds the ones on `main`. |
| [Field types](/reference/field-types) | Every field type and option, the values each accepts, and the validation messages. |
| [Filters and sorting](/reference/filters) | Every `where` operator, which fields it works on, paths, sorting and limits. |
| [Configuration keys](/reference/config) | Every setting and `TACHYON_` environment variable, with types and defaults. |
| [Errors](/reference/errors) | The problem+json format, every status, and the common messages. |

Every example response on these pages came from a real TachyonCMS server: v0.1.0, or for what v0.2.0 added, the v0.2.0 code, or for what's on `main`, a build of `main`. IDs and timestamps differ on yours, tokens are shortened to `tcs_…` and `tcy_…`, and trimmed responses say so.

The commands of the `tachyon` binary are in the [CLI reference](/cli).
