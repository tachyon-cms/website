---
title: Version history
description: See every saved version of a document, compare any two field by field, and restore an old one. On main, arriving in the next release.
---

Someone rewrote the intro last Tuesday and nobody can remember what it said before. With `versions` on, you don't have to remember: each document keeps its past versions, and you can list them, read one, compare any two, and write an old one back.

:::note[Not in v0.2.0]
Version history is on `main` and arrives in the next release. v0.2.0 keeps no versions.
:::

## What gets recorded

Turn history on with the schema's `versions` option, described in [Drafts and publishing](/drafts#turn-drafts-on). `"versions": true` is enough for history alone.

| Collection has | A version is recorded on |
|---|---|
| `versions`, drafts off | Every create and update. |
| `versions` with drafts | Every publish, and every draft save that isn't an [autosave](#autosave). Restoring a version and scheduling a publish record one too. |

Unpublishing records nothing, since the draft didn't change. Each version is marked `draft` or `published` by the copy it came from.

`maxVersions` caps how many each document keeps, 100 unless you set it, and the oldest goes first. `0` keeps every one. A version a [scheduled publish](/scheduling) is waiting to ship is never the one dropped.

### Autosave

An editor that saves every couple of seconds would bury the useful versions under hundreds of near-copies. With `"drafts": {"autosave": {"interval": 2000}}`, a `PATCH` can say it's an autosave:

```sh
curl -X PATCH 'localhost:3000/api/posts/01a1aeda-247d-7036-8c3e-6858c3682b86?autosave=true' \
  -H "authorization: Bearer $ANN_TOKEN" \
  -H 'content-type: application/json' \
  -d '{"body": "Notes for a post about the new release. Drafts, versions and a trash."}'
```

The draft is saved as usual and no version is recorded. `interval` is how often your editor should do this; TachyonCMS keeps the number with the schema for the editor to read.

`autosave` takes `true` or `false`. In a collection without autosave turned on, it's a `400`: `` `autosave`: `series` doesn't autosave ``.

## List the versions

`GET /api/{collection}/{id}/versions` lists a document's versions, newest first, without their data. This is the post from [Drafts and publishing](/drafts), after a few rounds of edits and publishes:

```sh
curl localhost:3000/api/posts/01a1aeda-247d-7036-8c3e-6858c3682b86/versions \
  -H "authorization: Bearer $ANN_TOKEN"
```

```json
{
  "docs": [
    {
      "createdAt": "2026-11-06T03:15:22.925459Z",
      "createdBy": "01a1aed9-afe9-7309-8877-0d2644b9e98b",
      "id": "01a1aeda-94b3-7352-bdb6-eedbd87d5e05",
      "kind": "published"
    },
    {
      "createdAt": "2026-11-06T03:15:22.90662Z",
      "createdBy": "01a1aed9-afe9-7309-8877-0d2644b9e98b",
      "id": "01a1aeda-949f-7191-a9c9-556292f037bc",
      "kind": "draft"
    },
    {
      "createdAt": "2026-11-06T03:15:00.406018Z",
      "createdBy": "01a1aed9-afe9-7309-8877-0d2644b9e98b",
      "id": "01a1aeda-3cbc-726e-ba0a-dcba5d57b126",
      "kind": "published"
    },
    {
      "createdAt": "2026-11-06T03:14:54.202298Z",
      "createdBy": "01a1aed9-aed3-7414-9852-db19d65bbe99",
      "id": "01a1aeda-247f-73d1-b1ba-10ffd153e374",
      "kind": "draft"
    }
  ],
  "hasNextPage": false,
  "limit": 10,
  "page": 1
}
```

The list is trimmed to four of its seven versions. `createdBy` is the user who saved each one. Page with `limit` and `page`, as for any list; nothing else is taken.

## Read one version

`GET /api/{collection}/{id}/versions/{vid}` returns a version with its `data`:

```sh
curl localhost:3000/api/posts/01a1aeda-247d-7036-8c3e-6858c3682b86/versions/01a1aeda-3cbc-726e-ba0a-dcba5d57b126 \
  -H "authorization: Bearer $ANN_TOKEN"
```

```json
{
  "createdAt": "2026-11-06T03:15:00.406018Z",
  "createdBy": "01a1aed9-afe9-7309-8877-0d2644b9e98b",
  "data": {
    "author": "01a1aed9-aed3-7414-9852-db19d65bbe99",
    "body": "Notes for a post about the new release.",
    "title": "What is new this month"
  },
  "id": "01a1aeda-3cbc-726e-ba0a-dcba5d57b126",
  "kind": "published"
}
```

The data is as it was stored. Links stay IDs, since what they pointed at may have changed or gone, and fields you can't read aren't there.

## Compare two versions

`GET /api/{collection}/{id}/diff?from=…&to=…` compares any two of a version ID, `draft` and `published`, field by field. Both are required. Here's what the draft has changed since that version was published:

```sh
curl 'localhost:3000/api/posts/01a1aeda-247d-7036-8c3e-6858c3682b86/diff?from=01a1aeda-3cbc-726e-ba0a-dcba5d57b126&to=draft' \
  -H "authorization: Bearer $ANN_TOKEN"
```

