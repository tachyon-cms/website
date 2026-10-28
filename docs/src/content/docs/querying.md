---
title: Querying
description: Filter, sort and page through documents, and choose which fields come back.
---

`GET /api/{collection}` takes its options as query parameters. The examples here run against the `posts` collection from [Fields](/fields), plus a few more posts.

| Parameter | Does | Default |
|---|---|---|
| `where` | Filters documents. | none |
| `sort` | Orders them by a field. Prefix `-` for descending. | newest first |
| `limit` | Documents per page, up to 100. | 10 |
| `page` | Which page to return. | 1 |
| `after` | Continues from a `nextCursor`. | none |
| `count` | `true` adds `totalDocs`. | `false` |
| `select` | Returns only the fields you name. | every field |
| `depth`, `populate` | Fill in linked documents. See [Relationships](/relationships). | `depth=1` |
| `joins` | Shapes join fields. See [Joins and virtual fields](/joins-and-virtual-fields). | on |

An unknown parameter is a `400`, so a typo can't silently return everything:

```json
{
  "detail": "unknown query parameter `filter`",
  "requestId": "01a18460-432c-76ad-9469-51f162519b54",
  "status": 400,
  "title": "Bad request",
  "type": "about:blank"
}
```

## Filter with `where`

A condition is `where[field][operator]=value`:

```sh
curl -g 'localhost:3000/api/posts?where[kind][equals]=note&select[title]=true&select[kind]=true'
```

```json
{
  "docs": [
    {
      "id": "01a18460-2e36-717f-b7a6-1104c8bd07c0",
      "kind": "note",
      "title": "A note on cursors"
    },
    {
      "id": "01a18460-2e13-7498-b01b-cacc0d6880ee",
      "kind": "note",
      "title": "Why Postgres"
    }
  ],
  "hasNextPage": false,
  "limit": 10,
  "page": 1
}
```

### Operators

