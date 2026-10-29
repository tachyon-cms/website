---
title: Users and roles API
description: The user and role endpoints in TachyonCMS v0.1.0.
sidebar:
  label: Users and roles
---

Part of the [HTTP API](/reference/http-api) reference. [Requests and responses](/reference/http-api#requests-and-responses) covers what every endpoint shares, and [Who can call what](/reference/http-api#who-can-call-what) explains the **Who** rows.

## Users

A user is an account (email, role, password) plus a profile document in the built-in `users` collection. See [Manage users](/roles#manage-users).

### `GET /api/users`

Lists users, with each one's email and role added to their profile.

| | |
|---|---|
| Who | `users` ability |
| Query | The [list parameters](/reference/http-api/documents#get-apicollection) of any collection |
| Returns | `200` and a page of users, shaped like any list |
| Errors | `400` a bad parameter; `401`; `403` |

```sh
curl -g 'localhost:3000/api/users?select[name]=true' -H "authorization: Bearer $TOKEN"
```

```json
{
  "docs": [
    {
      "email": "ann@example.com",
      "id": "01a18491-0224-77b7-b789-10e9e8eb6fd8",
      "name": "Ann",
      "role": "author"
    },
    {
      "email": "ada@example.com",
      "id": "01a18491-00f3-720f-af03-776242b88d3c",
      "name": "Ada",
      "role": "admin"
    }
  ],
  "hasNextPage": false,
  "limit": 10,
  "page": 1
}
```

### `POST /api/users`

Creates a user. The body mixes account keys with the profile's fields.

| | |
|---|---|
| Who | `users` ability |
| Returns | `201` and the user |
| Errors | `401`; `403` (including a field rule refusing a profile field); `409` the email is taken; `422` a bad email, password, role or profile field |

| Field | Type | Default | Description |
|---|---|---|---|
| `email` | string | none | Required. |
| `password` | string | none | Required. 12 to 256 characters, not known from a data breach. |
| `role` | string | `viewer` | A role slug that exists. |
| Profile fields | | | The fields of the `users` collection. `name` is required. |

```sh
curl -X POST localhost:3000/api/users \
  -H "authorization: Bearer $TOKEN" \
  -H 'content-type: application/json' \
  -d '{"email": "ann@example.com", "password": "violet-orbit-lantern-42-ann", "name": "Ann", "role": "author"}'
```

```json
{
  "createdAt": "2026-10-28T22:10:58.212141Z",
  "email": "ann@example.com",
  "id": "01a18491-0224-77b7-b789-10e9e8eb6fd8",
  "name": "Ann",
  "role": "author",
  "status": "published",
  "updatedAt": "2026-10-28T22:10:58.212141Z"
}
```

### `GET /api/users/{id}`

Reads one user, with email and role.

| | |
|---|---|
| Who | Signed in as that user, or `users` ability |
| Returns | `200` and the user |
| Errors | `401`; `403 You can only see and change your own account.`; `404` |

```sh
curl localhost:3000/api/users/01a18491-0224-77b7-b789-10e9e8eb6fd8 -H "authorization: Bearer $TOKEN"
```

The response has the same shape as [`POST /api/users`](#post-apiusers).

### `PATCH /api/users/{id}`

Changes a user's profile fields and account. Profile fields merge like a document [`PATCH`](/reference/http-api/documents#patch-apicollectionid). Everything is checked before anything is saved.

| | |
|---|---|
| Who | Signed in as that user, or `users` ability |
| Returns | `200` and the user |
| Errors | `401`; `403` another user's account, a role or password change without the `users` ability, an email change without `currentPassword`, or a field rule; `404`; `409` the email can't be used, or the last Admin would lose the role; `422` |

| Field | Type | Default | Description |
|---|---|---|---|
| `email` | string | unchanged | A new email. Changing your own also needs `currentPassword`. |
| `currentPassword` | string | none | Your password, to confirm an email change. |
| `role` | string | unchanged | A role slug. Needs the `users` ability. |
| `password` | string | unchanged | A new password. Needs the `users` ability, and ends the user's other sessions. Change your own with [`POST /api/auth/password`](/reference/http-api/auth#post-apiauthpassword). |
| Profile fields | | unchanged | Fields of the `users` collection. `null` clears one. |

```sh
curl -X PATCH localhost:3000/api/users/01a18491-0224-77b7-b789-10e9e8eb6fd8 \
  -H "authorization: Bearer $TOKEN" \
  -H 'content-type: application/json' \
  -d '{"role": "editor"}'
```

```json
{
  "createdAt": "2026-10-28T22:10:58.212141Z",
  "email": "ann@example.com",
  "id": "01a18491-0224-77b7-b789-10e9e8eb6fd8",
  "name": "Ann",
  "role": "editor",
  "status": "published",
  "updatedAt": "2026-10-28T22:10:58.212141Z"
}
```

### `DELETE /api/users/{id}`

Deletes a user and ends their sessions and API keys.

| | |
|---|---|
| Who | `users` ability |
| Returns | `204` |
| Errors | `401`; `403`; `404`; `409` the last Admin, or other documents link to the user |

```sh
curl -X DELETE localhost:3000/api/users/01a18491-0224-77b7-b789-10e9e8eb6fd8 \
  -H "authorization: Bearer $TOKEN"
```

## Roles

A role is a slug, a name and three abilities. See [Roles](/roles).

| Ability | Type | Values |
|---|---|---|
| `content` | string | `all`: create, change and delete any document, and change globals. `own`: create, and change or delete only what you created. `read`: read only. |
| `schemas` | boolean | Change content types. |
| `users` | boolean | Manage users, roles and admin-scoped keys. |

### `GET /api/admin/roles`

Lists the built-in and custom roles.

| | |
|---|---|
| Who | Signed in |
| Returns | `200` and `{"docs": [...]}`, each with `slug`, `name`, `builtin` and `abilities` |
| Errors | `401`; `403` a key without the `admin` scope |

```sh
curl localhost:3000/api/admin/roles -H "authorization: Bearer $TOKEN"
```

Trimmed to the first role of four:

```json
{
  "docs": [
    {
      "abilities": {
        "content": "all",
        "schemas": true,
        "users": true
      },
      "builtin": true,
      "name": "Admin",
      "slug": "admin"
    }
  ]
}
```

### `POST /api/admin/roles`

Adds a custom role.

| | |
|---|---|
| Who | `users` ability |
| Returns | `201` and the role |
| Errors | `401`; `403`; `409` the slug exists; `422` a bad slug or empty name |

| Field | Type | Default | Description |
|---|---|---|---|
| `slug` | string | none | Required. Lowercase letters, digits and underscores, starting with a letter, up to 64 characters. |
| `name` | string | none | Required. |
| `abilities` | object | none | Required, with all three of `content`, `schemas` and `users`. |

```sh
curl -X POST localhost:3000/api/admin/roles \
  -H "authorization: Bearer $TOKEN" \
  -H 'content-type: application/json' \
  -d '{"slug": "reviewer", "name": "Reviewer", "abilities": {"content": "read", "schemas": false, "users": false}}'
```

```json
{
  "abilities": {
    "content": "read",
    "schemas": false,
    "users": false
  },
  "builtin": false,
  "name": "Reviewer",
  "slug": "reviewer"
}
```

### `PUT /api/admin/roles/{slug}`

Replaces a custom role's name and abilities. Built-in roles can't be changed.

| | |
|---|---|
| Who | `users` ability |
| Returns | `200` and the role |
| Errors | `401`; `403`; `404`; `409` a built-in role; `422` an empty name |

| Field | Type | Default | Description |
|---|---|---|---|
| `name` | string | none | Required. |
| `abilities` | object | none | Required, with all three abilities. |

```sh
curl -X PUT localhost:3000/api/admin/roles/reviewer \
  -H "authorization: Bearer $TOKEN" \
  -H 'content-type: application/json' \
  -d '{"name": "Reviewer", "abilities": {"content": "own", "schemas": false, "users": false}}'
```

```json
{
  "abilities": {
    "content": "own",
    "schemas": false,
    "users": false
  },
  "builtin": false,
  "name": "Reviewer",
  "slug": "reviewer"
}
```

### `DELETE /api/admin/roles/{slug}`

Removes a custom role that no user has and no access rule names.

| | |
|---|---|
| Who | `users` ability |
| Returns | `204` |
| Errors | `401`; `403`; `404`; `409` a built-in role, a role someone has, or one an access rule names |

```sh
curl -X DELETE localhost:3000/api/admin/roles/reviewer -H "authorization: Bearer $TOKEN"
```
