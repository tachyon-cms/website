---
title: Documents API
description: The access, global and document endpoints in TachyonCMS v0.1.0.
sidebar:
  label: Documents
---

Part of the [HTTP API](/reference/http-api) reference. [Requests and responses](/reference/http-api#requests-and-responses) covers what every endpoint shares, and [Who can call what](/reference/http-api#who-can-call-what) explains the **Who** rows.

## Access

### `GET /api/access`

Says what the caller may do with each collection, global and field, and whether they may change schemas and manage users. Use it to decide what a front end shows.

| | |
|---|---|
| Who | Anyone. Signed out is an answer too. |
| Returns | `200` and `{"collections", "globals", "schemas", "users"}` |

Each answer is `true`, `false` or `"conditional"`: allowed for some documents and not others, depending on a rule or on who created them. A collection, global or field with nothing allowed is left out. For `users`, `read` is about profiles where documents link to them, and `create`, `update` and `delete` are about the [`/api/users`](/reference/http-api/users-and-roles#get-apiusers) routes. See [What am I allowed to do?](/access-rules#what-am-i-allowed-to-do).

As an Author, with the Author's token in `$AUTHOR_TOKEN`, trimmed to `posts` and the global:

```sh
curl localhost:3000/api/access -H "authorization: Bearer $AUTHOR_TOKEN"
```

```json
{
  "collections": {
    "posts": {
      "create": true,
      "delete": "conditional",
      "fields": {
        "title": {
          "create": true,
          "read": true,
          "update": true
        }
      },
      "read": true,
      "update": "conditional"
    }
  },
  "globals": {
    "site": {
      "fields": {
        "tagline": {
          "read": true,
          "update": false
        }
      },
      "read": true,
      "update": false
    }
  },
  "schemas": false,
  "users": false
}
```

The `fields` objects are trimmed to one field each.

## Globals

### `GET /api/globals/{slug}`

Reads a global. Until it's first saved, it shows only its fields' defaults, with no `id` or timestamps.

| | |
|---|---|
| Who | Content: anyone, unless a read rule says otherwise. A key needs `slug:read`, `slug:write`, `*:read`, `*:write` or `admin`. |
| Query | `depth`, `select`, `populate`, as for [`GET /api/{collection}/{id}`](#get-apicollectionid) |
| Returns | `200` and the global |
| Errors | `400`; `401`, `403` a read rule or key scope refuses; `404` no such global |

```sh
curl localhost:3000/api/globals/site
```

```json
{
  "createdAt": "2026-10-28T22:10:58.016665Z",
  "id": "01a18491-0157-76da-8f9a-ddbf1b56668a",
  "status": "published",
  "tagline": "Notes from the build",
  "title": "My site",
  "updatedAt": "2026-10-28T22:10:58.016665Z"
}
```

### `PATCH /api/globals/{slug}`

Changes a global, saving it the first time. Fields merge as for a [document `PATCH`](#patch-apicollectionid). If the global's read or update rule is a filter, a global that has never been saved can't be saved this way, since there's no document for the rule to match.

| | |
|---|---|
| Who | Content: a role whose `content` is `all` (Editor and Admin), or the global's update rule. A key needs `slug:write`, `*:write` or `admin`. |
| Body | The fields to change |
| Returns | `200` and the global |
| Errors | `401`; `403` the role, a rule, a field rule or a key scope refuses; `404`; `422` |

```sh
curl -X PATCH localhost:3000/api/globals/site \
  -H "authorization: Bearer $TOKEN" \
  -H 'content-type: application/json' \
  -d '{"tagline": "Notes from the build"}'
```

The response is the global, as for `GET`.

## Documents

`{collection}` is a collection's slug. `users` isn't served here: use [`/api/users`](/reference/http-api/users-and-roles#get-apiusers). A `{id}` that isn't a document ID is a `404`.

### `GET /api/{collection}`

Lists the documents you may read, a page at a time.

| | |
|---|---|
| Who | Content: anyone, unless a read rule says otherwise. A key needs `collection:read`, `collection:write`, `*:read`, `*:write` or `admin`. |
| Returns | `200` and a page |
| Errors | `400` a bad parameter; `401`, `403` a read rule or key scope refuses, or a filter or sort on a field you can't read; `404` no such collection |

| Parameter | Type | Default | Description |
|---|---|---|---|
| `where` | filter | none | Conditions to match. See [Filters and sorting](/reference/filters). |
| `sort` | string | newest first | One field; `-` in front for descending. |
| `limit` | integer | `10` | Documents per page, at least 1. Above 100 counts as 100. |
| `page` | integer | `1` | The page, from 1. Not with `after`. |
| `after` | cursor | none | A `nextCursor` from the previous page, with the same `sort`. |
| `count` | `true` or `false` | `false` | Add `totalDocs`. |
| `select` | object | every field | `select[field]=true` for each field to return. `id` always comes back. |
| `depth` | integer, 0 to 5 | `1` | How many levels of links to fill in. See [Relationships](/relationships#populate-with-depth). |
| `populate` | object | none | `populate[collection][field]=true`: the fields of populated documents from that collection. |
| `joins` | `false` or object | on | `joins=false`, or `joins[field][option]=value` with `limit`, `page`, `sort`, `where` or `count`. See [Join options per request](/joins-and-virtual-fields#join-options-per-request). |

Any other parameter is a `400`.

| Response key | Type | Present | Description |
|---|---|---|---|
| `docs` | array | always | The documents. |
| `limit` | number | always | The page size used. |
| `page` | number | without `after` | The page number. |
| `hasNextPage` | boolean | always | Whether more documents follow. |
| `nextCursor` | string | when more follow | Pass it as `after` for the next page. |
| `totalDocs` | number | with `count=true` | How many documents match. |

```sh
curl -g 'localhost:3000/api/posts?select[title]=true&select[slug]=true&limit=1&count=true'
```

```json
{
  "docs": [
    {
      "id": "01a18491-016f-726b-a131-7ffee91892c7",
      "slug": "why-postgres",
      "title": "Why Postgres"
    }
  ],
  "hasNextPage": true,
  "limit": 1,
  "nextCursor": "5b6e756c6c2c2230316131383439312d303136662d373236622d613133312d376666656539313839326337225d",
  "page": 1,
  "totalDocs": 2
}
```

### `POST /api/{collection}`

Creates a document.

| | |
|---|---|
| Who | Content: a signed-in role whose `content` is `all` or `own`, subject to the create rule. A key needs `collection:write`, `*:write` or `admin`. |
| Body | The document's fields. Fields left out take their `default`. |
| Returns | `201` and the document, with links filled in to depth 1. If a read rule hides it from you, only `{"id"}`. |
| Errors | `401`; `403` the role, a rule, a field rule or a key scope refuses; `404` no such collection; `422` a value that doesn't validate, an unknown field, a link to a document that doesn't exist, or a `unique` value that's taken |

```sh
curl -X POST localhost:3000/api/posts \
  -H "authorization: Bearer $TOKEN" \
  -H 'content-type: application/json' \
  -d '{"title": "Shipping v0.1.0", "category": "01a18491-0169-744b-b4c2-75708f5b1426", "tags": ["release"]}'
```

```json
{
  "category": {
    "createdAt": "2026-10-28T22:10:58.025187Z",
    "id": "01a18491-0169-744b-b4c2-75708f5b1426",
    "name": "Releases",
    "status": "published",
    "updatedAt": "2026-10-28T22:10:58.025187Z"
  },
  "createdAt": "2026-10-28T22:10:58.028741Z",
  "id": "01a18491-016c-7521-861e-dff9974d0737",
  "slug": "shipping-v0-1-0",
  "status": "published",
  "tags": [
    "release"
  ],
  "title": "Shipping v0.1.0",
  "updatedAt": "2026-10-28T22:10:58.028741Z"
}
```

### `GET /api/{collection}/{id}`

Reads one document.

| | |
|---|---|
| Who | Content, as for [`GET /api/{collection}`](#get-apicollection) |
| Query | `depth`, `select`, `populate` and `joins`, as for a list. Any other parameter is a `400`. |
| Returns | `200` and the document |
| Errors | `400`; `401`, `403` a read rule or key scope refuses; `404` no such document, or one a read rule hides |

```sh
curl 'localhost:3000/api/posts/01a18491-016c-7521-861e-dff9974d0737?depth=0'
```

```json
{
  "category": "01a18491-0169-744b-b4c2-75708f5b1426",
  "createdAt": "2026-10-28T22:10:58.028741Z",
  "id": "01a18491-016c-7521-861e-dff9974d0737",
  "slug": "shipping-v0-1-0",
  "status": "published",
  "tags": [
    "release"
  ],
  "title": "Shipping v0.1.0",
  "updatedAt": "2026-10-28T22:10:58.028741Z"
}
```

### `PATCH /api/{collection}/{id}`

Changes a document. What you send is merged into what's stored: a field inside a group changes on its own, a list is replaced whole, and `null` clears a field. See [Updating](/fields#updating-send-only-what-changed).

| | |
|---|---|
| Who | Content: a role whose `content` is `all`, or `own` for documents you created, subject to the update rule. A key needs `collection:write`, `*:write` or `admin`. |
| Body | The fields to change |
| Returns | `200` and the document, with links filled in to depth 1. If a read rule now hides it from you, only `{"id"}`. |
| Errors | `401`; `403 You can only change documents you created.`, `403 An access rule doesn't let you change this document.`, or a field rule or key scope refuses; `404`; `409` the collection's fields changed during the request; `422` |

```sh
curl -X PATCH localhost:3000/api/posts/01a18491-016c-7521-861e-dff9974d0737 \
  -H "authorization: Bearer $TOKEN" \
  -H 'content-type: application/json' \
  -d '{"tags": ["release", "rust"]}'
```

The response is the whole document, as for `POST`, with `tags` now `["release", "rust"]` and a new `updatedAt`.

### `DELETE /api/{collection}/{id}`

Deletes a document. A document other documents link to can't be deleted until those links are removed.

| | |
|---|---|
| Who | Content, as for `PATCH`, subject to the delete rule |
| Returns | `204` |
| Errors | `401`; `403`; `404`; `409` other documents link here |

```sh
curl -X DELETE localhost:3000/api/posts/01a18491-016f-726b-a131-7ffee91892c7 \
  -H "authorization: Bearer $TOKEN"
```

A document something links to:

```json
{
  "detail": "1 other document links to this one; remove that link first",
  "requestId": "01a18491-0194-77f6-a302-15a0e69572e9",
  "status": 409,
  "title": "Conflict",
  "type": "about:blank"
}
```

### `GET /api/{collection}/{id}/references`

Lists the documents that link to this one, among those you can read, through fields you can read. Use it to find what blocks a delete.

| | |
|---|---|
| Who | Content, as for reading the document |
| Returns | `200` and `{"docs": [...]}`, each with `collection`, `id` and `path`, the field that holds the link |
| Errors | `401`, `403` a read rule or key scope refuses; `404` no such document, or one you can't read |

```sh
curl localhost:3000/api/categories/01a18491-0169-744b-b4c2-75708f5b1426/references
```

```json
{
  "docs": [
    {
      "collection": "posts",
      "id": "01a18491-016c-7521-861e-dff9974d0737",
      "path": "category"
    }
  ]
}
```
