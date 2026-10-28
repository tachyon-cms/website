---
title: Schema files
description: Keep content types in a JSON file under version control, and compare and apply it with tachyon schema.
---

`tachyon schema` keeps every collection and global in one JSON file. Export it, commit it, change it in a pull request, and apply it from your deploy, the same way you handle database migrations.

The commands connect to the database directly, using the same [configuration](/configuration) as `tachyon serve`. They don't need the server running or an API token. A server that is running picks the changes up straight away.

## Export

```sh
tachyon schema export -o schema.json
```

Without `-o` it prints to stdout. The file holds every content type, `users` included, with options left at their defaults omitted. It starts like this:

```json
{
  "collections": [
    {
      "defaultPopulate": {
        "name": true
      },
      "fields": [
        {
          "name": "name",
          "required": true,
          "type": "text"
        },
```

### With Docker

The release image has no shell, so run each command as its own container on the database's network, with a folder mounted for the file:

```sh
docker run --rm --network tachyon -v "$PWD:/work" -w /work \
  -e TACHYON_DATABASE_URL=postgres://tachyon:tachyon@tachyon-db:5432/tachyon \
  ghcr.io/tachyon-cms/tachyoncms:v0.1.0 schema export -o schema.json
```

The container runs as user 65532, not root. On Linux, make sure that user can write to the mounted folder, or `export -o` fails.

## Compare with `diff`

Edit the file, then see what applying it would change. Nothing is written. In this edit, `places` has its `name` field renamed to `title` (with its `slug` now made from `title`), and `site` gains a `contactEmail` field:

```sh
tachyon schema diff schema.json
```

```text
= categories unchanged
~ change places: remove name, deleting its data; update options on slug; add title (text)
  3 of 3 documents won't validate against the new fields
= posts unchanged
~ change site: add contactEmail (email)
= users unchanged
```

Without being told, a rename looks like removing one field and adding another. Say what's a rename with `--rename collection:field=new_name`, as many times as you need:

```sh
tachyon schema diff schema.json --rename places:name=title
```

```text
= categories unchanged
~ change places: rename name to title; update options on slug
= posts unchanged
~ change site: add contactEmail (email)
= users unchanged
```

## Apply

`apply` takes the same file and renames, prints the same report, and makes the changes:

```sh
tachyon schema apply schema.json --rename places:name=title
```

```text
= categories unchanged
~ change places: rename name to title; update options on slug
= posts unchanged
~ change site: add contactEmail (email)
= users unchanged

Applied.
```

Changes that delete or retype data, or leave documents that won't validate, need `--yes`. Without it, `apply` changes nothing and exits with status 1. Here the file drops `footer` from `site`:

```sh
tachyon schema apply schema.json
```

```text
Error: = categories unchanged
= places unchanged
= posts unchanged
~ change site: remove footer, deleting its data
= users unchanged

These changes remove or retype fields, or leave documents that won't validate. Re-run with --yes to apply them.
```

```sh
tachyon schema apply schema.json --yes
```

```text
= categories unchanged
= places unchanged
= posts unchanged
~ change site: remove footer, deleting its data
= users unchanged

Applied.
```

`apply` runs the same checks as the API, [access rules](/access-rules#rules-are-checked-when-you-save) included, so a file that the API would refuse is refused here too.

## In a deploy

A typical sequence, run once per release:

```sh
tachyon migrate
tachyon schema diff schema.json
tachyon schema apply schema.json
```

`migrate` runs pending database migrations and exits; every command also runs them first. Keep `--yes` out of automated deploys, so a change that deletes data stops and waits for a person.
