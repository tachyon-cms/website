---
title: The trash
description: See what's been deleted, bring a document back, or delete it for good. On main, arriving in the next release.
---

A deleted document has always been kept, out of every read. You just couldn't get at it. Now you can: list the trash, restore what was deleted by mistake, and empty what you really meant to lose.

:::note[Not in v0.2.0]
The trash routes are on `main` and arrive in the next release. v0.2.0 keeps deleted documents but has no way to reach them.
:::

The trash works on every collection, with or without drafts. Globals have no trash, and `users` isn't in it yet.

## What a delete does

`DELETE /api/{collection}/{id}` moves a document to the trash and answers `204`. From then on it's out of every list, read, link and join, and its links stop holding other documents in place, but it keeps its history and both its copies. Anything [scheduled](/scheduling) for it is cancelled.

## List the trash

`GET /api/{collection}/trash` lists what's there, most recently deleted first. Each document comes with `deletedAt`:

```sh
curl 'localhost:3000/api/posts/trash?limit=1' -H "authorization: Bearer $ED_TOKEN"
```

```json
{
  "docs": [
    {
      "author": "01a1aed9-aed3-7414-9852-db19d65bbe99",
      "body": "Notes for a post about the new release.",
      "createdAt": "2026-11-06T03:14:54.202298Z",
      "deletedAt": "2026-11-06T03:17:35.361915Z",
      "id": "01a1aeda-247d-7036-8c3e-6858c3682b86",
      "publishedAt": "2026-11-06T03:15:22.925459Z",
      "status": "published",
      "title": "What is new this month",
      "updatedAt": "2026-11-06T03:16:23.105837Z"
    }
  ],
  "hasNextPage": true,
  "limit": 1,
  "page": 1
}
```

In a collection with drafts, you see each document's draft, which is the copy a delete acts on. Links stay IDs.

It takes `limit`, `page`, `count`, `where`, `sort` and `select`, as [a list does](/querying). `sort=deletedAt` means when it was deleted, oldest first, even when your schema has a field with that name; `-deletedAt` is the default order. Anything else, `depth` and `draft` included, is a `400`.

## Restore a document

`POST /api/{collection}/trash/{id}/restore` brings one back and returns it:

```sh
curl -X POST localhost:3000/api/posts/trash/01a1aeda-669f-7731-b979-b1a2472386d9/restore \
  -H "authorization: Bearer $ED_TOKEN"
```

Trimmed to four keys:

```json
{
  "id": "01a1aeda-669f-7731-b979-b1a2472386d9",
  "slug": "hello",
  "status": "published",
  "title": "Hello"
}
```

It comes back as it went: published if it was published, with its draft beside it. A lot can change while a document sits in the trash, so a restore checks it again:

- It has to validate against the schema as it is today.
- Its unique values have to be free.
- Every link has to reach a document that's there and that you can read.

Anything else is a `422`. In a collection with drafts, each message starts `the draft: ` or `the published copy: `, so you know which copy is in the way. Here the series a draft linked to was deleted in the meantime:

```json
{
  "errors": [
    {
      "message": "the draft: doesn't match any document in the related collection",
      "path": "series"
    }
  ],
  "requestId": "01a1aedc-c094-75a9-a524-1bf61346c854",
  "status": 422,
  "title": "Validation failed",
  "type": "about:blank"
}
```

Restore that series first, or delete the post for good.

## Delete for good

`DELETE /api/{collection}/trash/{id}` deletes one document for good, with its history, and answers `204`. There's no undo. A document that isn't in the trash, or that you can't reach there, is a `404`.

`DELETE /api/{collection}/trash` empties everything in it you may delete, and tells you how many went:

```sh
curl -X DELETE localhost:3000/api/posts/trash -H "authorization: Bearer $ANN_TOKEN"
```

```json
{
  "deleted": 2
}
```

## Who sees what

All of it takes the `delete` right, so an Author sees, restores and empties only what they created. Ann's `DELETE` above emptied her two posts and left Ed's where they were. In a collection with drafts, the trash also needs `readDrafts`, as every change to a draft does.

| Caller | `GET /api/posts/trash` |
|---|---|
| Admin, Editor | Everything in the trash. |
| Author | What they created. |
| Viewer | `403` |
| Signed out | `401` |

A key needs `posts:write`, `*:write` or `admin`.
