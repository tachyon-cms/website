---
title: Sign-in
description: Create the first Admin, sign in with a session cookie or a bearer token, and manage sessions and passwords.
---

People sign in with an email and password and get a **session**. A browser keeps the session in a cookie. Anything else asks for the session token and sends it as a bearer token. For servers and websites that read or write content on their own, use an [API key](/api-keys) instead.

## The first Admin

A new install has no accounts, and nothing can be changed until the first Admin exists. `GET /api/setup` says whether that's still needed, and `POST /api/setup` creates the Admin once:

```sh
curl -X POST localhost:3000/api/setup \
  -H 'content-type: application/json' \
  -d '{"email": "you@example.com", "name": "You", "password": "a long passphrase you will remember"}'
```

After that, setup answers `409 Conflict`. [Install](/install#create-the-first-admin) shows both responses.

## Sign in

`POST /api/auth/login` with `email` and `password`. The response holds the user and the session's expiry, and sets the session cookie:

```sh
curl -i -X POST localhost:3000/api/auth/login \
  -H 'content-type: application/json' \
  -d '{"email": "ann@example.com", "password": "violet kettle under the stairs"}'
```

```http
HTTP/1.1 200 OK
content-type: application/json
set-cookie: __Host-tachyon_session=tcs_…; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=2592000
x-request-id: 01a18461-143c-74de-90f7-ef98bf35df88
content-length: 253
date: Wed, 28 Oct 2026 21:18:37 GMT

{"exp":"2026-11-27T21:18:37.139755597Z","user":{"createdAt":"2026-10-28T21:18:30.842219Z","email":"ann@example.com","id":"01a18460-fbba-75ad-be56-f085bab18202","name":"Ann","role":"author","status":"published","updatedAt":"2026-10-28T21:18:30.842219Z"}}
```

The cookie is `HttpOnly`, so page scripts can't read it, and `SameSite=Strict`. The `__Host-` prefix makes browsers insist on `Secure` and `Path=/`, so serve TachyonCMS over HTTPS anywhere but `localhost`.

### Bearer tokens

Add `"bearer": true` and the response also includes the token, `tcs_` followed by 43 characters. Send it as `Authorization: Bearer`:

```sh
curl -X POST localhost:3000/api/auth/login \
  -H 'content-type: application/json' \
  -d '{"email": "you@example.com", "password": "a long passphrase you will remember", "bearer": true}'
```

```json
{
  "exp": "2026-11-27T21:16:26.401599758Z",
  "token": "tcs_…",
  "user": {
    "createdAt": "2026-10-28T21:16:26.350191Z",
    "email": "you@example.com",
    "id": "01a1845f-156e-7727-ab67-49704587395b",
    "name": "You",
    "role": "admin",
    "status": "published",
    "updatedAt": "2026-10-28T21:16:26.350191Z"
  }
}
```

A token that has expired or been revoked is a `401`, never a quiet fall back to signed out:

```json
{
  "detail": "This session has ended. Sign in again.",
  "requestId": "01a18461-2bfe-7269-8d2a-62b22f0fb599",
  "status": 401,
  "title": "Unauthorized",
  "type": "about:blank"
}
```

A stale cookie is different: browsers send old cookies, so a cookie that no longer works counts as signed out.

### Wrong passwords and lockout

A wrong email and a wrong password get the same answer, in about the same time, so nobody can learn which emails have accounts:

```json
{
  "detail": "Email or password is wrong.",
  "requestId": "01a18460-fc7d-77a9-8653-4154a0bbcbc8",
  "status": 401,
  "title": "Unauthorized",
  "type": "about:blank"
}
```

Five wrong passwords within 15 minutes lock the account for 15 minutes. While it's locked, even the right password gets the same answer. You can change all three numbers in [`[auth]`](/configuration#auth).

## How long a session lasts

A session ends after 7 days without use, and after 30 days whatever happens. Both are [configurable](/configuration#auth). `exp` in the login response is the 30-day limit.

## Cookie-signed changes and other sites

Browsers attach cookies to requests that other sites start. So a request that changes something and is signed by the cookie must carry an `Origin` header matching your [`public_url`](/configuration#public_url) or one of `allowed_origins`. Otherwise it's refused:

```json
{
  "detail": "This request came from another site.",
  "requestId": "01a18461-2be0-7068-83d6-e0d91321e529",
  "status": 403,
  "title": "Forbidden",
  "type": "about:blank"
}
```

Bearer tokens and API keys aren't sent automatically, so they don't need the check.

## Who am I?

`GET /api/auth/me` returns the signed-in user. Here Ann, an Author, is asking:

```sh
curl localhost:3000/api/auth/me -H "authorization: Bearer $TOKEN"
```

```json
{
  "createdAt": "2026-10-28T21:18:30.842219Z",
  "email": "ann@example.com",
  "id": "01a18460-fbba-75ad-be56-f085bab18202",
  "name": "Ann",
  "role": "author",
  "status": "published",
  "updatedAt": "2026-10-28T21:18:30.842219Z"
}
```

## Sessions

`GET /api/auth/sessions` lists your active sessions. `current` marks the one making the request. Ann again:

```sh
curl localhost:3000/api/auth/sessions -H "authorization: Bearer $TOKEN"
```

```json
{
  "docs": [
    {
      "createdAt": "2026-10-28T21:18:31.020172Z",
      "current": true,
      "expiresAt": "2026-11-27T21:18:31.020172Z",
      "id": "01a18460-fc6b-70a2-b051-14bc736dbc95",
      "ip": null,
      "lastSeenAt": "2026-10-28T21:18:31.020172Z",
      "userAgent": "curl/8.7.1"
    }
  ]
}
```

`DELETE /api/auth/sessions/{id}` ends one of them, such as a session on a lost laptop, and answers `204`.

## Sign out

`POST /api/auth/logout` ends the current session and clears the cookie:

```http
HTTP/1.1 204 No Content
set-cookie: __Host-tachyon_session=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0
```

## Change your password

`POST /api/auth/password` with your `current` password and the `new` one. It answers `204`, and ends every other session you have, so a stolen session stops working. Here Ann changes hers:

```sh
curl -X POST localhost:3000/api/auth/password \
  -H "authorization: Bearer $TOKEN" \
  -H 'content-type: application/json' \
  -d '{"current": "violet kettle under the stairs", "new": "a brand new passphrase for ann"}'
```

A wrong current password is a `403`:

```json
{
  "detail": "Your current password is wrong.",
  "requestId": "01a18462-8319-70af-b1cc-41cb69b94c5a",
  "status": 403,
  "title": "Forbidden",
  "type": "about:blank"
}
```

Passwords change only from a signed-in session, never with an API key.

## Password rules

- 12 to 256 characters.
- Not known from a data breach. TachyonCMS asks the [Have I Been Pwned](https://haveibeenpwned.com/Passwords) range API, which sees only the first five characters of the password's SHA-1 hash. If the service can't be reached within 2 seconds, the password is accepted and a warning is logged. Turn the check off with [`breach_check`](/configuration#auth).
- Hashed with Argon2id before it's stored.

A breached password is a `422` on the field:

```json
{
  "errors": [
    {
      "message": "This password has appeared in a data breach. Choose another.",
      "path": "password"
    }
  ],
  "requestId": "01a18460-e1fc-71c8-930d-3f57daae2c1e",
  "status": 422,
  "title": "Validation failed",
  "type": "about:blank"
}
```
