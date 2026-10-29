---
title: Sign-in and keys API
description: The setup, sign-in, session, password and API key endpoints in TachyonCMS v0.1.0.
sidebar:
  label: Sign-in and keys
---

Part of the [HTTP API](/reference/http-api) reference. [Requests and responses](/reference/http-api#requests-and-responses) covers what every endpoint shares, and [Who can call what](/reference/http-api#who-can-call-what) explains the **Who** rows.

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
