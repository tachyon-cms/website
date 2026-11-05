---
title: Rich text
description: Store formatted text as a JSON tree, choose what each field allows, and read it back as JSON, HTML, Markdown or plain text. New in v0.2.0.
---

A `richText` field holds formatted writing: headings, lists, links, tables, quotes, and [blocks](/blocks) placed in the flow of the text. It's stored as a tree of JSON nodes, so nothing has to parse HTML to know what's in it, and you can read it back as HTML, Markdown or plain text when that's what your front end wants. You can also write it as [Markdown](/markdown-input).

Rich text arrives in v0.2.0.

## Add a rich text field

This `articles` collection has a short `summary` that allows only bold, italic and links, and a full `body` that allows everything, links to `articles` and `pages`, and holds two block types:

```sh
curl -X POST localhost:3000/api/admin/collections \
  -H "authorization: Bearer $TOKEN" \
  -H 'content-type: application/json' \
  -d '{"slug": "articles", "url": "/blog/{slug}", "fields": [
        {"name": "title", "type": "text", "required": true},
        {"name": "slug", "type": "slug", "from": "title"},
        {"name": "summary", "type": "richText", "features": ["bold", "italic", "link"]},
        {"name": "body", "type": "richText", "relationTo": ["articles", "pages"], "blocks": [
          {"slug": "callout", "fields": [
            {"name": "kind", "type": "select", "options": ["note", "warning"]},
            {"name": "text", "type": "richText"}
          ]},
          {"blockRef": "cta"}
        ]}
      ]}'
```

