---
title: Build a blog
description: Build a blog API with TachyonCMS v0.1.0, from an empty Postgres to posts with authors, drafts only their author can see, and a front page query.
---

In this tutorial you build the back end of a small blog with TachyonCMS v0.1.0. By the end you'll have:

- two authors, Ann and Ben, who sign in and write posts;
- a `posts` collection with a title, slug, body, date, author and a `published` flag;
- an access rule that hides drafts from everyone but their author (and Admins), and stops authors changing each other's posts;
- the queries a front end needs: the front page, one post by its slug, and one author's posts, each with the author's name filled in.

It takes about 20 minutes. Everything happens over the HTTP API with `curl`.

## Before you start

You need:

- Docker, to run Postgres and TachyonCMS;
- `curl`;
- port 3000 free on your machine.

The tutorial starts from nothing. If you already followed [Install](/install), stop the TachyonCMS container you started there and run the [clean-up step](#11-clean-up) first, since this page uses the same names.

Responses on this page come from a real run. Your IDs, timestamps and tokens will differ. Wherever a command needs one of your values, the page says which response to copy it from.

## 1. Start TachyonCMS

Create a network, start Postgres on it, then start TachyonCMS in the background:

```sh
docker network create tachyon
docker run -d --name tachyon-db --network tachyon \
  -e POSTGRES_USER=tachyon -e POSTGRES_PASSWORD=tachyon -e POSTGRES_DB=tachyon \
  postgres:17
docker run -d --name tachyon --network tachyon -p 127.0.0.1:3000:3000 \
  -e TACHYON_DATABASE_URL=postgres://tachyon:tachyon@tachyon-db:5432/tachyon \
  -e TACHYON_PUBLIC_URL=http://localhost:3000 \
  ghcr.io/tachyon-cms/tachyoncms:v0.1.0
```

Check that it's up:

```sh
docker logs tachyon
```

You should see two lines like these:

```json
{"timestamp":"2026-10-28T21:52:02.445604Z","level":"INFO","fields":{"message":"listening","addr":"0.0.0.0:3000"},"target":"tachyon"}
{"timestamp":"2026-10-28T21:52:02.446305Z","level":"WARN","fields":{"message":"setup needed: create the first Admin with POST /api/setup (see the README's First run)"},"target":"tachyon"}
```

The warning is expected. You create the Admin next.

## 2. Create the Admin and sign in

The first account is the Admin. Passwords need at least 12 characters, and ones known from data breaches are refused:

```sh
curl -X POST localhost:3000/api/setup \
  -H 'content-type: application/json' \
  -d '{"email": "you@example.com", "name": "You", "password": "a long passphrase you will remember"}'
```

Sign in and ask for a bearer token:

```sh
curl -X POST localhost:3000/api/auth/login \
  -H 'content-type: application/json' \
  -d '{"email": "you@example.com", "password": "a long passphrase you will remember", "bearer": true}'
```

```json
{
  "exp": "2026-11-27T21:55:03.704898387Z",
  "token": "tcs_…",
  "user": {
    "createdAt": "2026-10-28T21:55:03.662513Z",
    "email": "you@example.com",
    "id": "01a18482-716e-77d5-a909-bf793fdf945c",
    "name": "You",
    "role": "admin",
    "status": "published",
    "updatedAt": "2026-10-28T21:55:03.662513Z"
  }
}
```

Copy the `token` value from your response into a shell variable. It starts with `tcs_`:

```sh
export TOKEN=tcs_...   # your "token" from the response above
```

Every later command reads tokens and IDs from variables like this one, so run them all in the same terminal.

## 3. Add two authors

Create Ann and Ben with the built-in `author` role. An Author can write posts and change only their own:

```sh
curl -X POST localhost:3000/api/users \
  -H "authorization: Bearer $TOKEN" \
  -H 'content-type: application/json' \
  -d '{"email": "ann@example.com", "password": "violet kettle under the stairs", "role": "author", "name": "Ann"}'

curl -X POST localhost:3000/api/users \
  -H "authorization: Bearer $TOKEN" \
  -H 'content-type: application/json' \
  -d '{"email": "ben@example.com", "password": "copper lantern by the north gate", "role": "author", "name": "Ben"}'
```

Each one comes back as a user. Here's Ann:

```json
{
  "createdAt": "2026-10-28T21:55:03.788843Z",
  "email": "ann@example.com",
  "id": "01a18482-71ec-77dc-be6c-bddabc8a4be1",
  "name": "Ann",
  "role": "author",
  "status": "published",
  "updatedAt": "2026-10-28T21:55:03.788843Z"
}
```

Now sign in as each of them, the same way you signed in as the Admin:

```sh
curl -X POST localhost:3000/api/auth/login \
  -H 'content-type: application/json' \
  -d '{"email": "ann@example.com", "password": "violet kettle under the stairs", "bearer": true}'
```

```json
{
  "exp": "2026-11-27T21:55:03.90295872Z",
  "token": "tcs_…",
  "user": {
    "createdAt": "2026-10-28T21:55:03.788843Z",
    "email": "ann@example.com",
    "id": "01a18482-71ec-77dc-be6c-bddabc8a4be1",
    "name": "Ann",
    "role": "author",
    "status": "published",
    "updatedAt": "2026-10-28T21:55:03.788843Z"
  }
}
```

```sh
curl -X POST localhost:3000/api/auth/login \
  -H 'content-type: application/json' \
  -d '{"email": "ben@example.com", "password": "copper lantern by the north gate", "bearer": true}'
```

Keep each author's `token` and `user.id` from their sign-in response:

```sh
export ANN_TOKEN=tcs_...   # "token" from Ann's sign-in
export ANN_ID=...          # "user.id" from Ann's sign-in
export BEN_TOKEN=tcs_...   # "token" from Ben's sign-in
export BEN_ID=...          # "user.id" from Ben's sign-in
```

## 4. Create the posts collection

A collection is a content type. This one has six fields:

```sh
curl -X POST localhost:3000/api/admin/collections \
  -H "authorization: Bearer $TOKEN" \
  -H 'content-type: application/json' \
  -d '{"slug": "posts", "fields": [
        {"name": "title", "type": "text", "required": true, "maxLength": 120},
        {"name": "slug", "type": "slug", "from": "title", "unique": true},
        {"name": "body", "type": "textarea"},
        {"name": "publishedOn", "type": "date", "dateOnly": true},
        {"name": "published", "type": "checkbox", "default": false},
        {"name": "author", "type": "relationship", "relationTo": "users", "required": true}
      ]}'
```

- `slug` fills itself from `title` when a post arrives without one, so "Hello from Ann" becomes `hello-from-ann`.
- `published` is the draft flag. It starts as `false`. (The name `status` is reserved, which is why it isn't called that.)
- `author` links each post to a user.

The response is the saved schema, with `"schemaVersion": 1`. Notice that `checkbox` comes back as `boolean`: they're two names for the same type.

[Fields](/fields) lists every field type and option.

## 5. Write some posts

Ann writes one published post and one draft. Ben writes a published post. Each sets `author` to their own ID, since TachyonCMS doesn't fill it in for them. (The `'"$ANN_ID"'` part closes the single quotes so the shell can insert the variable.)

```sh
curl -X POST localhost:3000/api/posts \
  -H "authorization: Bearer $ANN_TOKEN" \
  -H 'content-type: application/json' \
  -d '{"title": "Hello from Ann", "body": "My first post.", "publishedOn": "2026-10-20", "published": true, "author": "'"$ANN_ID"'"}'

curl -X POST localhost:3000/api/posts \
  -H "authorization: Bearer $ANN_TOKEN" \
  -H 'content-type: application/json' \
  -d '{"title": "Notes on a slow Sunday", "body": "Not finished yet.", "author": "'"$ANN_ID"'"}'

curl -X POST localhost:3000/api/posts \
  -H "authorization: Bearer $BEN_TOKEN" \
  -H 'content-type: application/json' \
  -d '{"title": "Ben says hi", "body": "Short and sweet.", "publishedOn": "2026-10-24", "published": true, "author": "'"$BEN_ID"'"}'
```

Each response is the new post, with its author filled in. Here's the draft:

```json
{
  "author": {
    "createdAt": "2026-10-28T21:55:03.788843Z",
    "id": "01a18482-71ec-77dc-be6c-bddabc8a4be1",
    "name": "Ann",
    "status": "published",
    "updatedAt": "2026-10-28T21:55:03.788843Z"
  },
  "body": "Not finished yet.",
  "createdAt": "2026-10-28T21:55:03.983294Z",
  "id": "01a18482-72af-701f-9e13-9ce75c86bd8d",
  "published": false,
  "slug": "notes-on-a-slow-sunday",
  "status": "published",
  "title": "Notes on a slow Sunday",
  "updatedAt": "2026-10-28T21:55:03.983294Z"
}
```

`"published": false` is your draft flag. `"status": "published"` is something else: v0.1.0 has no drafts of its own yet, so every document says that.

Keep the IDs of Ann's two posts:

```sh
export HELLO_ID=...   # "id" from the "Hello from Ann" response
export DRAFT_ID=...   # "id" from the "Notes on a slow Sunday" response
```

## 6. See the problem

List the posts without signing in, as a visitor to the blog would:

```sh
curl -g 'localhost:3000/api/posts?select[title]=true&select[published]=true'
```

```json
{
  "docs": [
    {
      "id": "01a18482-72b8-73cf-b449-2d3a1f7801ea",
      "published": true,
      "title": "Ben says hi"
    },
    {
      "id": "01a18482-72af-701f-9e13-9ce75c86bd8d",
      "published": false,
      "title": "Notes on a slow Sunday"
    },
    {
      "id": "01a18482-72a4-7432-ac48-ffa44b0bc016",
      "published": true,
      "title": "Hello from Ann"
    }
  ],
  "hasNextPage": false,
  "limit": 10,
  "page": 1
}
```

Ann's draft is right there. Anyone can read content unless an access rule says otherwise, and `published` is just a field until a rule uses it. (`-g` stops `curl` reading the square brackets as a pattern.)

## 7. Hide drafts with an access rule

Add an `access` block to `posts`. A schema change sends the whole schema, so the fields are repeated:

```sh
curl -X PUT localhost:3000/api/admin/collections/posts \
  -H "authorization: Bearer $TOKEN" \
  -H 'content-type: application/json' \
  -d '{"schema": {"slug": "posts",
        "access": {
          "read": {"or": [{"published": true}, {"author": "$user.id"}]},
          "update": {"author": "$user.id"},
          "delete": {"author": "$user.id"}
        },
        "fields": [
          {"name": "title", "type": "text", "required": true, "maxLength": 120},
          {"name": "slug", "type": "slug", "from": "title", "unique": true},
          {"name": "body", "type": "textarea"},
          {"name": "publishedOn", "type": "date", "dateOnly": true},
          {"name": "published", "type": "checkbox", "default": false},
          {"name": "author", "type": "relationship", "relationTo": "users", "required": true}
        ]}}'
```

Read the rules as filters on each post:

- **read:** the post is published, or its `author` is the person asking. `$user.id` stands for the caller's user ID.
- **update** and **delete:** only the post's `author`.
- **create** has no rule, so the role decides: Authors may create.

`$user.id` is single-quoted here on purpose: it goes to TachyonCMS as written, not through your shell.

The response ends with a preview of the change:

```json
  "preview": {
    "cleared": 0,
    "diff": {
      "changes": [
        {
          "type": "collectionOptionsChanged"
        }
      ]
    },
    "documents": 3,
    "duplicates": [],
    "examples": [],
    "indexes": {
      "create": [],
      "drop": []
    },
    "invalid": 0,
    "needsConfirmation": false
  }
```

Nothing was cleared and nothing needs confirming, so the rule is live. The collection is now at `"schemaVersion": 2`.

## 8. Check who sees what

Ask again as a visitor:

```sh
curl -g 'localhost:3000/api/posts?select[title]=true&select[published]=true'
```

```json
{
  "docs": [
    {
      "id": "01a18482-72b8-73cf-b449-2d3a1f7801ea",
      "published": true,
      "title": "Ben says hi"
    },
    {
      "id": "01a18482-72a4-7432-ac48-ffa44b0bc016",
      "published": true,
      "title": "Hello from Ann"
    }
  ],
  "hasNextPage": false,
  "limit": 10,
  "page": 1
}
```

The draft is gone. Ben gets the same two posts:

```sh
curl -g 'localhost:3000/api/posts?select[title]=true&select[published]=true' \
  -H "authorization: Bearer $BEN_TOKEN"
```

Ann gets three, because the draft is hers:

```sh
curl -g 'localhost:3000/api/posts?select[title]=true&select[published]=true' \
  -H "authorization: Bearer $ANN_TOKEN"
```

```json
{
  "docs": [
    {
      "id": "01a18482-72b8-73cf-b449-2d3a1f7801ea",
      "published": true,
      "title": "Ben says hi"
    },
    {
      "id": "01a18482-72af-701f-9e13-9ce75c86bd8d",
      "published": false,
      "title": "Notes on a slow Sunday"
    },
    {
      "id": "01a18482-72a4-7432-ac48-ffa44b0bc016",
      "published": true,
      "title": "Hello from Ann"
    }
  ],
  "hasNextPage": false,
  "limit": 10,
  "page": 1
}
```

Asking for the draft by ID, as a visitor or as Ben, is a `404`, as if it didn't exist:

```sh
curl localhost:3000/api/posts/$DRAFT_ID -H "authorization: Bearer $BEN_TOKEN"
```

```json
{
  "requestId": "01a18482-7301-735f-9703-5c84656a9c43",
  "status": 404,
  "title": "Not found",
  "type": "about:blank"
}
```

Ben can read Ann's published post, but he can't change it:

```sh
curl -X PATCH localhost:3000/api/posts/$HELLO_ID \
  -H "authorization: Bearer $BEN_TOKEN" \
  -H 'content-type: application/json' \
  -d '{"title": "Ben was here"}'
```

```json
{
  "detail": "An access rule doesn't let you change this document.",
  "requestId": "01a18482-730c-7431-a0a1-82a2e37a8440",
  "status": 403,
  "title": "Forbidden",
  "type": "about:blank"
}
```

You signed in as the Admin with `$TOKEN`. Admins pass every rule, so the Admin still sees and can change everything.

## 9. Query the blog

A front end needs a few queries. None of them need a token, since visitors only ever see published posts.

### The front page

Newest first, with only the fields a list needs:

```sh
curl -g 'localhost:3000/api/posts?sort=-publishedOn&select[title]=true&select[slug]=true&select[publishedOn]=true&select[author]=true&populate[users][name]=true'
```

```json
{
  "docs": [
    {
      "author": {
        "id": "01a18482-7237-7762-95d8-a20be612a31e",
        "name": "Ben"
      },
      "id": "01a18482-72b8-73cf-b449-2d3a1f7801ea",
      "publishedOn": "2026-10-24",
      "slug": "ben-says-hi",
      "title": "Ben says hi"
    },
    {
      "author": {
        "id": "01a18482-71ec-77dc-be6c-bddabc8a4be1",
        "name": "Ann"
      },
      "id": "01a18482-72a4-7432-ac48-ffa44b0bc016",
      "publishedOn": "2026-10-20",
      "slug": "hello-from-ann",
      "title": "Hello from Ann"
    }
  ],
  "hasNextPage": false,
  "limit": 10,
  "page": 1
}
```

- `sort=-publishedOn` puts the latest date first.
- `select` picks the post's fields. The `id` always comes back.
- `author` is populated: TachyonCMS replaced the stored ID with Ann's or Ben's profile. `populate[users][name]=true` trims every populated user down to `name`. A user's email and role never appear in a populated link.

### One post, by its slug

```sh
curl -g 'localhost:3000/api/posts?where[slug][equals]=hello-from-ann&populate[users][name]=true'
```

```json
{
  "docs": [
    {
      "author": {
        "id": "01a18482-71ec-77dc-be6c-bddabc8a4be1",
        "name": "Ann"
      },
      "body": "My first post.",
      "createdAt": "2026-10-28T21:55:03.97216Z",
      "id": "01a18482-72a4-7432-ac48-ffa44b0bc016",
      "published": true,
      "publishedOn": "2026-10-20",
      "slug": "hello-from-ann",
      "status": "published",
      "title": "Hello from Ann",
      "updatedAt": "2026-10-28T21:55:03.97216Z"
    }
  ],
  "hasNextPage": false,
  "limit": 10,
  "page": 1
}
```

Without `select`, every field comes back. The slug is unique, so there's at most one match.

### One author's posts

A dotted path in `where` filters through the `author` link:

```sh
curl -g 'localhost:3000/api/posts?where[author.name][equals]=Ann&select[title]=true'
```

```json
{
  "docs": [
    {
      "id": "01a18482-72a4-7432-ac48-ffa44b0bc016",
      "title": "Hello from Ann"
    }
  ],
  "hasNextPage": false,
  "limit": 10,
  "page": 1
}
```

Ann's draft doesn't match: the read rule applies to filters too.

## 10. Publish the draft

Ann finishes her post and publishes it:

```sh
curl -X PATCH localhost:3000/api/posts/$DRAFT_ID \
  -H "authorization: Bearer $ANN_TOKEN" \
  -H 'content-type: application/json' \
  -d '{"published": true, "publishedOn": "2026-10-28"}'
```

Visitors see it at the top of the front page now:

```sh
curl -g 'localhost:3000/api/posts?sort=-publishedOn&select[title]=true&select[publishedOn]=true'
```

```json
{
  "docs": [
    {
      "id": "01a18482-72af-701f-9e13-9ce75c86bd8d",
      "publishedOn": "2026-10-28",
      "title": "Notes on a slow Sunday"
    },
    {
      "id": "01a18482-72b8-73cf-b449-2d3a1f7801ea",
      "publishedOn": "2026-10-24",
      "title": "Ben says hi"
    },
    {
      "id": "01a18482-72a4-7432-ac48-ffa44b0bc016",
      "publishedOn": "2026-10-20",
      "title": "Hello from Ann"
    }
  ],
  "hasNextPage": false,
  "limit": 10,
  "page": 1
}
```

That's the blog: authors, posts, private drafts and the queries to show them.

## 11. Clean up

Remove the containers and the network. The database goes with them:

```sh
docker rm -f tachyon tachyon-db
docker network rm tachyon
```

## Where to go next

- Editors are bound by these rules too. [Access rules](/access-rules#a-blog-with-drafts) shows how to let them work on every post.
- [Querying](/querying) covers every filter operator and paging with cursors.
- [Relationships](/relationships) covers `depth`, `defaultPopulate` and links to several collections.
- [Schema files](/schema-files) keeps the `posts` schema in a file under version control.
- [Deploy with Docker](/deploy/docker) keeps the database across restarts.
