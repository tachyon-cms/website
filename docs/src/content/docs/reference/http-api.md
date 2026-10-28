---
title: HTTP API
description: Every endpoint in TachyonCMS v0.1.0, with who can call it, its parameters, its response and its errors.
---

Every endpoint TachyonCMS v0.1.0 serves, one section each. The guides explain the ideas behind them: [Sign-in](/sign-in), [API keys](/api-keys), [Roles](/roles), [Content types](/content-types), [Querying](/querying) and [Access rules](/access-rules).

## Requests and responses

- Every path starts with `/api`. The examples call `localhost:3000` and send `$TOKEN`, the Admin's bearer token from [`POST /api/auth/login`](#post-apiauthlogin), or `$AUTHOR_TOKEN`, an Author's.
- Request bodies are JSON with `content-type: application/json`, up to 10 MB.
- Responses are JSON. Errors are `application/problem+json`; see [Errors](/reference/errors).
- Every response carries an `x-request-id` header.
- A request that runs for more than 30 seconds is stopped with a `503`.
- Documents come back with `id`, `createdAt`, `updatedAt` and `status` (always `"published"` in v0.1.0) besides their fields. Keys are in alphabetical order.

### Credentials

Send one of these, or nothing:

| Credential | How | Notes |
|---|---|---|
| Session cookie | `__Host-tachyon_session`, set by sign-in | For browsers. A change (any method but `GET`, `HEAD` or `OPTIONS`) must also send an `Origin` matching [`public_url`](/reference/config#top-level-keys) or `allowed_origins`, or it's a `403`. An expired cookie counts as signed out. |
| Session token | `authorization: Bearer tcs_…` | From sign-in with `"bearer": true`. An ended session is a `401`. |
| API key | `authorization: Bearer tcy_…` | From [`POST /api/auth/keys`](#post-apiauthkeys). Acts as its owner, narrowed by its scopes. |

### Who can call what

The **Who** row of each endpoint uses these terms:

| Term | Means |
|---|---|
| Anyone | No credentials needed. Read rules still decide what comes back. |
| Signed in | A session, or an API key with the `admin` scope. Other keys get a `403`. |
| Session | A session only. API keys get a `403`. |
| `users` ability | A role with `users: true` (Admin by default). Keys also need the `admin` scope. A role with this ability can do everything an Admin can. |
| `schemas` ability | A role with `schemas: true` (Admin by default). Keys also need the `admin` scope. |
| Content | The role's `content` ability, the collection's [access rules](/access-rules) and, for a key, its [scopes](/api-keys#scopes). |

Signed out, a refusal is a `401 Sign in first.`; signed in, it's a `403`.

Any endpoint can also return `400` for a body that isn't JSON, `401` for credentials that don't work, `413`, `500` and `503`. The **Errors** rows list the rest.

## All endpoints

| Method and path | Does | Who |
|---|---|---|
| [`GET /api/setup`](#get-apisetup) | Says whether setup is needed. | Anyone |
| [`POST /api/setup`](#post-apisetup) | Creates the first Admin. | Anyone, once |
| [`POST /api/auth/login`](#post-apiauthlogin) | Signs in. | Anyone |
| [`POST /api/auth/logout`](#post-apiauthlogout) | Signs out. | Session |
| [`GET /api/auth/me`](#get-apiauthme) | Returns your account. | Signed in |
| [`GET /api/auth/sessions`](#get-apiauthsessions) | Lists your sessions. | Signed in |
| [`DELETE /api/auth/sessions/{id}`](#delete-apiauthsessionsid) | Ends one of your sessions. | Signed in |
| [`POST /api/auth/password`](#post-apiauthpassword) | Changes your password. | Session |
| [`GET /api/auth/keys`](#get-apiauthkeys) | Lists your API keys. | Session |
| [`POST /api/auth/keys`](#post-apiauthkeys) | Makes an API key. | Session |
| [`DELETE /api/auth/keys/{id}`](#delete-apiauthkeysid) | Revokes an API key. | Session |
| [`POST /api/auth/keys/{id}/rotate`](#post-apiauthkeysidrotate) | Replaces an API key. | Session |
| [`GET /api/users`](#get-apiusers) | Lists users. | `users` ability |
| [`POST /api/users`](#post-apiusers) | Creates a user. | `users` ability |
| [`GET /api/users/{id}`](#get-apiusersid) | Reads a user. | Yourself, or `users` ability |
| [`PATCH /api/users/{id}`](#patch-apiusersid) | Changes a user. | Yourself, or `users` ability |
| [`DELETE /api/users/{id}`](#delete-apiusersid) | Deletes a user. | `users` ability |
| [`GET /api/admin/roles`](#get-apiadminroles) | Lists roles. | Signed in |
| [`POST /api/admin/roles`](#post-apiadminroles) | Adds a role. | `users` ability |
| [`PUT /api/admin/roles/{slug}`](#put-apiadminrolesslug) | Changes a custom role. | `users` ability |
| [`DELETE /api/admin/roles/{slug}`](#delete-apiadminrolesslug) | Removes a custom role. | `users` ability |
| [`GET /api/admin/collections`](#get-apiadmincollections) | Lists content types. | Signed in |
| [`POST /api/admin/collections`](#post-apiadmincollections) | Creates a content type. | `schemas` ability |
| [`GET /api/admin/collections/{slug}`](#get-apiadmincollectionsslug) | Reads a content type. | Signed in |
| [`PUT /api/admin/collections/{slug}`](#put-apiadmincollectionsslug) | Changes a content type. | `schemas` ability |
| [`POST /api/admin/collections/{slug}/preview`](#post-apiadmincollectionsslugpreview) | Previews a change. | `schemas` ability |
| [`GET /api/access`](#get-apiaccess) | Says what you may do. | Anyone |
| [`GET /api/globals/{slug}`](#get-apiglobalsslug) | Reads a global. | Content |
| [`PATCH /api/globals/{slug}`](#patch-apiglobalsslug) | Changes a global. | Content |
| [`GET /api/{collection}`](#get-apicollection) | Lists documents. | Content |
| [`POST /api/{collection}`](#post-apicollection) | Creates a document. | Content |
| [`GET /api/{collection}/{id}`](#get-apicollectionid) | Reads a document. | Content |
| [`PATCH /api/{collection}/{id}`](#patch-apicollectionid) | Changes a document. | Content |
| [`DELETE /api/{collection}/{id}`](#delete-apicollectionid) | Deletes a document. | Content |
| [`GET /api/{collection}/{id}/references`](#get-apicollectionidreferences) | Lists documents that link here. | Content |

## Setup and sign-in

### `GET /api/setup`

Says whether the server is waiting for its first Admin.

| | |
|---|---|
| Who | Anyone |
| Returns | `200` and `{"needed": true}` until the first account exists, then `false`. |

```sh
curl localhost:3000/api/setup
```

```json
{
  "needed": true
}
```

### `POST /api/setup`

Creates the first account, with the Admin role. Works once.

| | |
|---|---|
| Who | Anyone, while no account exists |
| Returns | `201` and the new user |
| Errors | `409` setup already done; `422` bad email, empty name, or a password that breaks the [password rules](/sign-in#password-rules) |

| Field | Type | Default | Description |
|---|---|---|---|
| `email` | string | none | Required. The Admin's email address. |
| `name` | string | none | Required. Their name. |
| `password` | string | none | Required. 12 to 256 characters, not known from a data breach. |

```sh
curl -X POST localhost:3000/api/setup \
  -H 'content-type: application/json' \
  -d '{"email": "ada@example.com", "name": "Ada", "password": "violet-orbit-lantern-42"}'
```

```json
{
  "createdAt": "2026-10-28T22:10:57.906605Z",
  "email": "ada@example.com",
  "id": "01a18491-00f3-720f-af03-776242b88d3c",
  "name": "Ada",
  "role": "admin",
  "status": "published",
  "updatedAt": "2026-10-28T22:10:57.906605Z"
}
```

### `POST /api/auth/login`

Signs in with an email and password. Always sets the session cookie; returns the token as well when asked.

| | |
|---|---|
| Who | Anyone |
| Returns | `200` with `user`, `exp` (when the session ends at the latest) and, with `bearer`, `token`. Sets `__Host-tachyon_session` (`HttpOnly; Secure; SameSite=Strict; Path=/`). |
| Errors | `401 Email or password is wrong.`, for a wrong email, a wrong password or a [locked account](/sign-in#wrong-passwords-and-lockout) alike |

| Field | Type | Default | Description |
|---|---|---|---|
| `email` | string | none | Required. |
| `password` | string | none | Required. |
| `bearer` | boolean | `false` | Also return the session token as `token`, for clients that send `authorization: Bearer`. |

```sh
curl -X POST localhost:3000/api/auth/login \
  -H 'content-type: application/json' \
  -d '{"email": "ada@example.com", "password": "violet-orbit-lantern-42", "bearer": true}'
```

```json
{
  "exp": "2026-11-27T22:10:57.94171605Z",
  "token": "tcs_…",
  "user": {
    "createdAt": "2026-10-28T22:10:57.906605Z",
    "email": "ada@example.com",
    "id": "01a18491-00f3-720f-af03-776242b88d3c",
    "name": "Ada",
    "role": "admin",
    "status": "published",
    "updatedAt": "2026-10-28T22:10:57.906605Z"
  }
}
```

### `POST /api/auth/logout`

Ends the session that sent the request and clears the cookie.

| | |
|---|---|
| Who | Session. An API key gets `401 Sign in first.` |
| Returns | `204`, with `set-cookie: __Host-tachyon_session=; …; Max-Age=0` |
| Errors | `401` not signed in |

```sh
curl -X POST localhost:3000/api/auth/logout -H "authorization: Bearer $TOKEN"
```

### `GET /api/auth/me`

Returns your own account: your profile, email and role.

| | |
|---|---|
| Who | Signed in |
| Returns | `200` and the user |
| Errors | `401`; `403` a key without the `admin` scope |

```sh
curl localhost:3000/api/auth/me -H "authorization: Bearer $TOKEN"
```

```json
{
  "createdAt": "2026-10-28T22:10:57.906605Z",
  "email": "ada@example.com",
  "id": "01a18491-00f3-720f-af03-776242b88d3c",
  "name": "Ada",
  "role": "admin",
  "status": "published",
  "updatedAt": "2026-10-28T22:10:57.906605Z"
}
```

## Sessions and passwords

### `GET /api/auth/sessions`

Lists your live sessions, most recently used first. `current` marks the one making the request.

| | |
|---|---|
| Who | Signed in |
| Returns | `200` and `{"docs": [...]}`, each with `id`, `createdAt`, `lastSeenAt`, `expiresAt`, `userAgent`, `ip` and `current` |
| Errors | `401`; `403` a key without the `admin` scope |

```sh
curl localhost:3000/api/auth/sessions -H "authorization: Bearer $TOKEN"
```

Trimmed to the current session of two:

```json
{
  "docs": [
    {
      "createdAt": "2026-10-28T22:19:54.31366Z",
      "current": true,
      "expiresAt": "2026-11-27T22:19:54.31366Z",
      "id": "01a18499-3049-7410-b4b9-6d94e38ec867",
      "ip": null,
      "lastSeenAt": "2026-10-28T22:19:54.31366Z",
      "userAgent": "curl/8.7.1"
    }
  ]
}
```

### `DELETE /api/auth/sessions/{id}`

Ends one of your sessions, such as one on a lost laptop.

| | |
|---|---|
| Who | Signed in. Only your own sessions. |
| Returns | `204` |
| Errors | `401`; `403` a key without the `admin` scope; `404` no such session of yours |

```sh
curl -X DELETE localhost:3000/api/auth/sessions/01a18491-0248-7582-a154-eccce42dac9b \
  -H "authorization: Bearer $AUTHOR_TOKEN"
```

### `POST /api/auth/password`

Changes your password and ends every other session of yours. The session that sent the request stays signed in.

| | |
|---|---|
| Who | Session |
| Returns | `204` |
| Errors | `401`; `403 Your current password is wrong.`; `403` an API key; `422` a new password that breaks the [password rules](/sign-in#password-rules), at path `new` |

| Field | Type | Default | Description |
|---|---|---|---|
| `current` | string | none | Required. Your password now. |
| `new` | string | none | Required. 12 to 256 characters, not known from a data breach. |

```sh
curl -X POST localhost:3000/api/auth/password \
  -H "authorization: Bearer $AUTHOR_TOKEN" \
  -H 'content-type: application/json' \
  -d '{"current": "violet-orbit-lantern-42-ann", "new": "violet-orbit-lantern-42-ann-2"}'
```

## API keys

Keys are managed from a session, never with another key. See [API keys](/api-keys).

### `GET /api/auth/keys`

Lists your keys that haven't been revoked, newest first. Secrets are never shown again.

| | |
|---|---|
| Who | Session |
| Returns | `200` and `{"docs": [...]}`, each with `id`, `name`, `prefix`, `scopes`, `expiresAt`, `lastUsedAt` and `createdAt` |
| Errors | `401`; `403` an API key |

```sh
curl localhost:3000/api/auth/keys -H "authorization: Bearer $TOKEN"
```

```json
{
  "docs": [
    {
      "createdAt": "2026-10-28T22:10:58.257155Z",
      "expiresAt": null,
      "id": "01a18491-0251-752a-898d-d267ada601a7",
      "lastUsedAt": "2026-10-28T22:10:58.26034Z",
      "name": "Website build",
      "prefix": "zimemut8",
      "scopes": [
        "posts:read"
      ]
    }
  ]
}
```

### `POST /api/auth/keys`

Makes a key that acts as you, narrowed by its scopes. The response holds the secret, as `key`, this once.

| | |
|---|---|
| Who | Session. The `admin` scope also needs the `users` ability. |
| Returns | `201` and the key's details, plus `key`: `tcy_<prefix>_<secret>` |
| Errors | `401`; `403` an API key, or the `admin` scope without the `users` ability; `422` an empty name, a bad scope, or an `expiresAt` in the past |

| Field | Type | Default | Description |
|---|---|---|---|
| `name` | string | none | Required. A label for you. |
| `scopes` | array of strings | none | Required, at least one: `collection:read`, `collection:write`, `*:read`, `*:write` or `admin`. See [Scopes](/api-keys#scopes). |
| `expiresAt` | string | none | An RFC 3339 date-time in the future. The key stops working then. |

```sh
curl -X POST localhost:3000/api/auth/keys \
  -H "authorization: Bearer $TOKEN" \
  -H 'content-type: application/json' \
  -d '{"name": "Website build", "scopes": ["posts:read"]}'
```

```json
{
  "createdAt": "2026-10-28T22:10:58.257155Z",
  "expiresAt": null,
  "id": "01a18491-0251-752a-898d-d267ada601a7",
  "key": "tcy_zimemut8_…",
  "lastUsedAt": null,
  "name": "Website build",
  "prefix": "zimemut8",
  "scopes": [
    "posts:read"
  ]
}
```

### `DELETE /api/auth/keys/{id}`

Revokes one of your keys. It stops working at once.

| | |
|---|---|
| Who | Session. Only your own keys. |
| Returns | `204` |
| Errors | `401`; `403` an API key; `404` no such key of yours, or already revoked |

```sh
curl -X DELETE localhost:3000/api/auth/keys/01a18491-0259-7087-b1de-0cb05e50e8c0 \
  -H "authorization: Bearer $TOKEN"
```

### `POST /api/auth/keys/{id}/rotate`

Replaces a key with a new one with the same name, scopes and expiry. The old key is revoked at once, so deploy the new one straight away.

| | |
|---|---|
| Who | Session. Only your own keys. |
| Returns | `201` and the new key, with a new `id`, `prefix` and `key` |
| Errors | `401`; `403` an API key; `404` no such key of yours, or already revoked |

```sh
curl -X POST localhost:3000/api/auth/keys/01a18491-0251-752a-898d-d267ada601a7/rotate \
  -H "authorization: Bearer $TOKEN"
```

```json
{
  "createdAt": "2026-10-28T22:10:58.265091Z",
  "expiresAt": null,
  "id": "01a18491-0259-7087-b1de-0cb05e50e8c0",
  "key": "tcy_x38q58za_…",
  "lastUsedAt": null,
  "name": "Website build",
  "prefix": "x38q58za",
  "scopes": [
    "posts:read"
  ]
}
```

## Users

A user is an account (email, role, password) plus a profile document in the built-in `users` collection. See [Manage users](/roles#manage-users).

### `GET /api/users`

Lists users, with each one's email and role added to their profile.

| | |
|---|---|
| Who | `users` ability |
| Query | The [list parameters](#get-apicollection) of any collection |
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

Changes a user's profile fields and account. Profile fields merge like a document [`PATCH`](#patch-apicollectionid). Everything is checked before anything is saved.

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
| `password` | string | unchanged | A new password. Needs the `users` ability, and ends the user's other sessions. Change your own with [`POST /api/auth/password`](#post-apiauthpassword). |
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

## Content types

Collections and globals share these routes. A schema is a JSON object:

| Field | Type | Default | Description |
|---|---|---|---|
| `slug` | string | none | Required. Lowercase letters, digits and underscores, starting with a letter, up to 64 characters. Not `access`, `admin`, `auth`, `globals`, `media`, `search`, `graphql`, `plugins` or `setup`. |
| `kind` | string | `collection` | `collection` or `global`. |
| `fields` | array | none | Required. See [Field types](/reference/field-types). |
| `access` | object | none | Collection rules: `read`, `create`, `update`, `delete`. See [Access rules](/access-rules). |
| `defaultPopulate` | object | none | A `select` for documents that populate a link to this collection. Not on globals. See [Relationships](/relationships#trim-populated-documents). |

Every response wraps a schema as `{"id", "schemaVersion", "schema"}`. `schemaVersion` goes up by one with each saved change.

### `GET /api/admin/collections`

Lists every collection and global, including `users`.

| | |
|---|---|
| Who | Signed in |
| Returns | `200` and `{"docs": [...]}` |
| Errors | `401`; `403` a key without the `admin` scope |

```sh
curl localhost:3000/api/admin/collections -H "authorization: Bearer $TOKEN"
```

Trimmed to one of four:

```json
{
  "docs": [
    {
      "id": "01a18491-0157-76da-8f9a-ddbf1b56668a",
      "schema": {
        "fields": [
          {
            "default": "My site",
            "name": "title",
            "type": "text"
          },
          {
            "name": "tagline",
            "type": "text"
          }
        ],
        "kind": "global",
        "slug": "site"
      },
      "schemaVersion": 1
    }
  ]
}
```

### `POST /api/admin/collections`

Creates a collection or global. Its routes work straight away.

| | |
|---|---|
| Who | `schemas` ability |
| Body | A schema |
| Returns | `201`, `{"id", "schemaVersion": 1, "schema"}` |
| Errors | `400` a schema that can't be read, such as an unknown field type; `401`; `403`; `409` the slug exists, or is `users`; `422` a schema that breaks a rule, such as an unknown option or a `relationTo` that doesn't exist |

```sh
curl -X POST localhost:3000/api/admin/collections \
  -H "authorization: Bearer $TOKEN" \
  -H 'content-type: application/json' \
  -d '{"slug": "categories", "fields": [{"name": "name", "type": "text", "required": true, "unique": true}]}'
```

```json
{
  "id": "01a18491-0144-716e-a613-dc3d992652d8",
  "schema": {
    "fields": [
      {
        "name": "name",
        "required": true,
        "type": "text",
        "unique": true
      }
    ],
    "kind": "collection",
    "slug": "categories"
  },
  "schemaVersion": 1
}
```

A schema that breaks a rule names the field:

```json
{
  "errors": [
    {
      "message": "field `title`: unknown option `maxLenght`",
      "path": ""
    }
  ],
  "requestId": "01a18491-014f-7193-a29c-2b1979a58087",
  "status": 422,
  "title": "Validation failed",
  "type": "about:blank"
}
```

### `GET /api/admin/collections/{slug}`

Reads one collection or global.

| | |
|---|---|
| Who | Signed in |
| Returns | `200`, `{"id", "schemaVersion", "schema"}` |
| Errors | `401`; `403` a key without the `admin` scope; `404` |

```sh
curl localhost:3000/api/admin/collections/categories -H "authorization: Bearer $TOKEN"
```

The response has the same shape as [`POST /api/admin/collections`](#post-apiadmincollections).

### `PUT /api/admin/collections/{slug}`

Replaces a content type's schema. A change that keeps every value is saved at once. One that removes or retypes fields, or leaves documents that won't validate, is refused with `409 Confirmation required` until you send it again with `"confirm": true`. See [Change a content type](/content-types#change-a-content-type).

| | |
|---|---|
| Who | `schemas` ability |
| Returns | `200`, `{"collection": {"id", "schemaVersion", "schema"}, "preview": {...}}` |
| Errors | `400`; `401`; `403`; `404`; `409 Confirmation required`, with `preview`; `422` an invalid schema, values that aren't unique for a new `unique`, or a change that would break another collection's join, virtual field or access rule |

| Field | Type | Default | Description |
|---|---|---|---|
| `schema` | object | none | Required. The whole new schema. |
| `renames` | object | `{}` | Fields to rename rather than remove and add, as `{"old": "new"}`. |
| `confirm` | boolean | `false` | Go ahead with a change that loses or retypes data. |

The `preview` object:

| Key | Type | Description |
|---|---|---|
| `diff.changes` | array | Each field added, removed, renamed or changed. |
| `documents` | number | Documents in the collection. |
| `invalid` | number | Documents that won't validate against the new fields. |
| `examples` | array | Up to five of them. |
| `duplicates` | array | `unique` fields whose stored values repeat. |
| `cleared` | number | Documents that lose a link their relationship no longer allows. |
| `indexes` | object | `create` and `drop`: indexes the change builds and removes. |
| `needsConfirmation` | boolean | Whether the change needs `"confirm": true`. |

```sh
curl -X PUT localhost:3000/api/admin/collections/categories \
  -H "authorization: Bearer $TOKEN" \
  -H 'content-type: application/json' \
  -d '{"schema": {"slug": "categories", "fields": [
        {"name": "name", "type": "text", "required": true, "unique": true},
        {"name": "posts", "type": "join", "collection": "posts", "on": "category"}]}}'
```

```json
{
  "collection": {
    "id": "01a18491-0144-716e-a613-dc3d992652d8",
    "schema": {
      "fields": [
        {
          "name": "name",
          "required": true,
          "type": "text",
          "unique": true
        },
        {
          "collection": "posts",
          "name": "posts",
          "on": "category",
          "type": "join"
        }
      ],
      "kind": "collection",
      "slug": "categories"
    },
    "schemaVersion": 2
  },
  "preview": {
    "cleared": 0,
    "diff": {
      "changes": [
        {
          "kind": "join",
          "path": "posts",
          "type": "added"
        }
      ]
    },
    "documents": 0,
    "duplicates": [],
    "examples": [],
    "indexes": {
      "create": [],
      "drop": []
    },
    "invalid": 0,
    "needsConfirmation": false
  }
}
```

### `POST /api/admin/collections/{slug}/preview`

Works out what a `PUT` with the same body would do, and saves nothing.

| | |
|---|---|
| Who | `schemas` ability |
| Body | As for [`PUT`](#put-apiadmincollectionsslug); `confirm` is ignored |
| Returns | `200` and the preview object |
| Errors | As for `PUT`, without the `409 Confirmation required` |

Here `posts` would lose its `tags` field, so the change needs confirming:

```sh
curl -X POST localhost:3000/api/admin/collections/posts/preview \
  -H "authorization: Bearer $TOKEN" \
  -H 'content-type: application/json' \
  -d '{"schema": {"slug": "posts", "fields": [
        {"name": "title", "type": "text", "required": true, "maxLength": 120},
        {"name": "slug", "type": "slug", "from": "title"},
        {"name": "category", "type": "relationship", "relationTo": "categories"}]}}'
```

```json
{
  "cleared": 0,
  "diff": {
    "changes": [
      {
        "kind": "text",
        "path": "tags",
        "type": "removed"
      }
    ]
  },
  "documents": 2,
  "duplicates": [],
  "examples": [],
  "indexes": {
    "create": [],
    "drop": []
  },
  "invalid": 0,
  "needsConfirmation": true
}
```

## Access

### `GET /api/access`

Says what the caller may do with each collection, global and field, and whether they may change schemas and manage users. Use it to decide what a front end shows.

| | |
|---|---|
| Who | Anyone. Signed out is an answer too. |
| Returns | `200` and `{"collections", "globals", "schemas", "users"}` |

Each answer is `true`, `false` or `"conditional"`: allowed for some documents and not others, depending on a rule or on who created them. A collection, global or field with nothing allowed is left out. For `users`, `read` is about profiles where documents link to them, and `create`, `update` and `delete` are about the [`/api/users`](#get-apiusers) routes. See [What am I allowed to do?](/access-rules#what-am-i-allowed-to-do).

As an Author, with the Author's token in `$AUTHOR_TOKEN`, trimmed to `posts` and the global:

```sh
curl localhost:3000/api/access -H "authorization: Bearer $AUTHOR_TOKEN"
```

```json
{
  "collections": {
    "posts": {
      "create": true,
      "delete": "conditional",
      "fields": {
        "title": {
          "create": true,
          "read": true,
          "update": true
        }
      },
      "read": true,
      "update": "conditional"
    }
  },
  "globals": {
    "site": {
      "fields": {
        "tagline": {
          "read": true,
          "update": false
        }
      },
      "read": true,
      "update": false
    }
  },
  "schemas": false,
  "users": false
}
```

The `fields` objects are trimmed to one field each.

## Globals

### `GET /api/globals/{slug}`

Reads a global. Until it's first saved, it shows only its fields' defaults, with no `id` or timestamps.

| | |
|---|---|
| Who | Content: anyone, unless a read rule says otherwise. A key needs a scope for the global's slug. |
| Query | `depth`, `select`, `populate`, as for [`GET /api/{collection}/{id}`](#get-apicollectionid) |
| Returns | `200` and the global |
| Errors | `400`; `401`, `403` a read rule or key scope refuses; `404` no such global |

```sh
curl localhost:3000/api/globals/site
```

```json
{
  "createdAt": "2026-10-28T22:10:58.016665Z",
  "id": "01a18491-0157-76da-8f9a-ddbf1b56668a",
  "status": "published",
  "tagline": "Notes from the build",
  "title": "My site",
  "updatedAt": "2026-10-28T22:10:58.016665Z"
}
```

### `PATCH /api/globals/{slug}`

Changes a global, saving it the first time. Fields merge as for a [document `PATCH`](#patch-apicollectionid). If the global's read or update rule is a filter, a global that has never been saved can't be saved this way, since there's no document for the rule to match.

| | |
|---|---|
| Who | Content: a role whose `content` is `all` (Editor and Admin), or the global's update rule. A key needs `slug:write`. |
| Body | The fields to change |
| Returns | `200` and the global |
| Errors | `401`; `403` the role, a rule, a field rule or a key scope refuses; `404`; `422` |

```sh
curl -X PATCH localhost:3000/api/globals/site \
  -H "authorization: Bearer $TOKEN" \
  -H 'content-type: application/json' \
  -d '{"tagline": "Notes from the build"}'
```

The response is the global, as for `GET`.

## Documents

`{collection}` is a collection's slug. `users` isn't served here: use [`/api/users`](#get-apiusers). A `{id}` that isn't a document ID is a `404`.

### `GET /api/{collection}`

Lists the documents you may read, a page at a time.

| | |
|---|---|
| Who | Content: anyone, unless a read rule says otherwise. A key needs `collection:read`, `collection:write` or a `*` scope. |
| Returns | `200` and a page |
| Errors | `400` a bad parameter; `401`, `403` a read rule or key scope refuses, or a filter or sort on a field you can't read; `404` no such collection |

| Parameter | Type | Default | Description |
|---|---|---|---|
| `where` | filter | none | Conditions to match. See [Filters and sorting](/reference/filters). |
| `sort` | string | newest first | One field; `-` in front for descending. |
| `limit` | integer | `10` | Documents per page, at least 1. Above 100 counts as 100. |
| `page` | integer | `1` | The page, from 1. Not with `after`. |
| `after` | cursor | none | A `nextCursor` from the previous page, with the same `sort`. |
| `count` | `true` or `false` | `false` | Add `totalDocs`. |
| `select` | object | every field | `select[field]=true` for each field to return. `id` always comes back. |
| `depth` | integer, 0 to 5 | `1` | How many levels of links to fill in. See [Relationships](/relationships#populate-with-depth). |
| `populate` | object | none | `populate[collection][field]=true`: the fields of populated documents from that collection. |
| `joins` | `false` or object | on | `joins=false`, or `joins[field][option]=value` with `limit`, `page`, `sort`, `where` or `count`. See [Join options per request](/joins-and-virtual-fields#join-options-per-request). |

Any other parameter is a `400`.

| Response key | Type | Present | Description |
|---|---|---|---|
| `docs` | array | always | The documents. |
| `limit` | number | always | The page size used. |
| `page` | number | without `after` | The page number. |
| `hasNextPage` | boolean | always | Whether more documents follow. |
| `nextCursor` | string | when more follow | Pass it as `after` for the next page. |
| `totalDocs` | number | with `count=true` | How many documents match. |

```sh
curl -g 'localhost:3000/api/posts?select[title]=true&select[slug]=true&limit=1&count=true'
```

```json
{
  "docs": [
    {
      "id": "01a18491-016f-726b-a131-7ffee91892c7",
      "slug": "why-postgres",
      "title": "Why Postgres"
    }
  ],
  "hasNextPage": true,
  "limit": 1,
  "nextCursor": "5b6e756c6c2c2230316131383439312d303136662d373236622d613133312d376666656539313839326337225d",
  "page": 1,
  "totalDocs": 2
}
```

### `POST /api/{collection}`

Creates a document.

| | |
|---|---|
| Who | Content: a signed-in role whose `content` is `all` or `own`, subject to the create rule. A key needs `collection:write` or `*:write`. |
| Body | The document's fields. Fields left out take their `default`. |
| Returns | `201` and the document, with links filled in to depth 1. If a read rule hides it from you, only `{"id"}`. |
| Errors | `401`; `403` the role, a rule, a field rule or a key scope refuses; `404` no such collection; `422` a value that doesn't validate, an unknown field, a link to a document that doesn't exist, or a `unique` value that's taken |

```sh
curl -X POST localhost:3000/api/posts \
  -H "authorization: Bearer $TOKEN" \
  -H 'content-type: application/json' \
  -d '{"title": "Shipping v0.1.0", "category": "01a18491-0169-744b-b4c2-75708f5b1426", "tags": ["release"]}'
```

```json
{
  "category": {
    "createdAt": "2026-10-28T22:10:58.025187Z",
    "id": "01a18491-0169-744b-b4c2-75708f5b1426",
    "name": "Releases",
    "status": "published",
    "updatedAt": "2026-10-28T22:10:58.025187Z"
  },
  "createdAt": "2026-10-28T22:10:58.028741Z",
  "id": "01a18491-016c-7521-861e-dff9974d0737",
  "slug": "shipping-v0-1-0",
  "status": "published",
  "tags": [
    "release"
  ],
  "title": "Shipping v0.1.0",
  "updatedAt": "2026-10-28T22:10:58.028741Z"
}
```

### `GET /api/{collection}/{id}`

Reads one document.

| | |
|---|---|
| Who | Content, as for [`GET /api/{collection}`](#get-apicollection) |
| Query | `depth`, `select`, `populate` and `joins`, as for a list. Any other parameter is a `400`. |
| Returns | `200` and the document |
| Errors | `400`; `401`, `403` a read rule or key scope refuses; `404` no such document, or one a read rule hides |

```sh
curl 'localhost:3000/api/posts/01a18491-016c-7521-861e-dff9974d0737?depth=0'
```

```json
{
  "category": "01a18491-0169-744b-b4c2-75708f5b1426",
  "createdAt": "2026-10-28T22:10:58.028741Z",
  "id": "01a18491-016c-7521-861e-dff9974d0737",
  "slug": "shipping-v0-1-0",
  "status": "published",
  "tags": [
    "release"
  ],
  "title": "Shipping v0.1.0",
  "updatedAt": "2026-10-28T22:10:58.028741Z"
}
```

### `PATCH /api/{collection}/{id}`

Changes a document. What you send is merged into what's stored: a field inside a group changes on its own, a list is replaced whole, and `null` clears a field. See [Updating](/fields#updating-send-only-what-changed).

| | |
|---|---|
| Who | Content: a role whose `content` is `all`, or `own` for documents you created, subject to the update rule. A key needs `collection:write` or `*:write`. |
| Body | The fields to change |
| Returns | `200` and the document, with links filled in to depth 1. If a read rule now hides it from you, only `{"id"}`. |
| Errors | `401`; `403 You can only change documents you created.`, `403 An access rule doesn't let you change this document.`, or a field rule or key scope refuses; `404`; `409` the collection's fields changed during the request; `422` |

```sh
curl -X PATCH localhost:3000/api/posts/01a18491-016c-7521-861e-dff9974d0737 \
  -H "authorization: Bearer $TOKEN" \
  -H 'content-type: application/json' \
  -d '{"tags": ["release", "rust"]}'
```

The response is the whole document, as for `POST`, with `tags` now `["release", "rust"]` and a new `updatedAt`.

### `DELETE /api/{collection}/{id}`

Deletes a document. A document other documents link to can't be deleted until those links are removed.

| | |
|---|---|
| Who | Content, as for `PATCH`, subject to the delete rule |
| Returns | `204` |
| Errors | `401`; `403`; `404`; `409` other documents link here |

```sh
curl -X DELETE localhost:3000/api/posts/01a18491-016f-726b-a131-7ffee91892c7 \
  -H "authorization: Bearer $TOKEN"
```

A document something links to:

```json
{
  "detail": "1 other document links to this one; remove that link first",
  "requestId": "01a18491-0194-77f6-a302-15a0e69572e9",
  "status": 409,
  "title": "Conflict",
  "type": "about:blank"
}
```

### `GET /api/{collection}/{id}/references`

Lists the documents that link to this one, among those you can read, through fields you can read. Use it to find what blocks a delete.

| | |
|---|---|
| Who | Content, as for reading the document |
| Returns | `200` and `{"docs": [...]}`, each with `collection`, `id` and `path`, the field that holds the link |
| Errors | `401`, `403` a read rule or key scope refuses; `404` no such document, or one you can't read |

```sh
curl localhost:3000/api/categories/01a18491-0169-744b-b4c2-75708f5b1426/references
```

```json
{
  "docs": [
    {
      "collection": "posts",
      "id": "01a18491-016c-7521-861e-dff9974d0737",
      "path": "category"
    }
  ]
}
```