```json
{
  "changes": [
    {
      "after": "What is new in November",
      "before": "What is new this month",
      "op": "changed",
      "path": "title",
      "rowId": null
    },
    {
      "after": "Notes for a post about the new release. Drafts, versions and a trash.",
      "before": "Notes for a post about the new release.",
      "op": "changed",
      "path": "body",
      "rowId": null
    },
    {
      "after": "01a1aeda-9467-764b-b9e9-ba3ad5c98ce8",
      "before": null,
      "op": "added",
      "path": "series",
      "rowId": null
    }
  ],
  "from": "01a1aeda-3cbc-726e-ba0a-dcba5d57b126",
  "to": "draft"
}
```

`?from=published&to=draft` is the question a reviewer asks most: what will publishing change?

| Key | Is |
|---|---|
| `path` | The field, as errors name it: `title`, `seo.title`, `layout.1.heading`. |
| `op` | `added`, `removed` or `changed`. A `null` counts as no value, so a field going from nothing to something is `added`. |
| `before`, `after` | The values on each side. |
| `rowId` | For a change inside a list or block row, that row's `id`; otherwise `null`. |

Changes come in schema order. Groups are compared field by field. List and block rows are matched by their `id`, so a row that only moved shows as one change to the list's order, with the row IDs as `before` and `after`, not as everything after it changing. Rich text, points and `hasMany` values compare whole.

Each side needs its own right: a version needs `readVersions`, `draft` needs `readDrafts`, `published` needs `read`. Fields you can't read are left out of both sides before they're compared. Without both `from` and `to` it's a `400`: `` `to` is required: a version ID, `draft` or `published` ``.

## Restore a version

`POST /api/{collection}/{id}/versions/{vid}/restore` writes a version back. With drafts it goes into the draft; without, into what's live. It never publishes:

```sh
curl -X POST localhost:3000/api/posts/01a1aeda-247d-7036-8c3e-6858c3682b86/versions/01a1aeda-3cbc-726e-ba0a-dcba5d57b126/restore \
  -H "authorization: Bearer $ANN_TOKEN"
```

```json
{
  "author": {
    "createdAt": "2026-11-06T03:14:24.082132Z",
    "id": "01a1aed9-aed3-7414-9852-db19d65bbe99",
    "name": "Ann",
    "status": "published",
    "updatedAt": "2026-11-06T03:14:24.082132Z"
  },
  "body": "Notes for a post about the new release.",
  "createdAt": "2026-11-06T03:14:54.202298Z",
  "id": "01a1aeda-247d-7036-8c3e-6858c3682b86",
  "publishedAt": "2026-11-06T03:15:22.925459Z",
  "status": "published",
  "title": "What is new this month",
  "updatedAt": "2026-11-06T03:16:23.105837Z"
}
```

The version replaces the copy whole: `series` wasn't in it, so the draft lost its series. The public still sees "What is new in November" until someone publishes. A field you may not change keeps its current value, and the result is checked as any save of that copy would be. The restore is recorded as a new `draft` version, so you can undo it the same way.

Restoring takes the `update` right, and `readDrafts` too with drafts on, as any change of a draft does.

## Who sees history

History is data too, so it follows the same rights as the document:

- `readVersions` lets you see a document's versions. Built in, that's Admins and Editors for every document, Authors for their own.
- A version that was a draft needs `readDrafts` as well. Without it, those versions are missing from the list and a `404` when asked for.
- History goes by the copy you can read. Without `readDrafts`, you see a document's versions only when you can read what's published of it, so a post that was never published has no history for you.

A document whose history you can't see is a `404`, like one that doesn't exist. A global's history is a `403` instead, since a global's existence is no secret. A collection that keeps no versions is a `400`: `` `categories` keeps no versions ``.

Globals have the same routes under `/api/globals/{slug}`: `versions`, `versions/{vid}`, `versions/{vid}/restore` and `diff`.

## Schema changes and history

When you change a schema, stored versions are migrated with the documents, so a renamed field is renamed in history too.

Removing `versions`, or lowering `maxVersions` below what documents already hold, deletes versions. Like any change that loses data, it's a `409 Confirmation required` with a preview, and the preview's `pruned` says how many versions would go:

```json
{
  "detail": "This change removes or retypes fields, or leaves documents that won't validate. Send it again with \"confirm\": true to go ahead.",
  "preview": {
    "cleared": 0,
    "diff": {
      "changes": [
        {
          "drafts": [
            true,
            true
          ],
          "maxVersions": [
            50,
            2
          ],
          "type": "versionsChanged"
        }
      ]
    },
    "documents": 4,
    "duplicates": [],
    "examples": [],
    "indexes": {
      "create": [],
      "drop": []
    },
    "invalid": 0,
    "needsConfirmation": true,
    "pruned": 4
  },
  "requestId": "01a1aedd-b4e6-7643-987c-a4df815f6c50",
  "status": 409,
  "title": "Confirmation required",
  "type": "about:blank"
}
```

Send it again with `"confirm": true` and the oldest versions go in the same change.