`cta` is a [shared block](/blocks#shared-blocks), and `pages` is the collection from [Blocks](/blocks).

| Option | Does | Default |
|---|---|---|
| `features` | What editors may use. Paragraphs and plain text are always allowed. | everything |
| `relationTo` | The collections links and relationship nodes may point at. | none, so no links to documents |
| `blocks` | Block types the text may hold as block nodes, written in place or as `{"blockRef": "…"}`, as in a [blocks field](/blocks#add-a-blocks-field). | none |

The features are `bold`, `italic`, `underline`, `strike`, `subscript`, `superscript`, `code`, `link`, `heading`, `bulletList`, `orderedList`, `taskList`, `blockquote`, `horizontalRule`, `hardBreak`, `table`, `codeBlock`, `relationship` and `block`.

With a `features` list, `blocks` needs `block` in it, and `relationTo` needs `link` or `relationship`. Otherwise the save is refused, so a field never offers something no editor could use.

The collection's `url` says where its documents live on your site. `{slug}` is filled from the document's `slug` field; any stored top-level `text` or `slug` field works, and the URL must start with `http://`, `https://`, `/` or `#`. Only collections take one. It's what links to these documents point at in [HTML output](#read-it-as-html-markdown-or-text).

## Write rich text

A value is a `doc` node whose `content` lists block-level nodes. Text sits in `text` nodes, with `marks` for formatting:

```sh
curl -X POST localhost:3000/api/articles \
  -H "authorization: Bearer $TOKEN" \
  -H 'content-type: application/json' \
  -d '{"title": "Back up first", "body": {"type": "doc", "content": [
        {"type": "heading", "attrs": {"level": 2}, "content": [{"type": "text", "text": "Before you start"}]},
        {"type": "paragraph", "content": [
          {"type": "text", "text": "It takes "},
          {"type": "text", "text": "two", "marks": [{"type": "bold"}]},
          {"type": "text", "text": " minutes. Start from the "},
          {"type": "text", "text": "home page", "marks": [{"type": "link", "attrs":
            {"doc": {"relationTo": "pages", "value": "01a1aaa4-65f8-739a-940d-ade6e53118f8"}}}]},
          {"type": "text", "text": "."}
        ]},
        {"type": "block", "attrs": {"blockType": "callout", "fields": {
          "kind": "warning",
          "text": {"type": "doc", "content": [
            {"type": "paragraph", "content": [{"type": "text", "text": "This empties the bin."}]}
          ]}
        }}}
      ]}}'
```

It's stored as sent, with an `id` added to the block node. Read back at the default `depth=1`, the link holds the populated page in place of its ID, as a [relationship](/relationships) would. At `depth=0` it stays an ID:

```sh
curl -g 'localhost:3000/api/articles/01a1aaa5-188a-76b6-a9cb-8cce711355ed?depth=0&select[body]=true'
```

```json
{
  "body": {
    "content": [
      {
        "attrs": {
          "level": 2
        },
        "content": [
          {
            "text": "Before you start",
            "type": "text"
          }
        ],
        "type": "heading"
      },
      {
        "content": [
          {
            "text": "It takes ",
            "type": "text"
          },
          {
            "marks": [
              {
                "type": "bold"
              }
            ],
            "text": "two",
            "type": "text"
          },
          {
            "text": " minutes. Start from the ",
            "type": "text"
          },
          {
            "marks": [
              {
                "attrs": {
                  "doc": {
                    "relationTo": "pages",
                    "value": "01a1aaa4-65f8-739a-940d-ade6e53118f8"
                  }
                },
                "type": "link"
              }
            ],
            "text": "home page",
            "type": "text"
          },
          {
            "text": ".",
            "type": "text"
          }
        ],
        "type": "paragraph"
      },
      {
        "attrs": {
          "blockType": "callout",
          "fields": {
            "kind": "warning",
            "text": {
              "content": [
                {
                  "content": [
                    {
                      "text": "This empties the bin.",
                      "type": "text"
                    }
                  ],
                  "type": "paragraph"
                }
              ],
              "type": "doc"
            }
          },
          "id": "01a1aaa5-1887-7343-9e5a-653ba41ee19f"
        },
        "type": "block"
      }
    ],
    "type": "doc"
  },
  "id": "01a1aaa5-188a-76b6-a9cb-8cce711355ed"
}
```

A `PATCH` replaces a rich text value whole. A required rich text field counts as empty when it has no nodes, or only paragraphs holding nothing but spaces and line breaks.

## Nodes

| Node | Holds | Attributes | Feature |
|---|---|---|---|
| `paragraph` | text and hard breaks | none | always allowed |
| `text` | `text`, not empty, and optional `marks` | none | always allowed |
| `heading` | text and hard breaks | `level`, required, 1 to 6 | `heading` |
| `bulletList` | `listItem`s | none | `bulletList` |
| `orderedList` | `listItem`s | `start`, 0 to 1,000,000 | `orderedList` |
| `listItem` | block-level nodes | none | with its list |
| `taskList` | `taskItem`s | none | `taskList` |
| `taskItem` | block-level nodes | `checked`, `true` or `false` | with its list |
| `blockquote` | block-level nodes | none | `blockquote` |
| `horizontalRule` | nothing | none | `horizontalRule` |
| `hardBreak` | nothing | none | `hardBreak` |
| `codeBlock` | text without marks | `language`, up to 32 letters, digits, `_`, `+` or `-` | `codeBlock` |
| `table` | `tableRow`s | none | `table` |
| `tableRow` | `tableCell`s and `tableHeader`s | none | with its table |
| `tableCell`, `tableHeader` | block-level nodes | `colspan` and `rowspan`, 1 to 1,000; `colwidth`, a width in pixels per column spanned | with its table |
| `relationship` | nothing | `relationTo` and `value`, a document | `relationship` |
| `block` | nothing | `blockType`, `fields` and `id` | `block` |

The block-level nodes are `paragraph`, `heading`, the three lists, `blockquote`, `horizontalRule`, `codeBlock`, `table`, `relationship` and `block`. A node that holds block-level nodes, or list items, or rows, needs at least one. Every row of a table spans the same number of columns, and no cell reaches past the last row.

Images aren't here yet. They're coming with the media library.

## Marks

| Mark | Feature |
|---|---|
| `bold`, `italic`, `underline`, `strike` | the mark's own name |
| `subscript`, `superscript` | the mark's own name |
| `code` | `code` |
| `link` | `link` |

Each mark goes on a text node at most once. Text in a code block takes no marks.

### Links

A link's `attrs` hold either an `href` or a `doc`, not both:

```json
{"type": "link", "attrs": {"href": "https://example.com/docs", "newTab": true}}
```

```json
{"type": "link", "attrs": {"doc": {"relationTo": "pages", "value": "01a1aaa4-65f8-739a-940d-ade6e53118f8"}}}
```

- An `href` starts with `http://`, `https://`, `mailto:`, `tel:`, `/` or `#`. The scheme matches in any case and is stored lowercased, so `HTTPS://` is saved as `https://`. `javascript:`, `data:` and `//example.com` are refused, and so is any `href` holding whitespace, a control character or a backslash.
- A `doc` names a document in one of the field's `relationTo` collections by its ID. Linking to a document you can't read gets the same `422` as linking to one that doesn't exist.
- `"newTab": true` opens the link in a new tab. Raw `target`, `rel` and `class` attributes are refused.

Rich text links count as links everywhere else too: a document they point at can't be deleted while they do, and they show up in its [`/references`](/relationships#what-links-here). There, rich text counts its links, relationship nodes and block nodes in document order: the third is `body.2`, and a link inside the fields of the block node at `body.1` is `body.1.who`.

### Relationship nodes

A `relationship` node puts a document in the flow, such as an author card or a related article:

```json
{"type": "relationship", "attrs": {"relationTo": "pages", "value": "01a1aaa4-65f8-739a-940d-ade6e53118f8"}}
```

It's populated on read like a link.

### Block nodes

A `block` node holds one row of any block type the field's `blocks` lists. `fields` holds that type's fields, checked as a [blocks](/blocks) row's are, and field rules apply to them per node type in the same way. Each node gets an `id` if it has none. An `id` can appear only once in a whole value, rich text inside block nodes included.

## Limits

- One value nests at most 32 levels deep and holds at most 50,000 nodes. Both count the rich text inside its block nodes.
- No string anywhere in it may contain the NUL character.

## Validation errors

A value that doesn't fit is a `422` naming the node at fault. Here `summary` gets a heading it doesn't allow, and `body` a `javascript:` link:

```json
{
  "errors": [
    {
      "message": "the `heading` feature isn't turned on for this field",
      "path": "summary.content.0"
    },
    {
      "message": "links must start with http://, https://, mailto:, tel:, / or #",
      "path": "body.content.0.content.0.marks.0.attrs.href"
    }
  ],
  "requestId": "01a1aaa5-34d1-721e-b506-2f255f812cc0",
  "status": 422,
  "title": "Validation failed",
  "type": "about:blank"
}
```

Each field reports the first node at fault.

## Filtering

Rich text can only be filtered on whether it has a value: `where[body][exists]=true`. Nothing inside it can be named in a filter, any other operator is a `400` (`where[body][equals]: equals can't be used on this field`), and it can't be sorted on.

## Narrowing a field later

Taking a feature off a field, or a block type out of its `blocks`, while documents use it works like removing a `select` option. You get a `409` with a [preview](/content-types#change-a-content-type) that counts the documents that won't validate, with examples, and the change goes through when you send it again with `"confirm": true`. Stored text is never rewritten: it stays as it is, and the next write to it has to fit the new rules.

## Read it as HTML, Markdown or text

Add `format` to any read of a collection or a global, single or list, and every rich text field comes back as a string, in populated and joined documents too:

| `format` | Gives |
|---|---|
| `json` | The stored tree. The default. |
| `html` | HTML, escaped, with links checked again on the way out. |
| `markdown` | Markdown, in the form [Markdown input](/markdown-input) reads back. |
| `text` | The words alone. |

`GET /api/users` takes it as any list does, and `GET /api/users/{id}` takes `format` too, but not `depth` or `select`. Any other `format` is a `400`: `format must be json, html, markdown or text`.

```sh
curl -g 'localhost:3000/api/articles/01a1aaa5-188a-76b6-a9cb-8cce711355ed?format=html&select[body]=true'
```

```json
{
  "body": "<h2 id=\"before-you-start\">Before you start</h2><p>It takes <strong>two</strong> minutes. Start from the <a href=\"/home\">home page</a>.</p><div data-block=\"callout\" data-kind=\"warning\" data-text=\"{&quot;content&quot;:[{&quot;content&quot;:[{&quot;text&quot;:&quot;This empties the bin.&quot;,&quot;type&quot;:&quot;text&quot;}],&quot;type&quot;:&quot;paragraph&quot;}],&quot;type&quot;:&quot;doc&quot;}\"></div>",
  "id": "01a1aaa5-188a-76b6-a9cb-8cce711355ed"
}
```

The same body with `format=markdown`:

```json
{
  "body": "## Before you start\n\nIt takes **two** minutes. Start from the [home page](doc:pages/home).\n\n:::callout{kind=\"warning\"}\nThis empties the bin.\n:::",
  "id": "01a1aaa5-188a-76b6-a9cb-8cce711355ed"
}
```

And with `format=text`:

```json
{
  "body": "Before you start\n\nIt takes two minutes. Start from the home page.\n\nThis empties the bin.",
  "id": "01a1aaa5-188a-76b6-a9cb-8cce711355ed"
}
```

### HTML

- Each heading gets an `id` made from its text, unique within the value: `intro`, then `intro-2`.
- A link to a document goes to its collection's `url`, here `/{slug}` for `pages`. Without a `url`, it's the link text alone. `newTab` links get `target="_blank" rel="noopener noreferrer"`.
- A block node is a `<div data-block="…">` with its fields as `data-*` attributes. A camelCase name is dashed: `ctaLabel` becomes `data-cta-label`. Anything that isn't a plain value is written as JSON, rich text in the block included, as `data-text` shows above. Render those blocks yourself from the attributes, or read them with `format=json`.
- A relationship node is a `<div data-relationship>` around the linked document's first text field: `<div data-relationship>Home</div>`.
- A task list is `<ul data-task-list>`, its items `<li data-checked="true">` or `"false"`. A code block with a language is `<pre><code class="language-sh">`.

### Text

Blocks are a blank line apart, list items and table rows a line each, and table cells a tab apart. Links are their text, and relationship nodes and horizontal rules leave nothing. A block node gives the text of the rich text in its fields.

### Markdown

[Markdown input](/markdown-input) covers the syntax, including what doesn't survive the trip. A link to a document is written `doc:<collection>/<slug>` when the document has a slug you can read, and is its text alone otherwise.

## What stays hidden

What you can't read stays hidden in every format:

- A field you can't read isn't there, inside block nodes too.
- A link to a document you can't read is its text alone. In JSON it stays a bare ID, whatever the `depth`.
- A relationship node pointing at a document you can't read is left out of HTML, Markdown and text. In JSON it stays, with a bare ID as its `value`, as a hidden link does.
