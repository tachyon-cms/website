---
title: Content types
description: Create collections and globals over the API, and change them later without losing documents.
---

A content type is a schema: a `slug` and a list of fields. TachyonCMS has two kinds, **collections** with any number of documents, and **globals** with exactly one. Changing content types needs the Admin role, or another role with the `schemas` ability.

The examples send `$TOKEN`, an Admin's bearer token from [Install](/install#sign-in-and-keep-a-token).

## Create a collection

`POST /api/admin/collections` with the schema as the body:

```sh
curl -X POST localhost:3000/api/admin/collections \
  -H "authorization: Bearer $TOKEN" \
  -H 'content-type: application/json' \
  -d '{"slug": "posts", "fields": [
        {"name": "title", "type": "text", "required": true, "maxLength": 120},
        {"name": "publishedOn", "type": "date", "dateOnly": true}
      ]}'
```

```json
{
  "id": "01a1845f-6032-7525-9bef-be47fba72555",
  "schema": {
    "fields": [
      {
        "maxLength": 120,
        "name": "title",
        "required": true,
        "type": "text"
      },
      {
        "dateOnly": true,
        "name": "publishedOn",
        "type": "date"
      }
    ],
    "kind": "collection",
    "slug": "posts"
  },
  "schemaVersion": 1
}
```

The collection's routes exist straight away: `/api/posts` and `/api/posts/{id}`.

A slug starts with a lowercase letter and uses only lowercase letters, digits and underscores, up to 64 characters. These slugs are reserved for the server's own routes: `access`, `admin`, `auth`, `globals`, `media`, `search`, `graphql`, `plugins` and `setup`.

The schema is checked before it's saved. A misspelt option such as `maxLenght` is refused by name rather than ignored, and so is a field called `id`, `createdAt`, `updatedAt` or `status`, which the server adds to every document.

## List and read content types

`GET /api/admin/collections` lists every collection and global with its schema, and `GET /api/admin/collections/{slug}` returns one. Any signed-in user can read them. Trimmed to the first two:

```sh
curl localhost:3000/api/admin/collections -H "authorization: Bearer $TOKEN"
```

```json
{
  "docs": [
    {
      "id": "01a1845f-6032-7525-9bef-be47fba72555",
      "schema": {
        "fields": [
          {
            "maxLength": 120,
            "name": "title",
            "required": true,
            "type": "text"
          },
          {
            "dateOnly": true,
            "name": "publishedOn",
            "type": "date"
          }
        ],
        "kind": "collection",
        "slug": "posts"
      },
      "schemaVersion": 1
    },
    {
      "id": "01a1845e-ede4-70db-9c0d-190e756dc5f8",
      "schema": {
        "fields": [
          {
            "name": "name",
            "required": true,
            "type": "text"
          }
        ],
        "kind": "collection",
        "slug": "users"
      },
      "schemaVersion": 1
    }
  ]
}
```

### The users collection

`users` is built in. It holds each person's profile, starting with a required `name`. You can add profile fields to it with `PUT /api/admin/collections/users`, but you can't create or remove it. Email, role and password aren't profile fields: they live in the account and change through [`/api/users`](/roles#manage-users).

## Globals

A global is a schema with `"kind": "global"`. Use one for things there's only one of, such as site settings:

```sh
curl -X POST localhost:3000/api/admin/collections \
  -H "authorization: Bearer $TOKEN" \
  -H 'content-type: application/json' \
  -d '{"slug": "site", "kind": "global", "fields": [
        {"name": "tagline", "type": "text"},
        {"name": "footer", "type": "textarea"}
      ]}'
```

Read it at `/api/globals/site`. Until someone saves it, it's empty:

```sh
curl localhost:3000/api/globals/site
```

```json
{}
```

Change it with `PATCH`. Like documents, only the fields you send change:

```sh
curl -X PATCH localhost:3000/api/globals/site \
  -H "authorization: Bearer $TOKEN" \
  -H 'content-type: application/json' \
  -d '{"tagline": "Notes from the build"}'
```

```json
{
  "createdAt": "2026-10-28T21:17:29.248235Z",
  "id": "01a18460-0b03-764c-8145-31a0291ad0ec",
  "status": "published",
  "tagline": "Notes from the build",
  "updatedAt": "2026-10-28T21:17:29.248235Z"
}
```

