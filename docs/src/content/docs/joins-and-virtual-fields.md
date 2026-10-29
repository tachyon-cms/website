---
title: Joins and virtual fields
description: Show a value from a linked document, or the documents that link here, without storing anything twice.
---

Two field types are filled in on every read instead of stored. A **virtual field** shows a value from a document this one links to. A **join field** lists the documents that link to this one. Neither can go stale, because neither keeps a copy.

## Virtual fields

Give a field a `virtual` path: a relationship field, a dot, and a field in the linked document. This one shows the author's name on every post:

```json
{"name": "authorName", "type": "text", "virtual": "author.name"}
```

The field's `type` has to match the field it reads, and every collection the relationship can link to must have that field. Both are checked when you save the schema. The path goes through groups but not into lists, since a value inside a list has no one place.

Filter on a virtual field like any other:

```sh
curl -g 'localhost:3000/api/posts?where[authorName][equals]=You&select[title]=true&select[authorName]=true'
```

```json
{
  "docs": [
    {
      "authorName": "You",
      "id": "01a1845f-afdb-75d9-af23-79cecf8ebabc",
      "title": "Shipping v0.1.0"
    }
  ],
  "hasNextPage": false,
  "limit": 10,
  "page": 1
}
```

Writing to it is a `422` that says where the value comes from:

```json
{
  "errors": [
    {
      "message": "is read from author.name; set that instead",
      "path": "authorName"
    }
  ],
  "requestId": "01a18467-e168-715c-9b77-1853508d4a60",
  "status": 422,
  "title": "Validation failed",
  "type": "about:blank"
}
```

When the relationship holds a list (`hasMany`), the virtual value is a list too. A linked document the caller can't read contributes no value.

## Join fields

A join field names a collection and the relationship field in it that links here. This `categories` schema gets a `posts` join on the `category` field of `posts`, plus a [`defaultPopulate`](/relationships#trim-populated-documents):

```sh
curl -X PUT localhost:3000/api/admin/collections/categories \
  -H "authorization: Bearer $TOKEN" \
  -H 'content-type: application/json' \
  -d '{"schema": {"slug": "categories", "defaultPopulate": {"name": true}, "fields": [
        {"name": "name", "type": "text", "required": true},
        {"name": "description", "type": "textarea"},
        {"name": "posts", "type": "join", "collection": "posts", "on": "category"}
      ]}}'
```

Every read of a category now lists its posts, newest first, 10 at a time. Here `populate` trims each post to its title:

```sh
curl -g 'localhost:3000/api/categories/01a18460-77f9-72da-853d-170e20399120?populate[posts][title]=true'
```

```json
{
  "createdAt": "2026-10-28T21:17:57.113567Z",
  "description": "What shipped and when.",
  "id": "01a18460-77f9-72da-853d-170e20399120",
  "name": "Releases",
  "posts": {
    "docs": [
      {
        "id": "01a1845f-afdb-75d9-af23-79cecf8ebabc",
        "title": "Shipping v0.1.0"
      },
      {
        "id": "01a1845f-604d-76c4-952d-ed9cb379a8f6",
        "title": "Hello, world"
      }
    ],
    "hasNextPage": false
  },
  "status": "published",
  "updatedAt": "2026-10-28T21:17:57.113567Z"
}
```

Joined documents are populated like links: in full at the default `depth=1`, as IDs at `depth=0`. Documents the caller can't read are left out.

### Join options in the schema

| Option | Does |
|---|---|
| `collection` | The collection whose documents link here. |
| `on` | The relationship field in that collection, such as `category` or `meta.category`. |
| `where` | A filter that always applies, written like a `where` query. See [A join with a filter](#a-join-with-a-filter). |
| `defaultLimit` | Documents per page. Defaults to 10. |
| `defaultSort` | A field to sort by, `-` for descending. Defaults to newest first. |

Globals can't have join fields, since nothing links to a global.

### A join with a filter

A join's `where` narrows it to some of the linking documents. In this separate, smaller run, `posts` has a `kind` select, and a category's `notes` join lists only its notes:

```json
{"name": "notes", "type": "join", "collection": "posts", "on": "category", "where": {"kind": {"equals": "note"}}}
```

The category has three posts, one of them an article. Only the two notes appear:

```sh
curl -g 'localhost:3000/api/categories/01a1847b-a927-7758-9cb2-e274b3b13cd6?populate[posts][title]=true&populate[posts][kind]=true'
```

```json
{
  "createdAt": "2026-10-28T21:47:39.175693Z",
  "id": "01a1847b-a927-7758-9cb2-e274b3b13cd6",
  "name": "Engineering",
  "notes": {
    "docs": [
      {
        "id": "01a1847b-a957-75bc-b9a1-f83019d31a7c",
        "kind": "note",
        "title": "A note on cursors"
      },
      {
        "id": "01a1847b-a939-7415-b848-0e000dd2b6d1",
        "kind": "note",
        "title": "Why Postgres"
      }
    ],
    "hasNextPage": false
  },
  "status": "published",
  "updatedAt": "2026-10-28T21:47:39.175693Z"
}
```

### Join options per request

Shape each join with `joins[field][option]`:

| Option | Does |
|---|---|
| `limit` | Documents per page, 1 to 100. |
| `page` | Which page. |
| `sort` | A field to sort by, `-` for descending. |
| `where` | A filter, added to the schema's own: `joins[posts][where][kind][equals]=note`. |
| `count` | `true` adds `totalDocs`. |

```sh
curl -g 'localhost:3000/api/categories/01a18460-77f9-72da-853d-170e20399120?joins[posts][limit]=1&joins[posts][sort]=title&joins[posts][count]=true&populate[posts][title]=true'
```

```json
{
  "createdAt": "2026-10-28T21:17:57.113567Z",
  "description": "What shipped and when.",
  "id": "01a18460-77f9-72da-853d-170e20399120",
  "name": "Releases",
  "posts": {
    "docs": [
      {
        "id": "01a1845f-604d-76c4-952d-ed9cb379a8f6",
        "title": "Hello, world"
      }
    ],
    "hasNextPage": true,
    "totalDocs": 2
  },
  "status": "published",
  "updatedAt": "2026-10-28T21:17:57.113567Z"
}
```

A join inside a group goes by its path: `joins[meta.recent][limit]=5` or `joins[meta][recent][limit]=5`. The `near` filter isn't available inside a join.

### Switch joins off

`joins=false` leaves every join field out, which saves the queries when you don't need them:

```sh
curl -g 'localhost:3000/api/categories/01a18460-77f9-72da-853d-170e20399120?joins=false'
```

```json
{
  "createdAt": "2026-10-28T21:17:57.113567Z",
  "description": "What shipped and when.",
  "id": "01a18460-77f9-72da-853d-170e20399120",
  "name": "Releases",
  "status": "published",
  "updatedAt": "2026-10-28T21:17:57.113567Z"
}
```

## Changing the fields they depend on

A schema change that would break a join or virtual field in another collection is refused, such as removing the relationship a join uses. Change or remove the join or virtual field first.
