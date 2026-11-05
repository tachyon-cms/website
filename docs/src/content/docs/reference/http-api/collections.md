---
title: Content types API
description: The endpoints that list, create, change, preview and delete content types in TachyonCMS.
sidebar:
  label: Content types
---

Part of the [HTTP API](/reference/http-api) reference. [Requests and responses](/reference/http-api#requests-and-responses) covers what every endpoint shares, and [Who can call what](/reference/http-api#who-can-call-what) explains the **Who** rows.

## Content types

Collections, globals and shared blocks share these routes. A schema is a JSON object:

| Field | Type | Default | Description |
|---|---|---|---|
| `slug` | string | none | Required. Lowercase letters, digits and underscores, starting with a letter, up to 64 characters. Not `access`, `admin`, `auth`, `blocks`, `globals`, `media`, `search`, `graphql`, `plugins` or `setup`. |
| `kind` | string | `collection` | `collection`, `global`, or `block` for a [shared block](/blocks#shared-blocks) (new in v0.2.0). A shared block has no documents or routes of its own, and takes no `access`, `defaultPopulate` or `url`. |
| `fields` | array | none | Required. See [Field types](/reference/field-types). |
| `access` | object | none | Collection rules: `read`, `create`, `update`, `delete`. See [Access rules](/access-rules). |
| `defaultPopulate` | object | none | A `select` for documents that populate a link to this collection. Not on globals. See [Relationships](/relationships#trim-populated-documents). |
| `url` | string | none | Collections only, new in v0.2.0. Where a document lives on your site, such as `/blog/{slug}`, with `{field}` naming a stored top-level `text` or `slug` field. Starts with `http://`, `https://`, `/` or `#`. Rich text links to these documents point here in [HTML output](/rich-text#html). |
| `labels` | object | none | Shared blocks only, new in v0.2.0. `{"singular": "…", "plural": "…"}`. |

Every response wraps a schema as `{"id", "schemaVersion", "schema"}`. `schemaVersion` goes up by one with each saved change.

### `GET /api/admin/collections`

Lists every collection and global, including `users`.

| | |
|---|---|
| Who | Signed in |
| Returns | `200` and `{"docs": [...]}` |
| Errors | `401`; `403` a key without the `admin` scope |

```sh
curl localhost:3000/api/admin/collections -H "authorization: Bearer $TOKEN"
```

Trimmed to one of four:

```json
{
  "docs": [
    {
      "id": "01a18491-0157-76da-8f9a-ddbf1b56668a",
      "schema": {
        "fields": [
          {
            "default": "My site",
            "name": "title",
            "type": "text"
          },
          {
            "name": "tagline",
            "type": "text"
          }
        ],
        "kind": "global",
        "slug": "site"
      },
      "schemaVersion": 1
    }
  ]
}
```

### `POST /api/admin/collections`

Creates a collection or global. Its routes work straight away.

| | |
|---|---|
| Who | `schemas` ability |
| Body | A schema |
| Returns | `201`, `{"id", "schemaVersion": 1, "schema"}` |
| Errors | `400` a schema that can't be read, such as an unknown field type; `401`; `403`; `409` the slug exists, or is `users`; `422` a schema that breaks a rule, such as an unknown option, a `relationTo` that doesn't exist or a `blockRef` that doesn't match a shared block |

```sh
curl -X POST localhost:3000/api/admin/collections \
  -H "authorization: Bearer $TOKEN" \
  -H 'content-type: application/json' \
  -d '{"slug": "categories", "fields": [{"name": "name", "type": "text", "required": true, "unique": true}]}'
```

```json
{
  "id": "01a18491-0144-716e-a613-dc3d992652d8",
  "schema": {
    "fields": [
      {
        "name": "name",
        "required": true,
        "type": "text",
        "unique": true
      }
    ],
    "kind": "collection",
    "slug": "categories"
  },
  "schemaVersion": 1
}
```

A schema that breaks a rule names the field:

```json
{
  "errors": [
    {
      "message": "field `title`: unknown option `maxLenght`",
      "path": ""
    }
  ],
  "requestId": "01a18491-014f-7193-a29c-2b1979a58087",
  "status": 422,
  "title": "Validation failed",
  "type": "about:blank"
}
```

### `GET /api/admin/collections/{slug}`

Reads one collection or global.

| | |
|---|---|
| Who | Signed in |
| Returns | `200`, `{"id", "schemaVersion", "schema"}` |
| Errors | `401`; `403` a key without the `admin` scope; `404` |

```sh
curl localhost:3000/api/admin/collections/categories -H "authorization: Bearer $TOKEN"
```

The response has the same shape as [`POST /api/admin/collections`](#post-apiadmincollections).

### `PUT /api/admin/collections/{slug}`

Replaces a content type's schema. A change that keeps every value is saved at once. One that removes or retypes fields, or leaves documents that won't validate, is refused with `409 Confirmation required` until you send it again with `"confirm": true`. See [Change a content type](/content-types#change-a-content-type).

| | |
|---|---|
| Who | `schemas` ability |
| Returns | `200`, `{"collection": {"id", "schemaVersion", "schema"}, "preview": {...}}` |
| Errors | `400`; `401`; `403`; `404`; `409 Confirmation required`, with `preview`; `422` an invalid schema, values that aren't unique for a new `unique`, or a change that would break another collection's join, virtual field or access rule |

| Field | Type | Default | Description |
|---|---|---|---|
| `schema` | object | none | Required. The whole new schema. |
| `renames` | object | `{}` | Fields to rename rather than remove and add, as `{"old": "new"}`. A field inside a block type names the type: `{"layout.hero.heading": "title"}`. For a shared block, name the field within the block: `{"note": "remark"}`. |
| `confirm` | boolean | `false` | Go ahead with a change that loses or retypes data. |

The `preview` object:

| Key | Type | Description |
|---|---|---|
| `diff.changes` | array | Each field added, removed, renamed or changed. |
| `documents` | number | Documents in the collection. |
| `invalid` | number | Documents that won't validate against the new fields. |
| `examples` | array | Up to five of them. |
| `duplicates` | array | `unique` fields whose stored values repeat. |
| `cleared` | number | Documents that lose a link their relationship no longer allows. |
| `indexes` | object | `create` and `drop`: indexes the change builds and removes. |
| `needsConfirmation` | boolean | Whether the change needs `"confirm": true`. |

```sh
curl -X PUT localhost:3000/api/admin/collections/categories \
  -H "authorization: Bearer $TOKEN" \
  -H 'content-type: application/json' \
  -d '{"schema": {"slug": "categories", "fields": [
        {"name": "name", "type": "text", "required": true, "unique": true},
        {"name": "posts", "type": "join", "collection": "posts", "on": "category"}]}}'
```

```json
{
  "collection": {
    "id": "01a18491-0144-716e-a613-dc3d992652d8",
    "schema": {
      "fields": [
        {
          "name": "name",
          "required": true,
          "type": "text",
          "unique": true
        },
        {
          "collection": "posts",
          "name": "posts",
          "on": "category",
          "type": "join"
        }
      ],
      "kind": "collection",
      "slug": "categories"
    },
    "schemaVersion": 2
  },
  "preview": {
    "cleared": 0,
    "diff": {
      "changes": [
        {
          "kind": "join",
          "path": "posts",
          "type": "added"
        }
      ]
    },
    "documents": 0,
    "duplicates": [],
    "examples": [],
    "indexes": {
      "create": [],
      "drop": []
    },
    "invalid": 0,
    "needsConfirmation": false
  }
}
```

### `POST /api/admin/collections/{slug}/preview`

Works out what a `PUT` with the same body would do, and saves nothing.

| | |
|---|---|
| Who | `schemas` ability |
| Body | As for [`PUT`](#put-apiadmincollectionsslug); `confirm` is ignored |
| Returns | `200` and the preview object |
| Errors | As for `PUT`, without the `409 Confirmation required` |

Here `posts` would lose its `tags` field, so the change needs confirming:

```sh
curl -X POST localhost:3000/api/admin/collections/posts/preview \
  -H "authorization: Bearer $TOKEN" \
  -H 'content-type: application/json' \
  -d '{"schema": {"slug": "posts", "fields": [
        {"name": "title", "type": "text", "required": true, "maxLength": 120},
        {"name": "slug", "type": "slug", "from": "title"},
        {"name": "category", "type": "relationship", "relationTo": "categories"}]}}'
```

```json
{
  "cleared": 0,
  "diff": {
    "changes": [
      {
        "kind": "text",
        "path": "tags",
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
}
```

For a [shared block](/blocks#shared-blocks), the preview adds `collections`: the same report for each schema that names the block, directly or through another shared block, with paths as that schema sees them. `documents` and `invalid` at the top add theirs up, and if any of them needs confirming, so does the change. Here `cta`'s `label` is renamed to `text`, and `pages` uses `cta`:

```sh
curl -X POST localhost:3000/api/admin/collections/cta/preview \
  -H "authorization: Bearer $TOKEN" \
  -H 'content-type: application/json' \
  -d '{"schema": {"slug": "cta", "kind": "block", "fields": [
        {"name": "text", "type": "text", "required": true},
        {"name": "href", "type": "text"}]},
       "renames": {"label": "text"}}'
```

```json
{
  "cleared": 0,
  "collections": {
    "pages": {
      "cleared": 0,
      "diff": {
        "changes": [
          {
            "from": "layout.cta.label",
            "to": "layout.cta.text",
            "type": "renamed"
          }
        ]
      },
      "documents": 1,
      "duplicates": [],
      "examples": [],
      "indexes": {
        "create": [],
        "drop": []
      },
      "invalid": 0,
      "needsConfirmation": false
    }
  },
  "diff": {
    "changes": [
      {
        "from": "label",
        "to": "text",
        "type": "renamed"
      }
    ]
  },
  "documents": 1,
  "duplicates": [],
  "examples": [],
  "indexes": {
    "create": [],
    "drop": []
  },
  "invalid": 0,
  "needsConfirmation": false
}
```

### `DELETE /api/admin/collections/{slug}`

New in v0.2.0. Deletes a shared block that no schema names. Collections and globals can't be deleted yet.

| | |
|---|---|
| Who | `schemas` ability |
| Returns | `204` |
| Errors | `401`; `403`; `404` no such content type; `409` a schema still names the block, or the slug is a collection or global |

```sh
curl -X DELETE localhost:3000/api/admin/collections/cta -H "authorization: Bearer $TOKEN"
```

While `pages` still names `cta`:

```json
{
  "detail": "pages uses the shared block `cta`; remove it there first",
  "requestId": "01a1aaac-2e05-7207-a2e8-a6a02ee44b43",
  "status": 409,
  "title": "Conflict",
  "type": "about:blank"
}
```

If several schemas name it, the detail names the first in slug order that names it directly, whether a collection, a global or another shared block. For a collection or global, the detail is `` `pages` isn't a shared block; collections and globals can't be deleted yet ``.