| Operator | Matches | Works on |
|---|---|---|
| `equals`, `not_equals` | The exact value. | text, numbers, dates, checkboxes |
| `in`, `not_in` | Any of up to 100 comma-separated values: `where[kind][in]=article,note`. | text, numbers, dates |
| `gt`, `gte`, `lt`, `lte` | Greater or less than. | numbers, dates |
| `like` | Text that contains the value, ignoring case. | text |
| `contains` | A list that holds the value. | lists (`hasMany`, `multiple`) |
| `exists` | `true` when the field has a value, `false` when it doesn't. | any field |
| `near` | Points by distance. See [Near a point](#near-a-point). | `point` |

"Text" covers every field stored as text: `text`, `textarea`, `email`, `url`, `select`, `radio`, `slug` and `code`. `id`, `createdAt` and `updatedAt` can be filtered too, though not with `like` or `exists`.

`like` finds the value anywhere in the text:

```sh
curl -g 'localhost:3000/api/posts?where[title][like]=note&select[title]=true'
```

```json
{
  "docs": [
    {
      "id": "01a18460-2e36-717f-b7a6-1104c8bd07c0",
      "title": "A note on cursors"
    }
  ],
  "hasNextPage": false,
  "limit": 10,
  "page": 1
}
```

`contains` looks inside a list:

```sh
curl -g 'localhost:3000/api/posts?where[tags][contains]=rust&select[title]=true&select[tags]=true'
```

```json
{
  "docs": [
    {
      "id": "01a18460-2e24-77e1-ae5a-a9f372117037",
      "tags": [
        "rust",
        "security"
      ],
      "title": "Access rules in SQL"
    }
  ],
  "hasNextPage": false,
  "limit": 10,
  "page": 1
}
```

An operator that doesn't fit the field is a `400` naming the parameter:

```json
{
  "detail": "where[kind][gt]: gt can't be used on this field",
  "requestId": "01a18460-4316-73ba-94e6-d3a5a7307070",
  "status": 400,
  "title": "Bad request",
  "type": "about:blank"
}
```

So is a field that doesn't exist:

```json
{
  "detail": "where[colour][equals]: unknown field `colour`",
  "requestId": "01a18460-4322-7565-b6c1-9e7a9b1737c3",
  "status": 400,
  "title": "Bad request",
  "type": "about:blank"
}
```

### Combine conditions

Several conditions in one `where` must all match. For "either", put numbered groups under `or`; `and` works the same way:

```sh
curl -g 'localhost:3000/api/posts?where[or][0][kind][equals]=note&where[or][1][publishedOn][gte]=2026-10-27&select[title]=true'
```

```json
{
  "docs": [
    {
      "id": "01a18460-2e36-717f-b7a6-1104c8bd07c0",
      "title": "A note on cursors"
    },
    {
      "id": "01a18460-2e13-7498-b01b-cacc0d6880ee",
      "title": "Why Postgres"
    },
    {
      "id": "01a1845f-afdb-75d9-af23-79cecf8ebabc",
      "title": "Shipping v0.1.0"
    }
  ],
  "hasNextPage": false,
  "limit": 10,
  "page": 1
}
```

A filter can hold up to 50 conditions, nested up to 5 levels deep.

### Into groups, lists and links

Use a dotted path to reach a field in a group (`where[seo.title][like]=release`) or in every row of an array (`where[links.url][like]=github`). Through a relationship, the path continues into the linked document: `where[category.name][equals]=Releases`. See [Relationships](/relationships#filter-through-a-link).

### Near a point

`near` takes `longitude,latitude`, optionally followed by a maximum and a minimum distance in metres. Results come back nearest first. Here are the places within 5 km of Westminster:

```sh
curl -g 'localhost:3000/api/places?where[location][near]=-0.1246,51.5007,5000&select[name]=true'
```

```json
{
  "docs": [
    {
      "id": "01a18460-5b75-7571-b2b9-0d1e4e9c3092",
      "name": "Tate Modern"
    },
    {
      "id": "01a18460-5b82-74d8-94e8-3b935909d24c",
      "name": "British Museum"
    }
  ],
  "hasNextPage": false,
  "limit": 10,
  "page": 1
}
```

Kew Gardens, about 12 km away, is left out. Page through `near` results with `page`, not `after`.

## Sort

`sort` takes one field; a leading `-` reverses it. Documents with no value for the field come last. Without `sort`, lists are newest first.

## Page through results

There are two ways to page.

**By page number.** `limit` sets the page size and `page` picks the page. Add `count=true` for the total:

```sh
curl -g 'localhost:3000/api/posts?sort=-publishedOn&limit=2&count=true&select[title]=true&select[publishedOn]=true'
```

```json
{
  "docs": [
    {
      "id": "01a1845f-afdb-75d9-af23-79cecf8ebabc",
      "publishedOn": "2026-10-27",
      "title": "Shipping v0.1.0"
    },
    {
      "id": "01a18460-2e36-717f-b7a6-1104c8bd07c0",
      "publishedOn": "2026-10-25",
      "title": "A note on cursors"
    }
  ],
  "hasNextPage": true,
  "limit": 2,
  "nextCursor": "5b22323032362d31302d3235222c2230316131383436302d326533362d373137662d623761362d313130346338626430376330225d",
  "page": 1,
  "totalDocs": 5
}
```

**By cursor.** Pass `nextCursor` back as `after`, with the same `sort`, to get the documents after the last one you saw. Cursors stay correct when documents are added between requests, which page numbers can't promise:

```sh
curl -g 'localhost:3000/api/posts?sort=-publishedOn&limit=2&after=5b22323032362d31302d3235222c2230316131383436302d326533362d373137662d623761362d313130346338626430376330225d&select[title]=true&select[publishedOn]=true'
```

```json
{
  "docs": [
    {
      "id": "01a18460-2e24-77e1-ae5a-a9f372117037",
      "publishedOn": "2026-10-24",
      "title": "Access rules in SQL"
    },
    {
      "id": "01a18460-2e13-7498-b01b-cacc0d6880ee",
      "publishedOn": "2026-10-20",
      "title": "Why Postgres"
    }
  ],
  "hasNextPage": true,
  "limit": 2,
  "nextCursor": "5b22323032362d31302d3230222c2230316131383436302d326531332d373439382d623031622d636163633064363838306565225d"
}
```

Treat a cursor as opaque, and use it only with the sort it came from. `page` and `after` can't be combined.

## Choose the fields with `select`

`select[field]=true` returns only the fields you name, plus `id`. Every example on this page uses it to keep the responses short. For a field inside a group, nest the brackets: `select[seo][title]=true`.

To trim the documents a relationship fills in, use `populate`. See [Relationships](/relationships#trim-populated-documents).

## Filters and access

Filters never reveal what you can't read. A document an [access rule](/access-rules) hides from you isn't matched, even through a relationship, and filtering or sorting on a field you can't read is a `403`.
