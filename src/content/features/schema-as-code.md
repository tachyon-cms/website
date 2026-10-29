---
title: "Your content model belongs in a pull request."
summary: "Export every content type to one JSON file, compare it with the running server, and apply it. Renames keep their data, and nothing destructive happens without a preview."
status: today
sources:
  - README.md#changing-your-content-types
  - README.md#access-rules
  - crates/tachyon/src/schema_cmd.rs
  - crates/tachyon-core/src/diff.rs
  - crates/tachyon-db/src/schema_change.rs
  - crates/tachyon-api/src/collections.rs
---

## Three commands

```sh
tachyon schema export -o schema.json
tachyon schema diff schema.json
tachyon schema apply schema.json
```

Export writes every content type to one file. Edit it, commit it, and the review happens where the rest of your code gets reviewed. `diff` tells you what applying it would do to the server in front of you, and `apply` does it. Collections the file doesn't mention are left exactly as they are.

## A rename isn't a delete and an add

Rename `title` to `headline` and a naive tool sees one field leave and another arrive, and your titles leave with the old one. Here, `diff` tells you plainly that it would delete data. Add `--rename posts:title=headline` and every document keeps its title under the new name. Nested fields work the same way: `posts:seo.title=headline`.

## Destructive changes ask first

The same safety holds over the API. Send a changed schema to `PUT /api/admin/collections/posts`, with any renames beside it, and anything that would delete or retype data comes back first as a preview: what changes, how many documents it touches and which ones won't validate. It only goes through when you send it again with `"confirm": true`. `POST /api/admin/collections/posts/preview` shows the same report and changes nothing.

## Rules travel with it

Access rules are part of the schema, so they export, diff and apply with everything else. A file that would break a rule somewhere else, say by removing a profile field that another collection's rule reads as `$user.team`, is refused before anything changes.
