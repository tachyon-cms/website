---
title: Drafts and publishing
description: Keep a working draft beside what's live, read drafts with ?draft=true, and publish or unpublish when you're ready. On main, arriving in the next release.
---

Without drafts, saving is publishing. Fix a typo in a live post and the fix is live; start a new post and the half-written version is out there too. Turn drafts on and each document keeps two copies instead: the published one everyone reads, and a draft that only people who may read drafts ever see. Edit the draft as often as you like. Nothing changes on your site until someone publishes it.

:::note[Not in v0.2.0]
Drafts, versions, scheduling and the trash are on `main` and arrive in the next release. v0.2.0 doesn't have them: there, every save goes live and `status` is always `"published"`.
:::

This page covers the draft copy and publishing. [Version history](/versions) covers the record every save leaves, [Scheduled publishing](/scheduling) the clock, and [The trash](/trash) what happens on delete.

## Turn drafts on

Drafts live under the schema's `versions` option. This `posts` collection keeps drafts, autosaves every two seconds, and holds on to 50 versions of each post:

```sh
curl -X POST localhost:3000/api/admin/collections \
  -H "authorization: Bearer $TOKEN" \
  -H 'content-type: application/json' \
  -d '{"slug": "posts", "versions": {"drafts": {"autosave": {"interval": 2000}}, "maxVersions": 50}, "fields": [
        {"name": "title", "type": "text", "required": true},
        {"name": "slug", "type": "slug", "from": "title", "unique": true},
        {"name": "body", "type": "textarea"},
        {"name": "author", "type": "relationship", "relationTo": "users"}
      ]}'
```

The schema comes back with the option as saved (trimmed to it):

```json
{
  "versions": {
    "drafts": {
      "autosave": {
        "interval": 2000
      }
    },
    "maxVersions": 50
  }
}
```

