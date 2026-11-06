---
title: Drafts and history API
description: The publish, schedule, version, diff and trash endpoints in TachyonCMS. On main, arriving in the next release.
sidebar:
  label: Drafts and history
---

Part of the [HTTP API](/reference/http-api) reference. [Requests and responses](/reference/http-api#requests-and-responses) covers what every endpoint shares, and [Who can call what](/reference/http-api#who-can-call-what) explains the **Who** rows.

:::note[Not in v0.2.0]
Every endpoint on this page is on `main` and arrives in the next release. v0.2.0 answers them with a `404`.
:::

The guides explain the ideas: [Drafts and publishing](/drafts), [Version history](/versions), [Scheduled publishing](/scheduling) and [The trash](/trash).

None of these endpoints take query parameters except where a **Query** row says so. An unknown one is a `400` that names it.

## Rights

The **Who** rows name these rights. Each follows the role's `content` ability unless the schema's [`access`](/access-rules#rules-for-drafts-and-history) gives it a rule, and the read rule always applies on top.

| Right | `content: all` | `content: own` | `content: read`, signed out | Key scopes |
|---|---|---|---|---|
| `readDrafts` | every document | their own | no | `collection:write`, `*:write`, `admin` |
| `readVersions` | every document | their own | no | `collection:write`, `*:write`, `admin` |
| `publish` | every document | no | no | `collection:publish`, `*:publish`, `admin` |
| `delete` | every document | their own | no | `collection:write`, `*:write`, `admin` |

A `:publish` key decides what it may publish by its owner's rights, and every answer it gets holds only `{"id"}`. Nobody created a global, so `own` reaches no global.

A document you can't reach is a `404`. Where you can read what's published but not the draft, a publish or schedule is a `403` instead. A global's existence is no secret, so a refused global is always a `403`.

## Publishing

### `POST /api/{collection}/{id}/publish`

Copies the draft over what's live, after full validation.

| | |
|---|---|
| Who | `publish` and `readDrafts` on the document |
| Returns | `200` and the published document, links filled in to depth 1. A `:publish` key gets `{"id"}`. |
| Errors | `400` the collection has no drafts; `401`; `403`; `404`; `422` a `required` field is missing, a link points at a document that isn't published or that you can't read, or a `unique` value is taken by another published document |

```sh
curl -X POST localhost:3000/api/posts/01a1aeda-247d-7036-8c3e-6858c3682b86/publish \
  -H "authorization: Bearer $TOKEN"
```

The response carries `publishedAt` and `"status": "published"`. See [Publish](/drafts#publish) for an example.

### `POST /api/{collection}/{id}/unpublish`

Takes the published copy down and leaves the draft as it was.

| | |
|---|---|
| Who | As for publishing |
| Returns | `200` and the draft, with `"status": "draft"`. A `:publish` key gets `{"id"}`. |
| Errors | `400`; `401`; `403`; `404`; ``409 `{id}` isn't published`` |

### `POST /api/globals/{slug}/publish`

Publishes a global's draft. As for a document, with a `403` rather than a `404` when you may not.

| | |
|---|---|
| Who | `publish` and `readDrafts` on the global |
| Returns | `200` and the published global |
| Errors | `400`; `401`; `403`; `404` no such global; `422` |

### `POST /api/globals/{slug}/unpublish`

Takes a global down. Until it's published again, `GET /api/globals/{slug}` reads `{}`.

| | |
|---|---|
| Who | As for publishing a global |
| Returns | `200` and the draft |
| Errors | `400`; `401`; `403`; `404`; `409` |

## Scheduling

A schedule is one pending publish and one pending unpublish at most. Jobs run as whoever scheduled them, as they are when the time comes; see [Who can schedule](/scheduling#who-can-schedule).

### `PUT /api/{collection}/{id}/schedule`

Sets either side of the schedule, or both. A publish ships the draft as it is now, so it's checked now, as a publish would be.

| | |
|---|---|
| Who | `publish` and `readDrafts` on the document |
| Body | `publishAt`, `unpublishAt` or both: an RFC 3339 time in the future and within 10 years, or `null` to cancel that side. A side left out stays as it was. |
| Returns | `200` and `{"publishAt", "unpublishAt"}`, each a time or `null`. A caller who can't read the draft, such as a `:publish` key, gets `{"id"}`. |
| Errors | `400` not an object, or a key other than those two; `401`; `403`; `404`; `409 the schedule changed at the same time; try again`; `422` a time that has passed, is more than 10 years away or isn't RFC 3339, or a draft that wouldn't publish |

```sh
curl -X PUT localhost:3000/api/posts/01a1aeda-247d-7036-8c3e-6858c3682b86/schedule \
  -H "authorization: Bearer $TOKEN" \
  -H 'content-type: application/json' \
  -d '{"publishAt": "2026-12-07T09:00:00Z", "unpublishAt": "2026-12-31T23:59:00Z"}'
```

```json
{
  "publishAt": "2026-12-07T09:00:00Z",
  "unpublishAt": "2026-12-31T23:59:00Z"
}
```

### `GET /api/{collection}/{id}/schedule`

Shows what's pending.

| | |
|---|---|
| Who | `readDrafts` on the document |
| Returns | `200` and `{"publishAt", "unpublishAt"}`; `{"id"}` for a caller who can't read the draft |
| Errors | `400`; `401`; `403`; `404` |

### `DELETE /api/{collection}/{id}/schedule`

Cancels both sides.

| | |
|---|---|
| Who | `publish` and `readDrafts` on the document |
| Returns | `200` and `{"publishAt": null, "unpublishAt": null}` |
| Errors | `400`; `401`; `403`; `404` |

### `PUT /api/globals/{slug}/schedule`

Schedules a global, as for a document.

| | |
|---|---|
| Who | `publish` and `readDrafts` on the global |
| Body | As for a document |
| Returns | `200` and `{"publishAt", "unpublishAt"}` |
| Errors | As for a document |

### `GET /api/globals/{slug}/schedule`

Shows a global's pending schedule.

| | |
|---|---|
| Who | `readDrafts` on the global |
| Returns | `200` and `{"publishAt", "unpublishAt"}` |
| Errors | `400`; `401`; `403`; `404` |

### `DELETE /api/globals/{slug}/schedule`

Cancels both sides of a global's schedule.

| | |
|---|---|
| Who | `publish` and `readDrafts` on the global |
| Returns | `200` and `{"publishAt": null, "unpublishAt": null}` |
| Errors | `400`; `401`; `403`; `404` |

## Versions

A collection or global with `versions` on records a version on every publish and every draft save that isn't an autosave, or on every update without drafts. See [What gets recorded](/versions#what-gets-recorded).

| Version key | Type | Description |
|---|---|---|
| `id` | string | The version's ID. |
| `kind` | string | `draft` or `published`: the copy it was taken from. |
| `createdAt` | string | When it was recorded. |
| `createdBy` | string or `null` | The user who saved it. |
| `data` | object | Its fields, as stored: links are IDs. Only in a single version, without fields you can't read. |

### `GET /api/{collection}/{id}/versions`

Lists a document's versions, newest first, without their data.

| | |
|---|---|
| Who | `readVersions` on the copy you may read. Versions that were drafts need `readDrafts` too, or they're left out. |
| Query | `limit`, from 1, 10 by default and at most 100; `page`, from 1 |
| Returns | `200` and `{"docs", "limit", "page", "hasNextPage"}` |
| Errors | `400` the collection keeps no versions, or a bad `limit` or `page`; `401`; `403` a key's scopes; `404` |

```sh
curl 'localhost:3000/api/posts/01a1aeda-247d-7036-8c3e-6858c3682b86/versions?limit=1' \
  -H "authorization: Bearer $TOKEN"
```

```json
{
  "docs": [
    {
      "createdAt": "2026-11-06T03:15:22.925459Z",
      "createdBy": "01a1aed9-afe9-7309-8877-0d2644b9e98b",
      "id": "01a1aeda-94b3-7352-bdb6-eedbd87d5e05",
      "kind": "published"
    }
  ],
  "hasNextPage": true,
  "limit": 1,
  "page": 1
}
```

### `GET /api/{collection}/{id}/versions/{vid}`

Reads one version, with its `data`.

| | |
|---|---|
| Who | As for listing. A version that was a draft needs `readDrafts`. |
| Returns | `200` and the version |
| Errors | `400`; `401`; `403`; `404` no such version, or one you can't read |

### `POST /api/{collection}/{id}/versions/{vid}/restore`

Writes a version back into the draft, or into what's live without drafts. It never publishes. The version replaces the copy whole, except fields you may not change, which keep their current value. The restore is recorded as a new version.

| | |
|---|---|
| Who | `update` on the document, and `readDrafts` with drafts, as for a [`PATCH`](/reference/http-api/documents#patch-apicollectionid); and the right to read the version |
| Returns | `200` and the copy written, links filled in to depth 1 |
| Errors | `400`; `401`; `403`; `404`; `422` the version doesn't validate against today's schema, or a link no longer reaches a document you can read |

### `GET /api/{collection}/{id}/diff`

Compares two sides of a document, field by field.

| | |
|---|---|
| Who | For each side: `readVersions` for a version ID, `readDrafts` for `draft`, `read` for `published` |
| Query | `from` and `to`, both required: a version ID, `draft` or `published` |
| Returns | `200` and `{"from", "to", "changes"}` |
| Errors | ``400 `to` is required: a version ID, `draft` or `published` ``; `400` `draft` where there are no drafts; `401`; `403`; `404` |

Each change:

| Key | Type | Description |
|---|---|---|
| `path` | string | The field, dotted as in errors: `seo.title`, `layout.1.heading`. |
| `op` | string | `added`, `removed` or `changed`. |
| `before`, `after` | any | The values on each side, `null` where there's none. |
| `rowId` | string or `null` | The `id` of the list or block row the change is in, or is. |

Rows are matched by `id`; a row that only moved is one change to the list, with row IDs as `before` and `after`. See [Compare two versions](/versions#compare-two-versions) for an example.

### `GET /api/globals/{slug}/versions`

Lists a global's versions. As for a document, with a `403` where you may not.

| | |
|---|---|
| Who | `readVersions` on the global |
| Query | `limit`, `page` |
| Returns | `200` and a page of versions |
| Errors | `400`; `401`; `403`; `404` |

### `GET /api/globals/{slug}/versions/{vid}`

Reads one version of a global.

| | |
|---|---|
| Who | As for listing |
| Returns | `200` and the version |
| Errors | `400`; `401`; `403`; `404` |

### `POST /api/globals/{slug}/versions/{vid}/restore`

Writes a version back into a global's draft, or into what's live without drafts.

| | |
|---|---|
| Who | `update` on the global, and the right to read the version |
| Returns | `200` and the global |
| Errors | `400`; `401`; `403`; `404`; `422` |

### `GET /api/globals/{slug}/diff`

Compares two sides of a global.

| | |
|---|---|
| Who | As for a document's diff |
| Query | `from`, `to` |
| Returns | `200` and `{"from", "to", "changes"}` |
| Errors | `400`; `401`; `403`; `404` |

## Trash

`DELETE /api/{collection}/{id}` moves a document to the trash. These endpoints reach it. Globals have no trash, and `users` has none yet: both are a `404`.

### `GET /api/{collection}/trash`

Lists the trash, most recently deleted first, each document with `deletedAt`. With drafts, each shows its draft. Links stay IDs.

| | |
|---|---|
| Who | `delete`, and `readDrafts` with drafts; you see what those reach |
| Query | `limit`, `page`, `count`, `where`, `sort` and `select`, as for [a list](/reference/http-api/documents#get-apicollection). `sort=deletedAt` sorts by when it was deleted, oldest first; `-deletedAt` is the default. |
| Returns | `200` and a page |
| Errors | `400`; `401`; `403`; `404` no such collection |

### `POST /api/{collection}/trash/{id}/restore`

Takes a document out of the trash, both copies as they were.

| | |
|---|---|
| Who | As for listing the trash |
| Returns | `200` and the document |
| Errors | `401`; `403`; `404` not in the trash, or one you can't reach; `422` it doesn't validate against today's schema, a unique value is taken, or a link no longer reaches a document that's there and that you can read. With drafts, each message starts `the draft: ` or `the published copy: `. |

### `DELETE /api/{collection}/trash/{id}`

Deletes one document for good, with its history.

| | |
|---|---|
| Who | As for listing the trash |
| Returns | `204` |
| Errors | `401`; `403`; `404` |

### `DELETE /api/{collection}/trash`

Deletes everything in the trash that you may delete, for good.

| | |
|---|---|
| Who | As for listing the trash |
| Returns | `200` and `{"deleted": n}` |
| Errors | `401`; `403`; `404` |

```sh
curl -X DELETE localhost:3000/api/posts/trash -H "authorization: Bearer $TOKEN"
```

```json
{
  "deleted": 2
}
```
