---
title: Blocks
description: Build pages from rows of block types you define, share block types between content types, and filter into them. New in v0.2.0.
---

A landing page isn't one long text field. It's a hero, then a quote, then a call to action, in whatever order the editor wants this week. A `blocks` field holds exactly that: a list of rows, where each row is one of the block types you define, with its own fields.

Blocks arrive in v0.2.0. For long-form writing, see [Rich text](/rich-text), which can hold blocks too.

## Add a blocks field

Each entry in `blocks` is a block type: a `slug` and its `fields`. This `pages` collection offers a `hero` and a `quote` written in place, plus `cta`, a [shared block](#shared-blocks) defined once and named with `blockRef`:

```sh
curl -X POST localhost:3000/api/admin/collections \
  -H "authorization: Bearer $TOKEN" \
  -H 'content-type: application/json' \
  -d '{"slug": "pages", "url": "/{slug}", "fields": [
        {"name": "title", "type": "text", "required": true},
        {"name": "slug", "type": "slug", "from": "title"},
        {"name": "layout", "type": "blocks", "maxRows": 20, "blocks": [
          {"slug": "hero", "fields": [
            {"name": "heading", "type": "text", "required": true},
            {"name": "intro", "type": "richText", "features": ["bold", "italic", "link"]}
          ]},
          {"slug": "quote", "fields": [
            {"name": "text", "type": "textarea", "required": true},
            {"name": "author", "type": "text"}
          ]},
          {"blockRef": "cta"}
        ]}
      ]}'
```

Create `cta` first, as [Shared blocks](#shared-blocks) shows, or the save is refused with ``field `layout`: blockRef `cta` doesn't match a shared block``.

| Option | Does |
|---|---|
| `blocks` | The block types a row may be. At least one. |
| `minRows` | The fewest rows the field takes. |
| `maxRows` | The most rows the field takes. |

A block type takes:

| Key | Is |
|---|---|
| `slug` | Its name, which rows give as `blockType`. A lowercase letter, then lowercase letters, digits and underscores, 64 characters at most. Unique within the field. |
| `fields` | Its fields, any type a group can hold, more `blocks` fields included. |
| `labels` | Optional. What an editor calls one row and several: `{"singular": "Hero", "plural": "Heroes"}`. |

Inside a block type, no field may be called `id` or `blockType`. `unique`, `filterable` and `slug` fields stay at the top level of a collection, and join fields can't sit inside a list, so none of those can go in a block either.

## Write rows

Every row names its block type in `blockType`, then fills that type's fields:

```sh
curl -X POST localhost:3000/api/pages \
  -H "authorization: Bearer $TOKEN" \
  -H 'content-type: application/json' \
  -d '{"title": "Home", "layout": [
        {"blockType": "hero", "heading": "Write once, publish anywhere"},
        {"blockType": "quote", "text": "We moved our docs over in an afternoon.", "author": "Ann"},
        {"blockType": "cta", "label": "Get started", "href": "/start"}
      ]}'
```

```json
{
  "createdAt": "2026-11-05T07:37:43.158937Z",
  "id": "01a1aaa4-65f8-739a-940d-ade6e53118f8",
  "layout": [
    {
      "blockType": "hero",
      "heading": "Write once, publish anywhere",
      "id": "01a1aaa4-65f5-736c-94cb-6cd5d156790e"
    },
    {
      "author": "Ann",
      "blockType": "quote",
      "id": "01a1aaa4-65f5-736c-94cb-6cd6862b1cbe",
      "text": "We moved our docs over in an afternoon."
    },
    {
      "blockType": "cta",
      "href": "/start",
      "id": "01a1aaa4-65f5-736c-94cb-6cd72ed6d06d",
      "label": "Get started"
    }
  ],
  "slug": "home",
  "status": "published",
  "title": "Home",
  "updatedAt": "2026-11-05T07:37:43.158937Z"
}
```

Each row comes back with an `id`. A row you send without one gets a new one; a row you send with one keeps it. That's how an editor, or your front end, can tell rows apart across saves.

Each row is checked against its own block type, and errors point into the list by position:

```json
{
  "errors": [
    {
      "message": "is required",
      "path": "layout.0.heading"
    },
    {
      "message": "expected one of: hero, quote, cta",
      "path": "layout.1.blockType"
    },
    {
      "message": "is required",
      "path": "layout.2.blockType"
    }
  ],
  "requestId": "01a1aaa4-6604-75ea-b763-909c9708b3bb",
  "status": 422,
  "title": "Validation failed",
  "type": "about:blank"
}
```

Other refusals you might meet: `this row ID is used twice` when two rows share an `id`, `expected a row ID` when an `id` isn't a UUID, and `must have at most 20 rows` (or `at least`) on the field itself when `minRows` or `maxRows` doesn't fit.

## Change rows

A `PATCH` replaces the whole list, like any other [list](/fields#updating-send-only-what-changed). To move, change or drop one row on a long page, read the page, edit the list, and send all of it back with its `id`s. Here the call to action moves to the top with new text, the quote goes, and a new quote is added at the end:

```sh
curl -X PATCH localhost:3000/api/pages/01a1aaa4-65f8-739a-940d-ade6e53118f8 \
  -H "authorization: Bearer $TOKEN" \
  -H 'content-type: application/json' \
  -d '{"layout": [
        {"id": "01a1aaa4-65f5-736c-94cb-6cd72ed6d06d", "blockType": "cta", "label": "Start now", "href": "/start"},
        {"id": "01a1aaa4-65f5-736c-94cb-6cd5d156790e", "blockType": "hero", "heading": "Write once, publish anywhere"},
        {"blockType": "quote", "text": "Fast to set up."}
      ]}'
```

The two rows you sent back keep their IDs, and the new one gets its own (response trimmed to `layout`):

```json
[
  {
    "blockType": "cta",
    "href": "/start",
    "id": "01a1aaa4-65f5-736c-94cb-6cd72ed6d06d",
    "label": "Start now"
  },
  {
    "blockType": "hero",
    "heading": "Write once, publish anywhere",
    "id": "01a1aaa4-65f5-736c-94cb-6cd5d156790e"
  },
  {
    "blockType": "quote",
    "id": "01a1aaa4-a837-7436-a273-0003f1c584ec",
    "text": "Fast to set up."
  }
]
```

## Filter into blocks

Filters name a field inside a row by its path, without the block type. Say there's also an About page with a single quote row:

```sh
curl -X POST localhost:3000/api/pages \
  -H "authorization: Bearer $TOKEN" \
  -H 'content-type: application/json' \
  -d '{"title": "About", "layout": [{"blockType": "quote", "text": "Small team, big plans."}]}'
```

`layout.blockType` finds pages by the rows they hold:

```sh
curl -g 'localhost:3000/api/pages?where[layout.blockType][equals]=quote&select[title]=true'
```

```json
{
  "docs": [
    {
      "id": "01a1aaa4-8a16-7713-80b9-50c02a3868ad",
      "title": "About"
    },
    {
      "id": "01a1aaa4-65f8-739a-940d-ade6e53118f8",
      "title": "Home"
    }
  ],
  "hasNextPage": false,
  "limit": 10,
  "page": 1
}
```

`where[layout.label][equals]=Start%20now` matches any page with a row whose `label` is `Start now`, whatever its block type. A name several block types share matches rows of each of them, and lists inside a row work as they do elsewhere: `where[layout.cards.label][equals]=…`, `where[layout.tags][contains]=…`. Through a relationship in a row, `where[layout.author.name][equals]=Ann` reads the linked document.

What gets a `400`:

| Query | Detail |
|---|---|
| `where[layout.blockType][equals]=banner` | `where[layout.blockType][equals]: expected one of: hero, quote, cta` |
| A name that's text in one block type and a number in another | ``where[layout.x][equals]: `layout.x` means different things in block types a and b`` |
| `where[layout][exists]=true` | ``where[layout][exists]: `layout` can't be filtered`` |
| `sort=layout.heading` | ``sort: `layout.heading` is inside a list and can't be sorted`` |

## Joins through blocks

A [join field](/joins-and-virtual-fields#join-fields) can read links that sit in block rows: `"on": "layout.who"` lists the pages with a row whose `who` links here. The path is accepted if any block type of `layout` has a `who` relationship to this collection.

Links inside the block nodes of [rich text](/rich-text#block-nodes) work the same way. Here `articles` has a `body` whose `byline` block type links to `authors`:

```json
{"slug": "articles", "fields": [
  {"name": "title", "type": "text"},
  {"name": "body", "type": "richText", "blocks": [
    {"slug": "byline", "fields": [{"name": "who", "type": "relationship", "relationTo": "authors"}]}
  ]}
]}
```

A join on `authors` with `"on": "body.who"` lists every article with a `byline` node naming that author. Asked for with `populate[articles][title]=true`, Ann's `articles` join reads:

```json
{
  "docs": [
    {
      "id": "01a1aac3-3eb2-76a4-8431-48b5b9cf226f",
      "title": "Back up first"
    }
  ],
  "hasNextPage": false
}
```

## Field rules inside blocks

[Field rules](/access-rules#field-rules) work inside block types as they do in groups and lists. Each row answers to its own block type's rules. If `hero` has a `secret` field only Editors may read, and `quote` has a `secret` with no rule, a Viewer reading the page gets no `secret` in hero rows and sees it in quote rows.

Where there's no row to go by, the stricter answer wins:

- Filtering on `layout.secret` is a `403` for anyone who can't read `secret` in some block type that has it.
- [`/api/access`](/access-rules#what-am-i-allowed-to-do) names block fields the same way, `layout.secret`, and answers with what every block type that has the field allows.

Writes go row by row. Since a `PATCH` replaces the whole list, it counts every row stored or sent. Someone who can't write hero's `secret` can't replace a list that holds a hero row, even if they leave `secret` out, and gets ``You don't have permission to write `layout.secret`.`` A list with only quote rows is theirs to replace.

## Change block types

Changing a block type works like changing any field, through [Change a content type](/content-types#change-a-content-type). A rename inside a block type names the type in its path: to rename hero's `heading` to `title`, send `"renames": {"layout.hero.heading": "title"}` beside the new schema. With [`tachyon schema`](/schema-files), the same rename is `--rename pages:layout.hero.heading=title`.

A block type's own slug can't be renamed. Changing it is removing one type and adding another.

Removing a block type that rows still use is a `409`, like dropping a `select` option. Here `quote` is removed while Home and About both have quote rows. The preview counts the documents that won't validate and gives examples:

```json
{
  "diff": {
    "changes": [
      {
        "kind": "block",
        "path": "layout.quote",
        "type": "removed"
      }
    ]
  },
  "documents": 2,
  "examples": [
    {
      "errors": [
        {
          "message": "expected one of: hero, cta",
          "path": "layout.2.blockType"
        }
      ],
      "id": "01a1aaa4-65f8-739a-940d-ade6e53118f8"
    },
    {
      "errors": [
        {
          "message": "expected one of: hero, cta",
          "path": "layout.0.blockType"
        }
      ],
      "id": "01a1aaa4-8a16-7713-80b9-50c02a3868ad"
    }
  ],
  "invalid": 2
}
```

That's the `preview`, trimmed. Send the change again with `"confirm": true` and it goes through. The rows stay stored, but the schema no longer says what's in them, so they read back as their `id` and `blockType` alone, to everyone:

```json
{
  "blockType": "quote",
  "id": "01a1aaa4-8a15-76c8-8e2f-7b545c5ff02b"
}
```

Saving that document's `layout` again without those rows drops them.

## Shared blocks

When `pages`, `posts` and the `site` global all want the same call to action, define it once. A shared block is a schema of its own with `"kind": "block"`:

```sh
curl -X POST localhost:3000/api/admin/collections \
  -H "authorization: Bearer $TOKEN" \
  -H 'content-type: application/json' \
  -d '{"slug": "cta", "kind": "block",
       "labels": {"singular": "Call to action", "plural": "Calls to action"},
       "fields": [
         {"name": "label", "type": "text", "required": true},
         {"name": "href", "type": "text"}
       ]}'
```

```json
{
  "id": "01a1aaa4-4a0b-7578-95a8-ccd0b4fa86e8",
  "schema": {
    "fields": [
      {
        "name": "label",
        "required": true,
        "type": "text"
      },
      {
        "name": "href",
        "type": "text"
      }
    ],
    "kind": "block",
    "labels": {
      "plural": "Calls to action",
      "singular": "Call to action"
    },
    "slug": "cta"
  },
  "schemaVersion": 1
}
```

Any `blocks` field, or a [rich text](/rich-text#block-nodes) field's `blocks`, then names it with `{"blockRef": "cta"}`, beside block types written in place. Rows use it as `"blockType": "cta"`, and its fields, rules and labels apply wherever it's named. The saved schema keeps the reference; documents see the definition.

A shared block has no documents of its own:

- It has no routes: `/api/cta` is a `404`, and it doesn't appear in `/api/access`.
- It takes no `access`, `defaultPopulate` or `url`. Put [field rules](/access-rules#field-rules) on its fields instead.
- Nothing can link to it with a `relationship`.
- A shared block can name other shared blocks, up to 8 deep, but not in a loop. Say `section` is a shared block whose `items` field holds `cta` rows:

  ```json
  {"slug": "section", "kind": "block", "fields": [
    {"name": "heading", "type": "text"},
    {"name": "items", "type": "blocks", "blocks": [{"blockRef": "cta"}]}
  ]}
  ```

  Giving `cta` a `blocks` field that names `section` would close a loop, so that save is a `422` naming the field where the chain comes back round: ``field `items`: shared blocks can't name each other in a loop: cta → section → cta``. A chain of more than 8 is refused the same way: ``field `items`: shared blocks can nest at most 8 deep: …``.
- An admin `condition` in a shared block names fields from the block's own top, such as `{"field": "style", "equals": "link"}`, wherever the block is placed.

### Change a shared block

Change it with `PUT /api/admin/collections/cta`, like any content type. The change reaches every schema that names it, directly or through another shared block, and the preview reports it for each one under `preview.collections`. Renames name the field within the block, `{"note": "remark"}`, and carry the data across in every collection.

If any collection needs confirming, the whole change does. Here `href` becomes required, and one post has a call to action without one (preview trimmed to `posts`):

```json
{
  "detail": "This change removes or retypes fields, or leaves documents that won't validate. Send it again with \"confirm\": true to go ahead.",
  "preview": {
    "collections": {
      "posts": {
        "diff": {
          "changes": [
            {
              "path": "sections.cta.href",
              "type": "optionsChanged"
            }
          ]
        },
        "documents": 1,
        "examples": [
          {
            "errors": [
              {
                "message": "is required",
                "path": "sections.0.href"
              }
            ],
            "id": "01a1aaa4-c720-76b7-8d27-0ea945595cec"
          }
        ],
        "invalid": 1,
        "needsConfirmation": true
      }
    },
    "diff": {
      "changes": [
        {
          "path": "href",
          "type": "optionsChanged"
        }
      ]
    },
    "documents": 3,
    "invalid": 1,
    "needsConfirmation": true
  },
  "status": 409,
  "title": "Confirmation required",
  "type": "about:blank"
}
```

A change that would break something elsewhere is refused outright with a `422`, such as dropping a field another collection's join reads through the block.

### Delete a shared block

`DELETE /api/admin/collections/{slug}` removes a shared block that nothing names, and answers `204`. While a schema still names it, the answer is a `409` saying which:

```json
{
  "detail": "pages uses the shared block `cta`; remove it there first",
  "requestId": "01a1aaa4-c73a-721d-a8c7-de2b60bd9be6",
  "status": 409,
  "title": "Conflict",
  "type": "about:blank"
}
```

If several schemas name it, the detail names the first in slug order that names it directly, whether a collection, a global or another shared block. Collections and globals can't be deleted this way.

### In schema files

`tachyon schema export` writes shared blocks into the file with the rest, and schemas keep their `{"blockRef": "…"}`. `apply` saves shared blocks before the schemas that name them, wherever they sit in the file, and applies the whole file as one change: if any part is refused, nothing changes. A `blockRef` must match a shared block in the file or the database.

Changing a shared block in the file reports what it does to each collection that uses it:

```text
~ change cta: add url (text)
  in pages: add layout.cta.url (text)
```

To rename a field in a shared block, name the block: `--rename cta:label=text`.
