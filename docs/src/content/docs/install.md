---
title: Install
description: Run TachyonCMS v0.1.0 with Docker or a release binary, create the first Admin and make your first request.
---

You need a Postgres database and the `tachyon` binary. The quickest way to get both is Docker. If you'd rather run the binary yourself, see [Deploy as a binary](/deploy/binary).

## Start Postgres and TachyonCMS

Create a network so the two containers can reach each other, start Postgres on it, then start TachyonCMS:

```sh
docker network create tachyon
docker run -d --name tachyon-db --network tachyon \
  -e POSTGRES_USER=tachyon -e POSTGRES_PASSWORD=tachyon -e POSTGRES_DB=tachyon \
  postgres:17
docker run --rm --network tachyon -p 127.0.0.1:3000:3000 \
  -e TACHYON_DATABASE_URL=postgres://tachyon:tachyon@tachyon-db:5432/tachyon \
  -e TACHYON_PUBLIC_URL=http://localhost:3000 \
  ghcr.io/tachyon-cms/tachyoncms:v0.1.0
```

The last command stays in the foreground, so run the rest of this page in a second terminal. (Or add `-d` to run it in the background and read its output with `docker logs`.)

TachyonCMS runs its database migrations, then logs one JSON line per event to stderr:

```json
{"timestamp":"2026-10-28T21:16:16.232861Z","level":"INFO","fields":{"message":"listening","addr":"0.0.0.0:3000"},"target":"tachyon"}
{"timestamp":"2026-10-28T21:16:16.233349Z","level":"WARN","fields":{"message":"setup needed: create the first Admin with POST /api/setup (see the README's First run)"},"target":"tachyon"}
```

The API is now at `http://localhost:3000`. Until someone creates the first Admin, nothing can be changed.

Inside the container the server listens on `0.0.0.0:3000`, which is why `TACHYON_PUBLIC_URL` is set: TachyonCMS won't listen beyond loopback without one. [Configuration](/configuration) explains why.

## Create the first Admin

Ask whether setup is still needed:

```sh
curl localhost:3000/api/setup
```

```json
{"needed":true}
```

Create the Admin. This works once. Passwords need at least 12 characters, and ones known from data breaches are refused.

```sh
curl -X POST localhost:3000/api/setup \
  -H 'content-type: application/json' \
  -d '{"email": "you@example.com", "name": "You", "password": "a long passphrase you will remember"}'
```

```json
{
  "createdAt": "2026-10-28T21:16:26.350191Z",
  "email": "you@example.com",
  "id": "01a1845f-156e-7727-ab67-49704587395b",
  "name": "You",
  "role": "admin",
  "status": "published",
  "updatedAt": "2026-10-28T21:16:26.350191Z"
}
```

Every document in v0.1.0, users included, comes back with `"status": "published"`. Drafts don't exist yet, so it never says anything else.

Running setup a second time gets a `409`:

```json
{
  "detail": "Setup has already been done. Sign in instead.",
  "requestId": "01a1845f-157e-75ed-8c17-13d4a4d81fcf",
  "status": 409,
  "title": "Conflict",
  "type": "about:blank"
}
```

## Sign in and keep a token

From the command line, ask for a bearer token by sending `"bearer": true`:

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

Keep the token in a shell variable. The rest of these docs send it as `$TOKEN`:

```sh
export TOKEN=tcs_...   # the "token" from the response
```

## Make your first content type

```sh
curl -X POST localhost:3000/api/admin/collections \
  -H "authorization: Bearer $TOKEN" \
  -H 'content-type: application/json' \
  -d '{"slug": "posts", "fields": [
        {"name": "title", "type": "text", "required": true, "maxLength": 120},
        {"name": "publishedOn", "type": "date", "dateOnly": true}
      ]}'
```

Add a post, then list posts. Reading needs no sign-in:

```sh
curl -X POST localhost:3000/api/posts \
  -H "authorization: Bearer $TOKEN" \
  -H 'content-type: application/json' \
  -d '{"title": "Hello, world", "publishedOn": "2026-10-12"}'

curl localhost:3000/api/posts
```

```json
{
  "docs": [
    {
      "createdAt": "2026-10-28T21:16:45.517591Z",
      "id": "01a1845f-604d-76c4-952d-ed9cb379a8f6",
      "publishedOn": "2026-10-12",
      "status": "published",
      "title": "Hello, world",
      "updatedAt": "2026-10-28T21:16:45.517591Z"
    }
  ],
  "hasNextPage": false,
  "limit": 10,
  "page": 1
}
```

## Next steps

- [Concepts](/concepts) explains collections, documents, fields and who can do what.
- [Content types](/content-types) covers changing `posts` later without losing data.
- [Deploy with Docker](/deploy/docker) keeps the database across restarts and checks the image signature.
