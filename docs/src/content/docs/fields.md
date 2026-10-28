---
title: Fields
description: The field types TachyonCMS v0.1.0 supports, their options, and how documents are validated and updated.
---

Every field has a `name` and a `type`. The type decides what values it accepts; the options on this page narrow that further.

## Field types

| Type | Stores | Type-specific options |
|---|---|---|
| `text` | One line of text, or a list with `hasMany` | `minLength`, `maxLength`, `hasMany`, `minRows`, `maxRows` |
| `textarea` | Longer text | `minLength`, `maxLength` |
| `number` | A number, or a list with `hasMany` | `min`, `max`, `integer`, `hasMany`, `minRows`, `maxRows` |
| `checkbox` | `true` or `false`. Saved schemas call it `boolean`, which works as a name too. | none |
| `date` | A date-time in UTC to the millisecond, such as `2026-10-12T09:30:00Z`, or a plain date like `2026-10-12` with `dateOnly` | `dateOnly` |
| `email` | An email address | none |
| `url` | An `http` or `https` URL | none |
| `select` | One of a fixed list of values, or several with `multiple` | `options`, `multiple` |
| `radio` | One of a fixed list of values | `options` |
| `slug` | Lowercase letters, digits and single hyphens, like `my-first-post` | `from` |
| `code` | Source code as text | `language` |
| `point` | A location as `[longitude, latitude]` | none |
| `json` | Any JSON value | none |
| `relationship` | A link to a document in another collection, or a list of links | `relationTo`, `hasMany`, `maxDepth` |
| `join` | Nothing: lists the documents that link here, on every read | `collection`, `on`, `where`, `defaultLimit`, `defaultSort` |
| `group` | An object of other fields | `fields` |
| `array` | A list of rows, each an object of other fields | `fields`, `minRows`, `maxRows` |

`relationship` is covered in [Relationships](/relationships), and `join` in [Joins and virtual fields](/joins-and-virtual-fields).

A few details:

