---
title: Content types
description: Create collections and globals over the API, and change them later without losing documents.
---

A content type is a schema: a `slug` and a list of fields. TachyonCMS has two kinds, **collections** with any number of documents, and **globals** with exactly one. From v0.2.0 a schema can also be a [shared block](/blocks#shared-blocks), with `"kind": "block"`: a block type that `blocks` and `richText` fields name, with no documents of its own. Changing content types needs the Admin role, or another role with the `schemas` ability.

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

A slug starts with a lowercase letter and uses only lowercase letters, digits and underscores, up to 64 characters. These slugs are reserved for the server's own routes: `access`, `admin`, `auth`, `blocks`, `globals`, `media`, `search`, `graphql`, `plugins` and `setup`.

From v0.2.0 a collection can also take a `url`, such as `"/blog/{slug}"`, saying where its documents live on your site. Links to them in [rich text](/rich-text#add-a-rich-text-field) point there when read as HTML.

The schema is checked before it's saved. A misspelt option such as `maxLenght` is refused by name rather than ignored, and so is a field called `id`, `createdAt`, `updatedAt` or `status`, which the server adds to every document. In a collection with [drafts](/drafts) on, `publishedAt` is reserved too, since every published copy carries one. Turning drafts on while the schema has a top-level `publishedAt` field is a `422`, ``field name `publishedAt` is reserved``; collections without drafts keep any `publishedAt` field they already have. Drafts are on `main` and arrive in the next release.

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

### Large changes run as a job

On `main`, arriving in the next release. A request gets 30 seconds, and carrying tens of thousands of documents across a change can take longer. So past 2,000 rows (documents, trashed ones too, and their versions) a change or a preview goes to a [job worker](/scheduling#the-workers) instead, and you get `202 Accepted` straight away:

```http
HTTP/1.1 202 Accepted
location: /api/admin/jobs/01a1be49-e220-733a-9878-bb827c8a47e3
```

```json
{
  "job": {
    "attempts": 0,
    "finishedAt": null,
    "id": "01a1be49-e220-733a-9878-bb827c8a47e3",
    "kind": "schema_change",
    "result": null,
    "runAt": "2026-11-09T03:11:15.488599Z",
    "state": "queued"
  }
}
```

Poll the `location`. Once `state` reads `done` or `failed`, `result` holds what the request would have answered: on `done`, the same `collection` and `preview` as the `200`; on `failed`, the `status` and `problem` it would have sent back.

Nothing is taken on trust from when you asked. The job checks everything again, as you, against the data as it is when it runs. A change that loses data without `"confirm": true` fails with the `409` and a fresh `preview`, so you can look before you send it again:

```json
{
  "state": "failed",
  "result": {
    "status": 409,
    "problem": {
      "title": "Confirmation required",
      "status": 409,
      "detail": "This change removes or retypes fields, or leaves documents that won't validate. Send it again with \"confirm\": true to go ahead.",
      "preview": {"documents": 2001, "needsConfirmation": true, "...": "..."}
    }
  }
}
```

One change per schema waits at a time. Send another while one is queued, large or small, and you get a `409` naming the job ahead of it:

```json
{
  "detail": "a change to `posts` is already queued; wait for job 01a1be49-e220-733a-9878-bb827c8a47e3",
  "status": 409,
  "title": "Conflict"
}
```

While a change runs, writes to that collection's documents wait for it to finish. Somebody has to run the job, too: at least one server needs `workers` above 0, or use [`tachyon schema apply`](/cli/tachyon-schema-apply), which has no time limit.

### Changes that are refused

Some changes are refused whatever you confirm, with a `422` that says why. For example, a change that would break another collection's [join or virtual field](/joins-and-virtual-fields), or remove a profile field an [access rule](/access-rules) reads. Collections and globals can't be deleted yet. A [shared block](/blocks#delete-a-shared-block) can be, once no schema names it.

## Keep content types in files

To keep schemas in version control and apply them from a deploy script, use [`tachyon schema`](/schema-files). It runs the same checks and the same rename and confirm steps.
