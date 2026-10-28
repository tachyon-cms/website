---
title: Relationships
description: Link documents with relationship fields, get them back populated, and filter through the links.
---

A `relationship` field stores links to documents in other collections. Reads fill those links in with the linked documents, and filters can reach through them.

## Define a relationship

`relationTo` names the collection to link to:

```json
{"name": "author", "type": "relationship", "relationTo": "users"},
{"name": "category", "type": "relationship", "relationTo": "categories"}
```

Those are the two fields this page adds to the `posts` schema from [Fields](/fields), next to a new `categories` collection with a `name` and a `description`. The target collection has to exist when you save the schema, unless it's the collection itself.

| Option | Does |
|---|---|
| `relationTo` | The collection to link to, or a list of them. See [Links to several collections](#links-to-several-collections). |
| `hasMany` | Store a list of links instead of one. |
| `maxDepth` | Populate through this field at most this deep, whatever `depth` a request asks for. |

## Link documents

Send the linked document's ID:

```sh
curl -X PATCH localhost:3000/api/posts/01a1845f-afdb-75d9-af23-79cecf8ebabc \
  -H "authorization: Bearer $TOKEN" \
  -H 'content-type: application/json' \
  -d '{"author": "01a1845f-156e-7727-ab67-49704587395b", "category": "01a18460-77f9-72da-853d-170e20399120"}'
```

An ID that doesn't match a document in the target collection is a `422`:

```json
{
  "errors": [
    {
      "message": "doesn't match any document in the related collection",
      "path": "category"
    }
  ],
  "requestId": "01a18466-e7b9-767f-a6b7-88cf376c132c",
  "status": 422,
  "title": "Validation failed",
  "type": "about:blank"
}
```

A link to a document you can't read gets the same answer, so a write can't be used to find hidden documents.

## Populate with `depth`

`depth` says how many levels of links to fill in, from 0 to 5. The default is 1, so a plain read already includes the linked documents:

```sh
curl -g 'localhost:3000/api/posts/01a1845f-afdb-75d9-af23-79cecf8ebabc?select[title]=true&select[author]=true&select[category]=true'
```

```json
{
  "author": {
    "createdAt": "2026-10-28T21:16:26.350191Z",
    "id": "01a1845f-156e-7727-ab67-49704587395b",
    "name": "You",
    "status": "published",
    "updatedAt": "2026-10-28T21:16:26.350191Z"
  },
  "category": {
    "createdAt": "2026-10-28T21:17:57.113567Z",
    "description": "What shipped and when.",
    "id": "01a18460-77f9-72da-853d-170e20399120",
    "name": "Releases",
    "status": "published",
    "updatedAt": "2026-10-28T21:17:57.113567Z"
  },
  "id": "01a1845f-afdb-75d9-af23-79cecf8ebabc",
  "title": "Shipping v0.1.0"
}
```

`depth=0` returns the IDs as stored:

```sh
curl -g 'localhost:3000/api/posts/01a1845f-afdb-75d9-af23-79cecf8ebabc?depth=0&select[title]=true&select[author]=true&select[category]=true'
```

```json
{
  "author": "01a1845f-156e-7727-ab67-49704587395b",
  "category": "01a18460-77f9-72da-853d-170e20399120",
  "id": "01a1845f-afdb-75d9-af23-79cecf8ebabc",
  "title": "Shipping v0.1.0"
}
```

A link to a document the caller can't read stays a bare ID at any depth.

### Linking to users

A link to `users` populates the person's profile: `name` and any profile fields you've added. Email, role and password never appear. To keep a profile field out of populated links, give it a [field rule](/access-rules#field-rules). An [API key](/api-keys) also needs a scope that covers `users`, or the link stays a bare ID.

## Trim populated documents

`populate[collection][field]=true` picks the fields that come back for every populated document from that collection. It works like [`select`](/querying#choose-the-fields-with-select), one collection at a time:

```sh
curl -g 'localhost:3000/api/posts/01a1845f-afdb-75d9-af23-79cecf8ebabc?select[title]=true&select[category]=true&populate[categories][name]=true'
```

```json
{
  "category": {
    "id": "01a18460-77f9-72da-853d-170e20399120",
    "name": "Releases"
  },
  "id": "01a1845f-afdb-75d9-af23-79cecf8ebabc",
  "title": "Shipping v0.1.0"
}
```

To set that trim once for every request, give the linked collection a `defaultPopulate` in its schema. With `"defaultPopulate": {"name": true}` on `categories`, the same read without `populate` returns:

```json
{
  "category": {
    "id": "01a18460-77f9-72da-853d-170e20399120",
    "name": "Releases"
  },
  "id": "01a1845f-afdb-75d9-af23-79cecf8ebabc",
  "title": "Shipping v0.1.0"
}
```

A `populate` in the request takes the place of the default.

## Links to several collections

Give `relationTo` a list and each link names its collection. This field links a post to other posts and to places:

```json
{"name": "related", "type": "relationship", "relationTo": ["posts", "places"], "hasMany": true}
```

Send each link as `relationTo` and `value`:

```sh
curl -X PATCH localhost:3000/api/posts/01a1845f-afdb-75d9-af23-79cecf8ebabc \
  -H "authorization: Bearer $TOKEN" \
  -H 'content-type: application/json' \
  -d '{"related": [
        {"relationTo": "posts", "value": "01a18460-2e24-77e1-ae5a-a9f372117037"},
        {"relationTo": "places", "value": "01a18460-5b75-7571-b2b9-0d1e4e9c3092"}
      ]}'
```

Reads keep the same shape, with `value` populated:

```sh
curl -g 'localhost:3000/api/posts/01a1845f-afdb-75d9-af23-79cecf8ebabc?select[title]=true&select[related]=true&populate[posts][title]=true&populate[places][name]=true' \
  -H "authorization: Bearer $TOKEN"
```

```json
{
  "id": "01a1845f-afdb-75d9-af23-79cecf8ebabc",
  "related": [
    {
      "relationTo": "posts",
      "value": {
        "id": "01a18460-2e24-77e1-ae5a-a9f372117037",
        "title": "Access rules in SQL"
      }
    },
    {
      "relationTo": "places",
      "value": {
        "id": "01a18460-5b75-7571-b2b9-0d1e4e9c3092",
        "name": "Tate Modern"
      }
    }
  ],
  "title": "Shipping v0.1.0"
}
```

Ask for the same post without signing in, after the [access rules](/access-rules) example has hidden unpublished posts, and the linked post that isn't published stays a bare ID:

```json
{
  "id": "01a1845f-afdb-75d9-af23-79cecf8ebabc",
  "related": [
    {
      "relationTo": "posts",
      "value": "01a18460-2e24-77e1-ae5a-a9f372117037"
    },
    {
      "relationTo": "places",
      "value": {
        "id": "01a18460-5b75-7571-b2b9-0d1e4e9c3092",
        "name": "Tate Modern"
      }
    }
  ],
  "title": "Shipping v0.1.0"
}
```

## Filter through a link

A dotted path in `where` continues into the linked document:

```sh
curl -g 'localhost:3000/api/posts?where[category.name][equals]=Releases&select[title]=true'
```

```json
{
  "docs": [
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

A path can pass through up to three relationships. Documents the caller can't read never match, so a filter can't be used to probe hidden documents.

## What links here

`GET /api/{collection}/{id}/references` lists the documents that link to one:

```sh
curl localhost:3000/api/categories/01a18460-77f9-72da-853d-170e20399120/references
```

```json
{
  "docs": [
    {
      "collection": "posts",
      "id": "01a1845f-afdb-75d9-af23-79cecf8ebabc",
      "path": "category"
    }
  ]
}
```

A document that others link to can't be deleted until those links are removed:

```sh
curl -X DELETE localhost:3000/api/categories/01a18460-77f9-72da-853d-170e20399120 \
  -H "authorization: Bearer $TOKEN"
```

```json
{
  "detail": "1 other document links to this one; remove that link first",
  "requestId": "01a18460-8fc3-71d9-9a26-4b819c36f90c",
  "status": 409,
  "title": "Conflict",
  "type": "about:blank"
}
```

Only an Admin whose credential isn't narrowed by key scopes sees the count. Everyone else is told only that other documents link to it.

To show linked documents on every read instead, use a [join field](/joins-and-virtual-fields#join-fields).