| Option | Does |
|---|---|
| `versions` | `true` keeps history and nothing more: every update goes live, and every update is recorded. An object sets the options below. `false`, or leaving it out, keeps no versions. |
| `versions.drafts` | `true` adds the draft copy. `{"autosave": {"interval": 2000}}` does too, and also allows [autosave](/versions#autosave). |
| `versions.drafts.autosave.interval` | How often an editor should autosave, from 100 to 600000 milliseconds. TachyonCMS keeps it with the schema for the editor to read; it doesn't time anything itself. |
| `versions.maxVersions` | How many versions each document keeps, oldest dropped first. 100 unless you say otherwise; 0 keeps every one. |

Globals take the same option. Shared blocks and `users` don't, and say why: ``versions: a shared block has no documents, so it has no versions``. A misspelt key is refused by its path, such as ``versions: unknown option `nope` ``, and a value of the wrong shape gets ``versions: must be true, false or {"drafts": true, "maxVersions": 100}``.

Turning drafts on for a collection that already has documents starts each draft as a copy of what's published, so nothing changes until someone edits.

### `publishedAt` is reserved

A published copy carries `publishedAt`, the moment it went live. In a collection with drafts, that name belongs to TachyonCMS, alongside `id`, `createdAt`, `updatedAt` and `status`. Turning drafts on while the schema has a top-level `publishedAt` field of its own is refused:

```json
{
  "errors": [
    {
      "message": "field name `publishedAt` is reserved",
      "path": ""
    }
  ],
  "requestId": "01a1aeda-0779-70be-b32f-0a5d1ee6879c",
  "status": 422,
  "title": "Validation failed",
  "type": "about:blank"
}
```

Rename the field first, with [`renames`](/content-types#rename-a-field). A `publishedAt` inside a group is fine, and so is one in a collection without drafts, even with `"versions": true`.

## Write a draft

In a collection with drafts, every create and update writes the draft. `required` waits until you publish, so Ann, an Author, can save notes before she has a title:

```sh
curl -X POST localhost:3000/api/posts \
  -H "authorization: Bearer $ANN_TOKEN" \
  -H 'content-type: application/json' \
  -d '{"body": "Notes for a post about the new release."}'
```

```json
{
  "body": "Notes for a post about the new release.",
  "createdAt": "2026-11-06T03:14:54.202298Z",
  "id": "01a1aeda-247d-7036-8c3e-6858c3682b86",
  "status": "draft",
  "updatedAt": "2026-11-06T03:14:54.202298Z"
}
```

Every other check still runs on a draft: a number out of range, a bad email or a link to a document that doesn't exist is a `422` straight away. Only `required` waits.

What comes back is the draft. Its `status` tells you whether anything is live, not what the draft holds: `draft` until the first publish, then `published` until someone unpublishes, however far the draft has moved on since.

## Read drafts with `?draft=true`

Reads stay on what's published. The post above doesn't exist as far as the public is concerned:

```sh
curl localhost:3000/api/posts
```

```json
{
  "docs": [],
  "hasNextPage": false,
  "limit": 10,
  "page": 1
}
```

`GET /api/posts/01a1aeda-…` is a `404` too. Add `?draft=true` to a list, a single read or a global to read drafts instead:

```sh
curl 'localhost:3000/api/posts?draft=true' -H "authorization: Bearer $ANN_TOKEN"
```

```json
{
  "docs": [
    {
      "body": "Notes for a post about the new release.",
      "createdAt": "2026-11-06T03:14:54.202298Z",
      "id": "01a1aeda-247d-7036-8c3e-6858c3682b86",
      "status": "draft",
      "updatedAt": "2026-11-06T03:14:54.202298Z"
    }
  ],
  "hasNextPage": false,
  "limit": 10,
  "page": 1
}
```

That list holds the documents whose drafts you may read, which for an Author means the ones they created. A list with `draft=true` skips documents whose draft you can't read; it doesn't fall back to what's published.

The parameter takes `true` or `false`, and anything else is a `400`. So is asking where there are no drafts: `` `draft`: `users` has no drafts ``. Asking without the right is a `403`, or a `401` if you aren't signed in:

```json
{
  "detail": "`draft`: you don't have permission to read the drafts of `posts`",
  "requestId": "01a1aeda-b93b-73df-aa02-3142cc106c32",
  "status": 403,
  "title": "Forbidden",
  "type": "about:blank"
}
```

`select[publishedAt]=true` works in collections with drafts, as `select[status]=true` always has. Neither can be filtered or sorted on.

### How links read inside a draft

A draft that links to other documents raises a question: which copy of *those* should you see? TachyonCMS answers it link by link. Each linked document shows as its draft where you may read that draft, and as what's published where you may not.

Say posts also link to a `series` collection that has drafts of its own. Ed, an Editor, published a series called `Release notes`, then renamed its draft to `Monthly release notes`. Ann's post links to it.

The public sees the published series:

```sh
curl -g 'localhost:3000/api/posts/01a1aeda-247d-7036-8c3e-6858c3682b86?select[title]=true&select[series]=true'
```

```json
{
  "id": "01a1aeda-247d-7036-8c3e-6858c3682b86",
  "series": {
    "createdAt": "2026-11-06T03:15:22.853911Z",
    "id": "01a1aeda-9467-764b-b9e9-ba3ad5c98ce8",
    "name": "Release notes",
    "publishedAt": "2026-11-06T03:15:22.872427Z",
    "status": "published",
    "updatedAt": "2026-11-06T03:15:22.888347Z"
  },
  "title": "What is new in November"
}
```

Ed, reading the post's draft, sees the series' draft as well, since he may read every draft:

```sh
curl -g 'localhost:3000/api/posts/01a1aeda-247d-7036-8c3e-6858c3682b86?draft=true&select[title]=true&select[series]=true' \
  -H "authorization: Bearer $ED_TOKEN"
```

```json
{
  "id": "01a1aeda-247d-7036-8c3e-6858c3682b86",
  "series": {
    "createdAt": "2026-11-06T03:15:22.853911Z",
    "id": "01a1aeda-9467-764b-b9e9-ba3ad5c98ce8",
    "name": "Monthly release notes",
    "publishedAt": "2026-11-06T03:15:22.872427Z",
    "status": "published",
    "updatedAt": "2026-11-06T03:15:22.888347Z"
  },
  "title": "What is new in November"
}
```

Ann sends the same request and gets `"name": "Release notes"`. The post's draft is hers, so she reads it; the series' draft is Ed's, so for that link she gets what's published.

The same goes everywhere a link is followed: populated links, [virtual fields and joins](/joins-and-virtual-fields), filters through relationships such as `where[series.name][equals]=…`, and [`?format=`](/rich-text#read-it-as-html-markdown-or-text) output. Without `draft=true`, every link reads what's published.

## Publish

`POST /api/{collection}/{id}/publish` copies the draft over what's live. This is where the full validation happens, so Ann's title-less draft is refused when Ed tries:

```sh
curl -X POST localhost:3000/api/posts/01a1aeda-247d-7036-8c3e-6858c3682b86/publish \
  -H "authorization: Bearer $ED_TOKEN"
```

```json
{
  "errors": [
    {
      "message": "is required",
      "path": "title"
    }
  ],
  "requestId": "01a1aeda-24c0-7384-82b0-1d689f74f780",
  "status": 422,
  "title": "Validation failed",
  "type": "about:blank"
}
```

Once Ann adds a title, the same request goes through and returns what's now live, links filled in to depth 1:

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
  "publishedAt": "2026-11-06T03:15:00.406018Z",
  "status": "published",
  "title": "What is new this month",
  "updatedAt": "2026-11-06T03:15:00.406018Z"
}
```

Ann, as an Author, can't publish at all; she gets a `403 You don't have permission to do this.` That's the `publish` right, covered [below](#who-may-do-what).

Two more checks wait for publishing:

- Every link has to point at a published document you can read. A link to a series that's still only a draft saves fine, then stops the publish with ``doesn't match any document in the related collection`` at `series`.
- `unique` values are only compared between published copies, so two drafts can share a slug. The clash turns up when you publish the second one, as a `422` at the field: `must be unique; another document already uses this value`.

Publishing and unpublishing take no query parameters. An unknown one is a `400` that names it.

A global publishes at `POST /api/globals/{slug}/publish`. Until a global with drafts is first published, `GET /api/globals/{slug}` reads `{}`.

## Unpublish

`POST /api/{collection}/{id}/unpublish` takes a document off the site and leaves its draft as it was. The answer is the draft, now with `"status": "draft"` and no `publishedAt`:

```sh
curl -X POST localhost:3000/api/posts/01a1aeda-247d-7036-8c3e-6858c3682b86/unpublish \
  -H "authorization: Bearer $ED_TOKEN"
```

Reading it without `draft=true` is a `404` from then on. Unpublishing something that isn't published is a `409`:

```json
{
  "detail": "`01a1aeda-247d-7036-8c3e-6858c3682b86` isn't published",
  "requestId": "01a1aeda-6662-702e-8b20-882bd8a68f9c",
  "status": 409,
  "title": "Conflict",
  "type": "about:blank"
}
```

Publish again and the draft goes live with a new `publishedAt`. Globals unpublish at `POST /api/globals/{slug}/unpublish`.

## Who may do what

Drafts bring three more rights. The built-in roles start like this:

| Right | Admin, Editor | Author | Viewer, signed out |
|---|---|---|---|
| `readDrafts` | every document | their own | no |
| `readVersions` | every document | their own | no |
| `publish` | every document | no | no |

An Author's "own" means documents they created. Nobody created a global, so an Author reads no global's drafts or versions. Custom roles follow their `content` ability: `all` as Editor, `own` as Author, `read` as Viewer. [Roles](/roles#drafts-versions-and-publishing) has the details, and each right takes a rule in `access`, as [Access rules](/access-rules#rules-for-drafts-and-history) shows.

Publishing, unpublishing and scheduling take `publish`. Seeing a schedule takes `readDrafts`.

### Changing a document needs its draft

Every write to a collection with drafts lands on the draft, so changing or deleting a document needs `readDrafts` as well as `update` or `delete`. Creating one doesn't, though if you can't read the draft you just made, the answer holds only its `id`.

When the draft is out of reach, what you get back depends on what you already know:

| You can read | A `PATCH` or `DELETE` gets |
|---|---|
| The draft | Through, if `update` or `delete` allows it. |
| What's published, but not the draft | `403`. The document is on the site, so its existence is no secret. |
| Neither | `404`, like any document you can't read. |

Ann reading Ed's published post can see it exists, so changing it is a `403`. Ed's post that was never published is a `404` for her. Someone who may read no drafts in the collection at all gets a `403` for every change, whatever the document, since that says nothing about any one of them.

## Turning drafts off

Turning drafts off is refused with a `409` while any document, trashed ones included, has a draft that differs from what's published or was never published:

```json
{
  "detail": "3 documents have unpublished drafts; publish or delete them first",
  "requestId": "01a1aedd-b4d2-715a-a871-2b950b21ef1e",
  "status": 409,
  "title": "Conflict",
  "type": "about:blank"
}
```

There's no `confirm` for this one, because the only ways through are publishing work nobody reviewed or throwing it away. Publish or delete those documents first. Once drafts do go, so does anything scheduled to publish or unpublish in that collection: with no draft left, there's nothing for it to ship.

## Also changed

Two changes on `main` reach every collection, drafts or not:

- `POST`, `PATCH` and `DELETE` on documents refuse query parameters they don't take, with a `400` that names the parameter. v0.2.0 ignored them, so a client that sends extra ones will start getting errors. `PATCH` takes only `autosave`.
- A write that collides with another one in the database, a deadlock or a serialization failure, is a `409` with ``Another change to the same documents got in the way; try again.`` Nothing was saved, so retrying is safe.
