---
title: API keys
description: Make scoped API keys for websites and servers, and rotate or revoke them.
---

An API key lets a website, a build step or a server call TachyonCMS without a person signing in. A key acts as the user who made it, narrowed by its **scopes**: it can never do more than its owner's role and the [access rules](/access-rules) allow.

## Make a key

Keys are made from a signed-in session, never with another key, so a leaked key can't mint more. `POST /api/auth/keys` with a `name` and at least one scope:

```sh
curl -X POST localhost:3000/api/auth/keys \
  -H "authorization: Bearer $TOKEN" \
  -H 'content-type: application/json' \
  -d '{"name": "website", "scopes": ["posts:read"]}'
```

```json
{
  "createdAt": "2026-10-28T21:18:49.230955Z",
  "expiresAt": null,
  "id": "01a18461-438e-7037-aefb-b61210715c00",
  "key": "tcy_wwoe1gba_…",
  "lastUsedAt": null,
  "name": "website",
  "prefix": "wwoe1gba",
  "scopes": [
    "posts:read"
  ]
}
```

`key` is shown this once. TachyonCMS stores only a hash of it, so copy it now. A key looks like `tcy_<prefix>_<secret>`; the prefix tells your keys apart in lists and logs.

Add `expiresAt`, an RFC 3339 date-time in the future, for a key that stops working on its own:

```sh
curl -X POST localhost:3000/api/auth/keys \
  -H "authorization: Bearer $TOKEN" \
  -H 'content-type: application/json' \
  -d '{"name": "importer", "scopes": ["posts:write", "categories:read"], "expiresAt": "2027-01-31T00:00:00Z"}'
```

## Scopes

| Scope | Allows |
|---|---|
| `posts:read` | Reading one collection, here `posts`. |
| `posts:write` | Creating, changing and deleting in one collection, which includes reading it. |
| `*:read`, `*:write` | The same, for every collection. |
| `admin` | Everything the owner can do: content types, users and roles too. Only an Admin can make an `admin` key. |

A scope that doesn't fit the pattern is refused:

```json
{
  "errors": [
    {
      "message": "`posts:delete` isn't a scope; use collection:read, collection:write, *:read, *:write or admin",
      "path": "scopes"
    }
  ],
  "requestId": "01a18461-43af-7518-bf3f-147618fa580e",
  "status": 422,
  "title": "Validation failed",
  "type": "about:blank"
}
```

## Use a key

Send it as a bearer token:

```sh
curl -g 'localhost:3000/api/posts?limit=1&select[title]=true' \
  -H 'authorization: Bearer tcy_wwoe1gba_…'
```

Anything outside its scopes is a `403`, whatever the owner's role. Here the `posts:read` key tries to create a post:

```json
{
  "detail": "You don't have permission to do this.",
  "requestId": "01a18461-43d7-77d0-b70b-83bef957e0f7",
  "status": 403,
  "title": "Forbidden",
  "type": "about:blank"
}
```

### Links to users

A key needs a scope that covers `users` (`users:read`, `*:read` or `admin`) to see profiles. Without one, a link to a user stays a bare ID:

```sh
curl -g 'localhost:3000/api/posts/01a1845f-afdb-75d9-af23-79cecf8ebabc?select[title]=true&select[author]=true' \
  -H 'authorization: Bearer tcy_wwoe1gba_…'
```

```json
{
  "author": "01a1845f-156e-7727-ab67-49704587395b",
  "id": "01a1845f-afdb-75d9-af23-79cecf8ebabc",
  "title": "Shipping v0.1.0"
}
```

A filter through that link, such as `where[author.name][equals]=You`, matches nothing for the same key.

## List your keys

`GET /api/auth/keys` lists the keys you made, without their secrets. `lastUsedAt` shows when each was last used:

```sh
curl localhost:3000/api/auth/keys -H "authorization: Bearer $TOKEN"
```

```json
{
  "docs": [
    {
      "createdAt": "2026-10-28T21:18:49.250263Z",
      "expiresAt": "2027-01-31T00:00:00Z",
      "id": "01a18461-43a1-701e-a4c8-6670853af144",
      "lastUsedAt": null,
      "name": "importer",
      "prefix": "bd1bdk1x",
      "scopes": [
        "posts:write",
        "categories:read"
      ]
    },
    {
      "createdAt": "2026-10-28T21:18:49.230955Z",
      "expiresAt": null,
      "id": "01a18461-438e-7037-aefb-b61210715c00",
      "lastUsedAt": null,
      "name": "website",
      "prefix": "wwoe1gba",
      "scopes": [
        "posts:read"
      ]
    }
  ]
}
```

## Rotate a key

`POST /api/auth/keys/{id}/rotate` replaces a key with a new one that has the same name, scopes and expiry. The response shows the new key once, with a new `id` and `prefix`:

```sh
curl -X POST localhost:3000/api/auth/keys/01a18461-438e-7037-aefb-b61210715c00/rotate \
  -H "authorization: Bearer $TOKEN"
```

```json
{
  "createdAt": "2026-10-28T21:18:54.501289Z",
  "expiresAt": null,
  "id": "01a18461-5825-71b1-a8c5-a9cb18f289e6",
  "key": "tcy_ov2qkpkt_…",
  "lastUsedAt": null,
  "name": "website",
  "prefix": "ov2qkpkt",
  "scopes": [
    "posts:read"
  ]
}
```

The old key stops working straight away, so deploy the new one before you rotate, or expect a short gap:

```json
{
  "detail": "This API key isn't valid, or has expired or been revoked.",
  "requestId": "01a18461-707c-75ad-94f4-98233e666b6f",
  "status": 401,
  "title": "Unauthorized",
  "type": "about:blank"
}
```

## Revoke a key

`DELETE /api/auth/keys/{id}` revokes a key and answers `204`. Use the current `id`: after a rotation, that's the new one. Deleting a user revokes all of their keys.
