---
title: Access rules
description: Decide which documents and fields each person can read and change, with rules that live in the schema.
---

[Roles](/roles) answer "who are you?". Most sites also need "which documents?": visitors see what's published, and authors edit their own posts and nobody else's. An access rule in the schema says that. Rules live in the schema, so they export and apply with it like any other change.

## Where rules go

| On | Actions |
|---|---|
| A collection, as `access` | `read`, `create`, `update`, `delete` |
| A global, as `access` | `read`, `update` |
| A field at any depth, inside groups, arrays and tabs too | `read`, `create`, `update` |

A rule replaces the role default for the action it covers, and only that action. Actions without a rule keep the [role defaults](/roles#built-in-roles). Admins pass every rule, so nobody can lock themselves out.

## What a rule can say

| Rule | Passes when |
|---|---|
| `true`, `false` | Always, or never. |
| `{"role": "editor"}` or `{"role": ["editor", "reviewer"]}` | The caller has one of these roles. Custom roles count. |
| `{"signedIn": true}` | The caller is signed in (or, with `false`, isn't). |
| `{"and": [rules]}`, `{"or": [rules]}` | All, or any, of the rules pass. |
| Any other object | A filter, written as `where` takes it, matches the document. |

A filter is the same language as [`where`](/querying#filter-with-where): `{"published": {"equals": true}}`, or `{"published": true}` for short. It reaches through relationships (`{"author.team": "red"}`) and into lists, like `where` does.

### Compare with the caller

A filter can use values from the person asking:

| Value | Is |
|---|---|
| `$user.id` | Their user ID. |
| `$user.role` | Their role's slug. |
| `$user.` plus a profile field | That field on their `users` profile, such as `$user.team`. |

The profile field has to store one value or a list of them. Virtual and join fields are filled on read, not stored, so rules can't use them. A list works with `in` and `not_in` only. For someone who isn't signed in there's no `$user`, so a condition that uses it matches nothing.

## A blog with drafts

Everyone reads what's published. Authors also read their own drafts, and change only their own posts. This adds a `published` checkbox to `posts` and gives it a collection rule (the other `posts` fields are left out here):

```json
{
  "slug": "posts",
  "access": {
    "read": {"or": [{"published": true}, {"author": "$user.id"}]},
    "update": {"author": "$user.id"}
  },
  "fields": [
    {"name": "title", "type": "text", "required": true},
    {"name": "published", "type": "checkbox"},
    {"name": "author", "type": "relationship", "relationTo": "users"}
  ]
}
```

The rule compares the `author` field with the caller, so a post belongs to whoever its `author` names. Authors set it when they write:

```sh
curl -X POST localhost:3000/api/posts \
  -H "authorization: Bearer $ANN_TOKEN" \
  -H 'content-type: application/json' \
  -d '{"title": "Ann'\''s draft", "author": "01a18460-fbba-75ad-be56-f085bab18202"}'
```

Signed out, only the published post shows. (`status` still says `"published"` on every document in v0.1.0; the rule reads your own `published` field.)

```sh
curl -g 'localhost:3000/api/posts?select[title]=true&select[published]=true'
```

```json
{
  "docs": [
    {
      "id": "01a1845f-afdb-75d9-af23-79cecf8ebabc",
      "published": true,
      "title": "Shipping v0.1.0"
    }
  ],
  "hasNextPage": false,
  "limit": 10,
  "page": 1
}
```

Asking for the draft by ID is a `404 Not found`, as if it didn't exist.

Ann sees her draft as well:

```sh
curl -g 'localhost:3000/api/posts?select[title]=true&select[published]=true' \
  -H "authorization: Bearer $ANN_TOKEN"
```

```json
{
  "docs": [
    {
      "id": "01a18461-9341-73db-a36e-8c6798ee0ee7",
      "title": "Ann's draft"
    },
    {
      "id": "01a1845f-afdb-75d9-af23-79cecf8ebabc",
      "published": true,
      "title": "Shipping v0.1.0"
    }
  ],
  "hasNextPage": false,
  "limit": 10,
  "page": 1
}
```

She can read the published post, but the update rule stops her changing it: a `403` with the detail `An access rule doesn't let you change this document.`

`create` and `delete` have no rule here, so the role table still decides them.

:::caution[Rules bind Editors too]
With these rules, Editors also see only published posts and their own drafts, and change only posts they wrote. To keep them working on everything, add `{"role": "editor"}` to the read rule's `or`, and make the update rule `{"or": [{"role": "editor"}, {"author": "$user.id"}]}`.
:::

## Field rules

A field rule decides who can read and write one field. Field rules can use roles, `signedIn` and `true`/`false`, but not filters. This field is only for Editors:

```json
{"name": "internalNotes", "type": "textarea",
 "access": {"read": {"role": "editor"}, "create": {"role": "editor"}, "update": {"role": "editor"}}}
```

A field you can't read is left out of every response, populated and joined documents included. Ann asks for it and doesn't get it:

```sh
curl -g 'localhost:3000/api/posts/01a1845f-afdb-75d9-af23-79cecf8ebabc?select[title]=true&select[internalNotes]=true' \
  -H "authorization: Bearer $ANN_TOKEN"
```

```json
{
  "id": "01a1845f-afdb-75d9-af23-79cecf8ebabc",
  "title": "Shipping v0.1.0"
}
```

The same request from the Admin includes `"internalNotes": "Announce on Mastodon too."`.

Filtering or sorting on a field you can't read is a `403` that names the parameter, so its values can't be guessed one query at a time:

```json
{
  "detail": "where[internalNotes][exists]: you can't filter or sort by a field you can't read",
  "requestId": "01a18461-afdb-7299-a754-e125b155423e",
  "status": 403,
  "title": "Forbidden",
  "type": "about:blank"
}
```

Sending it in a write you're not allowed, even as `null`, is a `403` that names the field: ``You don't have permission to write `internalNotes`.``

## How rules are enforced

**Reads.** The rule's filter becomes part of the database query wherever a document can appear: lists and single reads, references, joins, populated links (one you can't read stays a bare ID) and virtual fields (no value from a document you can't read). Filters through relationships are covered too, so nobody can probe hidden documents with `where[author.team]`. A document you can't read is a `404`. A list the rule refuses outright, such as `false` or a role you don't have, is a `401` when you're signed out and a `403` when you're signed in.

**Updates and deletes** are checked against the stored document inside the write. If you can't read the document it's a `404`; if you can read it but the rule says no, it's a `403`. A global's existence is no secret, so an update its rule refuses is always a `403`.

**Creates.** A create rule can only use roles, `signedIn` and `true`/`false`, since there's no document to compare yet. A refused create is a `401` or `403`.

**After a write.** If a write succeeds but you can't read the result, the response holds only its `id`. A new link to a document you can't read gets the same `422` as a link to one that doesn't exist.

**Deletes blocked by links** are a `409`. Only an Admin whose credential isn't narrowed by key scopes sees how many documents link there.

**API keys** stay narrowed by their scopes on top of every rule.

## What am I allowed to do?

`GET /api/access` answers for whoever asks, so a front end can hide the buttons that would fail. Here's Ann, an Author, under the rules above, trimmed to `posts` (two of its fields) and the `site` global (one field):

```sh
curl localhost:3000/api/access -H "authorization: Bearer $ANN_TOKEN"
```

```json
{
  "collections": {
    "posts": {
      "create": true,
      "delete": "conditional",
      "fields": {
        "authorName": {
          "create": false,
          "read": true,
          "update": false
        },
        "seo.title": {
          "create": true,
          "read": true,
          "update": true
        }
      },
      "read": "conditional",
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

- A collection or global answers `true`, `false` or `"conditional"`. Conditional means it depends on the document: the rule is a filter, or the role only reaches documents the caller created. It stays conditional even when every stored document would pass, because it's an answer about the rules, not the data.
- A field answers `true` or `false`, and never allows more than its collection. Fields go by their dotted path: `seo.title`, and `links.url` for a field in every row of a list. Virtual and join fields can't be written, so `create` and `update` are `false`.
- `internalNotes` is missing. Anything you can't do at all is left out, so a missing collection, global or field means no.
- `schemas` and `users` say whether you may change content types and manage users. Under `collections.users`, `read` is about profiles as links show them, and `update` is about the account routes, where you change only your own unless you manage users.

## Rules are checked when you save

Both the API and [`tachyon schema apply`](/schema-files) refuse a rule that can't work, and name it:

```json
{
  "errors": [
    {
      "message": "access.update: there's no role `boss`",
      "path": ""
    }
  ],
  "requestId": "01a18461-c5f4-70da-89bb-6815212568fb",
  "status": 422,
  "title": "Validation failed",
  "type": "about:blank"
}
```

A filter in a create rule gets `access.create: can use only roles, signedIn, true and false, since there's no document to compare yet`. Also refused: bad syntax, a `$user` value that isn't `id`, `role` or a stored `users` profile field, a filter field or operator that doesn't exist, a list-valued `$user` field with anything but `in` or `not_in`, `create` or `delete` on a global, and a rule on a layout field. A change elsewhere that would break a rule is refused too, such as removing a profile field another collection's rule reads as `$user.team`, or deleting a role a rule names.

## Known limits

- **Unique fields give one thing away.** Saving a duplicate value fails with a `422`, even when the document holding it is one you can't read, so the error tells you some document has that value. Don't make a field unique if its values must stay secret.
- **Required fields someone can't create.** If a field is required, has no default, and a field rule stops someone writing it, they can't create the document at all. Give it a default, or let them set it.
- **The `users` collection doesn't take collection rules yet.** Saving one is refused rather than left to do nothing. Rules on its profile fields work.