- `select` and `radio` options are plain values (`["draft", "live"]`) or labelled ones (`[{"label": "Draft", "value": "draft"}]`). Only the value is stored.
- A `slug` with `from` names a text field. When a document arrives without a slug, TachyonCMS makes one from that field: `Tate Modern` becomes `tate-modern`.
- A `point` can be searched by distance with the [`near` filter](/querying#near-a-point).
- Inside a `json` field, `null` is an ordinary value, not a way to clear the field.

## Options every field takes

| Option | Does |
|---|---|
| `required` | The field must have a value. |
| `default` | The value to use when a new document doesn't send one. |
| `unique` | No two documents in the collection may share a value. Deleted documents don't count. |
| `filterable` | Builds a database index on the field, so filters and sorts on it stay fast. |
| `label` | A human name for the field. |
| `admin` | Hints for an editing screen. See [Admin hints](#admin-hints). |
| `access` | Who may read and write this field. See [Access rules](/access-rules#field-rules). |
| `virtual` | Read the value through a relationship instead of storing it. See [Joins and virtual fields](/joins-and-virtual-fields). |

## An example

This adds seven fields to `posts`, including a select, a list of text, a group and an array:

```sh
curl -X PUT localhost:3000/api/admin/collections/posts \
  -H "authorization: Bearer $TOKEN" \
  -H 'content-type: application/json' \
  -d '{"schema": {"slug": "posts", "fields": [
        {"name": "title", "type": "text", "required": true, "maxLength": 120},
        {"name": "publishedOn", "type": "date", "dateOnly": true},
        {"name": "summary", "type": "textarea"},
        {"name": "kind", "type": "select", "default": "article",
         "options": [{"label": "Article", "value": "article"}, {"label": "Note", "value": "note"}]},
        {"name": "tags", "type": "text", "hasMany": true, "maxRows": 5},
        {"name": "seo", "type": "group", "fields": [
          {"name": "title", "type": "text", "maxLength": 60},
          {"name": "description", "type": "textarea"}
        ]},
        {"name": "links", "type": "array", "fields": [
          {"name": "label", "type": "text", "required": true},
          {"name": "url", "type": "url", "required": true}
        ]}
      ]}}'
```

Create a post that fills them:

```sh
curl -X POST localhost:3000/api/posts \
  -H "authorization: Bearer $TOKEN" \
  -H 'content-type: application/json' \
  -d '{"title": "Shipping v0.1.0", "publishedOn": "2026-10-27", "kind": "article",
       "tags": ["release", "rust"],
       "seo": {"title": "TachyonCMS v0.1.0", "description": "The first release."},
       "links": [{"label": "Release notes", "url": "https://github.com/tachyon-cms/tachyoncms/releases/tag/v0.1.0"}]}'
```

```json
{
  "createdAt": "2026-10-28T21:17:05.883493Z",
  "id": "01a1845f-afdb-75d9-af23-79cecf8ebabc",
  "kind": "article",
  "links": [
    {
      "label": "Release notes",
      "url": "https://github.com/tachyon-cms/tachyoncms/releases/tag/v0.1.0"
    }
  ],
  "publishedOn": "2026-10-27",
  "seo": {
    "description": "The first release.",
    "title": "TachyonCMS v0.1.0"
  },
  "status": "published",
  "tags": [
    "release",
    "rust"
  ],
  "title": "Shipping v0.1.0",
  "updatedAt": "2026-10-28T21:17:05.883493Z"
}
```

## Validation errors

A document that doesn't fit gets a `422` listing every problem at once. Each `path` points at the field, through groups (`seo.title`) and into list rows by position (`links.0.url`):

```sh
curl -X POST localhost:3000/api/posts \
  -H "authorization: Bearer $TOKEN" \
  -H 'content-type: application/json' \
  -d '{"title": "", "kind": "essay",
       "seo": {"title": "This search title is far too long to fit in sixty characters at all"},
       "links": [{"label": "Docs", "url": "not a url"}]}'
```

```json
{
  "errors": [
    {
      "message": "is required",
      "path": "title"
    },
    {
      "message": "expected one of: article, note",
      "path": "kind"
    },
    {
      "message": "must be at most 60 characters",
      "path": "seo.title"
    },
    {
      "message": "expected an http or https URL",
      "path": "links.0.url"
    }
  ],
  "requestId": "01a1845f-afcb-7036-9452-7c91cfe02c2b",
  "status": 422,
  "title": "Validation failed",
  "type": "about:blank"
}
```

A `unique` value that's already taken is a `422` on that field too:

```json
{
  "errors": [
    {
      "message": "must be unique; another document already uses this value",
      "path": "slug"
    }
  ],
  "requestId": "01a18460-5b9a-744c-9fce-3e15fc4903b5",
  "status": 422,
  "title": "Validation failed",
  "type": "about:blank"
}
```

## Updating: send only what changed

`PATCH` merges what you send into the stored document:

- A field inside a group changes on its own. Sending `seo.title` leaves `seo.description` as it was.
- A list (`hasMany`, `array`, a `multiple` select) is replaced whole.
- `null` clears a field, wherever it sits.

```sh
curl -X PATCH localhost:3000/api/posts/01a1845f-afdb-75d9-af23-79cecf8ebabc \
  -H "authorization: Bearer $TOKEN" \
  -H 'content-type: application/json' \
  -d '{"seo": {"title": "TachyonCMS 0.1.0 is out"}, "tags": null}'
```

```json
{
  "createdAt": "2026-10-28T21:17:05.883493Z",
  "id": "01a1845f-afdb-75d9-af23-79cecf8ebabc",
  "kind": "article",
  "links": [
    {
      "label": "Release notes",
      "url": "https://github.com/tachyon-cms/tachyoncms/releases/tag/v0.1.0"
    }
  ],
  "publishedOn": "2026-10-27",
  "seo": {
    "description": "The first release.",
    "title": "TachyonCMS 0.1.0 is out"
  },
  "status": "published",
  "title": "Shipping v0.1.0",
  "updatedAt": "2026-10-28T21:17:05.902129Z"
}
```

`seo.description` kept its value, and `tags` is gone.

## Layout fields

Three types arrange fields on an editing screen without changing the shape of the data. Their fields are stored as if they sat directly in the parent:

| Type | Shows its `fields` | Options |
|---|---|---|
| `row` | side by side | `fields` |
| `collapsible` | in a section that can fold away, titled by its `label` | `fields`, `initiallyCollapsed` |
| `tabs` | in tabs, each `{"label": "…", "fields": […]}` | `tabs` |

A tab with a `name` is the exception: it nests its fields under that name, like a group. Layout fields have no data, so they can't carry access rules; put rules on the fields inside.

## Admin hints

`admin` on any field holds hints for an editing screen. The API stores them and returns them with the schema, but doesn't enforce them. v0.1.0 has no admin screen yet.

| Hint | Value |
|---|---|
| `description` | Help text shown with the field. |
| `placeholder` | Placeholder text. |
| `hidden` | `true` to hide the field. |
| `readOnly` | `true` to show the field without letting people edit it. |
| `position` | `main` (the default) or `sidebar`. |
| `width` | A width such as `50%` or `240px`. |
| `condition` | Show the field only when another field matches: `{"field": "kind", "equals": "note"}`. The test is one of `equals`, `notEquals`, `in` or `exists`. |
