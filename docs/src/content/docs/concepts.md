---
title: Concepts
description: Collections, globals, documents, fields, roles and access rules, and how the TachyonCMS API is laid out.
---

TachyonCMS has a small set of ideas. Once you have these, every endpoint follows from them.

## Collections and documents

A **collection** is a content type: `posts`, `categories`, `places`. Its **schema** names the collection with a `slug` and lists its **fields**. You create collections over the API, or from a file with `tachyon schema apply`.

A **document** is one entry in a collection, stored as JSON in Postgres. Every document carries four keys the server adds, so your own top-level fields can't use these names:

| Key | What it is |
|---|---|
| `id` | A UUIDv7, so IDs sort by creation time. |
| `createdAt`, `updatedAt` | UTC timestamps to the microsecond. |
| `status` | Always `"published"` in v0.1.0. Drafts aren't built yet. |

Deleting a document is a soft delete: it disappears from the API, and a unique value it held is free for other documents again.

Each collection gets its own routes under `/api/{collection}`:

| Method and path | Does |
|---|---|
| `GET /api/posts` | Lists documents, newest first, 10 to a page. |
| `POST /api/posts` | Creates a document. |
| `GET /api/posts/{id}` | Reads one document. |
| `PATCH /api/posts/{id}` | Changes the fields you send and leaves the rest alone. |
| `DELETE /api/posts/{id}` | Deletes a document. |
| `GET /api/posts/{id}/references` | Lists the documents that link to this one. |

## Globals

A **global** is a collection with exactly one document, such as site settings. You define it like a collection, with `"kind": "global"`, and read and change it at `/api/globals/{slug}`. See [Content types](/content-types#globals).

## Fields

Fields hold the data: text, numbers, dates, choices, links to other documents, map points, JSON, and groups and lists of other fields. Some fields only arrange the editing screen and don't change the data's shape. Two kinds are filled on every read instead of stored: **virtual fields**, which show a value from a linked document, and **join fields**, which list the documents linking here. See [Fields](/fields) and [Joins and virtual fields](/joins-and-virtual-fields).

## Who is asking

Each request comes from one of three callers:

- **Nobody.** No credentials. Anyone may read, unless an access rule says otherwise, and nothing else.
- **A signed-in user**, with a session cookie from a browser or a `tcs_` bearer token. See [Sign-in](/sign-in).
- **An API key** (`tcy_`), which acts for the user who made it, narrowed by its scopes. See [API keys](/api-keys).

Credentials that are present but don't work get a `401`. TachyonCMS never quietly treats a broken token as nobody.

## Roles and access rules

A user's **role** sets their defaults: Viewers read, Authors change what they created, Editors change all content, and Admins also manage content types, users and roles. You can add roles of your own. See [Roles](/roles).

**Access rules** in a schema narrow those defaults for one collection, global or field: published posts for everyone, drafts for their authors, a salary field for HR only. Rules on reads become part of the database query, so a document you can't read never leaves Postgres. See [Access rules](/access-rules).

## Errors

Every error is [RFC 9457](https://www.rfc-editor.org/rfc/rfc9457) `application/problem+json`, with a `requestId` you can find in the server's logs and in the `x-request-id` response header. Validation errors name each field at fault by its path, down into groups and list rows:

```json
{
  "errors": [
    {
      "message": "is required",
      "path": "title"
    },
    {
      "message": "expected one of: article, note",
      "path": "kind"
    },
    {
      "message": "must be at most 60 characters",
      "path": "seo.title"
    },
    {
      "message": "expected an http or https URL",
      "path": "links.0.url"
    }
  ],
  "requestId": "01a1845f-afcb-7036-9452-7c91cfe02c2b",
  "status": 422,
  "title": "Validation failed",
  "type": "about:blank"
}
```

The status codes follow one pattern across the API:

| Status | Means |
|---|---|
| `400` | The request is malformed: an unknown query parameter, a filter on a field that doesn't exist. |
| `401` | Sign in first, or the credentials sent don't work. |
| `403` | You're signed in, but you may not do this. |
| `404` | It doesn't exist, or you can't read it. The two look the same on purpose. |
| `409` | A conflict: setup has already run, other documents link to this one, or a schema change needs confirming. |
| `422` | Validation failed; `errors` lists each field. |
| `503` | The request took longer than 30 seconds. |

Request bodies are limited to 10 MB.