Anyone can read a global unless an access rule says otherwise. Changing one needs a role whose `content` ability is `all` (Editor and Admin by default). Globals can't have join fields or a `defaultPopulate`, since nothing links to a global.

## Change a content type

Send the whole new schema to `PUT /api/admin/collections/{slug}`. Changes that keep every value, such as adding fields, go straight through. The response has the saved collection and a `preview` of what changed.

Changes that would lose or retype data come back first as a `409` with the same preview, and only go through when you send them again with `"confirm": true`. That covers removing a field, changing its type, and anything that leaves documents that won't validate.

### Rename a field

Renaming a field without saying so looks like removing one field and adding another, and the old values would be lost. List the rename in `renames`, as `{"old": "new"}`, and the values move across.

Here `posts` has the fields from the [Fields](/fields) page. The change renames `title` to `headline` and removes `summary`. Save it as `change.json`:

```json
{
  "schema": {
    "slug": "posts",
    "fields": [
      {"name": "headline", "type": "text", "required": true, "maxLength": 120},
      {"name": "publishedOn", "type": "date", "dateOnly": true},
      {"name": "kind", "type": "select", "default": "article",
       "options": [{"label": "Article", "value": "article"}, {"label": "Note", "value": "note"}]},
      {"name": "tags", "type": "text", "hasMany": true, "maxRows": 5},
      {"name": "seo", "type": "group", "fields": [
        {"name": "title", "type": "text", "maxLength": 60},
        {"name": "description", "type": "textarea"}
      ]},
      {"name": "links", "type": "array", "fields": [
        {"name": "label", "type": "text", "required": true},
        {"name": "url", "type": "url", "required": true}
      ]}
    ]
  },
  "renames": {"title": "headline"}
}
```

```sh
curl -X PUT localhost:3000/api/admin/collections/posts \
  -H "authorization: Bearer $TOKEN" \
  -H 'content-type: application/json' \
  -d @change.json
```

Removing `summary` deletes data, so TachyonCMS asks first:

```json
{
  "detail": "This change removes or retypes fields, or leaves documents that won't validate. Send it again with \"confirm\": true to go ahead.",
  "preview": {
    "cleared": 0,
    "diff": {
      "changes": [
        {
          "from": "title",
          "to": "headline",
          "type": "renamed"
        },
        {
          "kind": "textarea",
          "path": "summary",
          "type": "removed"
        }
      ]
    },
    "documents": 2,
    "duplicates": [],
    "examples": [],
    "indexes": {
      "create": [],
      "drop": []
    },
    "invalid": 0,
    "needsConfirmation": true
  },
  "requestId": "01a1845f-f1bd-7502-af9e-ab7ba7548e9c",
  "status": 409,
  "title": "Confirmation required",
  "type": "about:blank"
}
```

The preview tells you what you're agreeing to:

| Key | Means |
|---|---|
| `diff.changes` | Each field added, removed, renamed or changed. |
| `documents` | How many documents the collection holds. |
| `invalid`, `examples` | How many documents won't validate against the new fields, with up to five examples. |
| `duplicates` | `unique` fields whose values aren't unique across the documents. |
| `cleared` | Documents that lose a link because the relationship no longer allows its collection. |
| `indexes` | Indexes the change creates and drops. |
| `needsConfirmation` | Whether the change needs `"confirm": true`. |

Add `"confirm": true` to `change.json` and send it again. The documents keep their values under the new name:

```sh
curl -g 'localhost:3000/api/posts?select[headline]=true'
```

```json
{
  "docs": [
    {
      "headline": "Shipping v0.1.0",
      "id": "01a1845f-afdb-75d9-af23-79cecf8ebabc"
    },
    {
      "headline": "Hello, world",
      "id": "01a1845f-604d-76c4-952d-ed9cb379a8f6"
    }
  ],
  "hasNextPage": false,
  "limit": 10,
  "page": 1
}
```

### Preview without changing anything

`POST /api/admin/collections/{slug}/preview` takes the same body as `PUT` and returns only the preview. Nothing is saved.

### Changes that are refused

Some changes are refused whatever you confirm, with a `422` that says why. For example, a change that would break another collection's [join or virtual field](/joins-and-virtual-fields), or remove a profile field an [access rule](/access-rules) reads. Collections can't be deleted in v0.1.0.

## Keep content types in files

To keep schemas in version control and apply them from a deploy script, use [`tachyon schema`](/schema-files). It runs the same checks and the same rename and confirm steps.
