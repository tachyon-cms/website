---
title: Markdown input
description: Write rich text as Markdown, with extensions for blocks, document links and underline, and know exactly what changes on the way through. New in v0.2.0.
---

Writing a JSON tree by hand gets old by the second paragraph. Any [rich text](/rich-text) field also takes Markdown, which TachyonCMS converts and stores as the same tree. It's the format `?format=markdown` writes, too, so you can read a value as Markdown, edit it, and send it back.

Markdown input arrives in v0.2.0.

## Send Markdown

In place of the JSON tree, send `{"format": "markdown", "value": "…"}`. It works on collections, globals and user profiles, and on rich text fields inside groups, arrays and [block rows](/blocks):

```sh
curl -X POST localhost:3000/api/articles \
  -H "authorization: Bearer $TOKEN" \
  -H 'content-type: application/json' \
  -d '{"title": "Clean up", "body": {"format": "markdown", "value": "## Before you start\n\nBack up first. The [backup guide](doc:articles/back-up-first) has the steps.\n\n:::callout{kind=\"warning\"}\nThis empties the **bin**.\n:::\n\n::cta{label=\"Get started\" href=\"/start\"}\n\n- [x] Read the guide\n- [ ] Run <u>clean</u>\n"}}'
```

The `articles` collection and its `callout` and `cta` block types are the ones from [Rich text](/rich-text#add-a-rich-text-field). The value is stored as JSON: a heading, a paragraph with a link to the `back-up-first` article by its ID, two block nodes, and a task list. Read it back with `format=markdown` and you get the Markdown again:

```md
## Before you start

Back up first. The [backup guide](doc:articles/back-up-first) has the steps.

:::callout{kind="warning"}
This empties the **bin**.
:::

::cta{href="/start" label="Get started"}

- [x] Read the guide
- [ ] Run <u>clean</u>
```

The `cta` attributes come back in alphabetical order. Anything else that changes on the way through is listed in [What changes on the way through](#what-changes-on-the-way-through).

A value can be up to 1 MiB.

## What it reads

GitHub-flavoured Markdown, with tables, `~~strikethrough~~` and task lists:

| Markdown | Becomes |
|---|---|
| A paragraph | `paragraph` |
| `#` to `######` | `heading`, levels 1 to 6 |
| `**bold**`, `*italic*`, `~~strike~~`, `` `code` `` | the `bold`, `italic`, `strike` and `code` marks |
| `[text](https://…)`, `<https://…>`, `<ann@example.com>` | a `link` mark; an email address becomes a `mailto:` link |
| `-`, `*` or `+` items | `bulletList` |
| `1.` or `1)` items | `orderedList`, starting at the first number |
| `- [ ]` and `- [x]` items | `taskList` |
| `>` | `blockquote` |
| `---` | `horizontalRule` |
| A fenced or indented code block | `codeBlock`. A fence's whole info string becomes its `language`, so ```` ```js ```` works and ```` ```js title=x ```` is refused by the language rule. |
| A table | `table`, its first row the header |
| A backslash or two spaces at the end of a line | `hardBreak` |

Every link still has to pass the [link rules](/rich-text#links), and everything has to fit the field's `features`, as JSON does.

### Extensions

These cover what plain Markdown has no syntax for:

| Write | For |
|---|---|
| `[text](doc:pages/home)` | A link to the `pages` document whose slug is `home`. |
| `::ref{collection="pages" slug="home"}` | A relationship node. On a line of its own. |
| `::cta{label="Get started" href="/start"}` | A block node of type `cta`, with its fields as attributes. On a line of its own. |
| `:::callout{kind="warning"}`, Markdown, then `:::` | A block node whose one rich text field holds the Markdown between the lines. |
| `<u>…</u>` | Underline. |
| `<br>`, `<br/>` or `<br />` | A hard break. |

That's all the HTML there is. Any other tag is refused.

#### Documents by slug

`doc:` links and `::ref` name a document by its slug, which TachyonCMS swaps for the ID before saving. You can only name documents you can read. Anything else gets the same `422` as a slug that doesn't exist: ``no `articles` document you can read has the slug `nope` ``. One write names at most 1,000 documents this way.

#### Attributes

Values are double-quoted, with `\\`, `\"`, `\n` and `\r` as escapes, and a key appears once. A value for a field that stores text is kept as written. For any other field it's read as JSON where it can be, and kept as text where it can't, which validation then refuses for a field that doesn't store text.

Say `body` also offered a `video` block type, `{"slug": "video", "fields": [{"name": "url", "type": "text", "required": true}, {"name": "start", "type": "number"}, {"name": "autoplay", "type": "checkbox"}]}`. Then `::video{url="/v.mp4" start="30" autoplay="true"}` stores `start` as the number 30 and `autoplay` as `true`, and `start="soon"` is a `422`: `line 1: expected a number` at `body.content.0.attrs.fields.start`.

A `json` field's value must itself be JSON, or the line is refused, so a string is `meta="\"text\""`.

#### Block bodies

The `:::name` form works when the block type has exactly one rich text field. That field holds the body, so it can't also be an attribute. To nest one body inside another, give the outer one more colons, and close each with as many colons as it opened with:

```md
::::callout{kind="note"}
Before you start:

:::aside
Check the backups.
:::
::::
```

This needs `callout`'s rich text field to offer an `aside` block. Inside a body, the Markdown follows the rules of the block's own rich text field: its `features`, its `relationTo` and its block types.

#### Where directives go

Directives start their own line, indented less than four spaces. They can sit in a quote or a list item, after its marker.

## When Markdown is refused

Markdown that doesn't fit is refused with a `422`, never half converted. The message starts with the line it's on:

```json
{
  "errors": [
    {
      "message": "line 3: unknown directive `:::aside`",
      "path": "body"
    }
  ],
  "requestId": "01a1aaa8-b800-743c-8719-ea1034104035",
  "status": 422,
  "title": "Validation failed",
  "type": "about:blank"
}
```

When the Markdown can't be read, `path` is the field. When it reads fine but the result breaks a rule, `path` names the node, as for JSON, and the message still gives the line:

```json
{
  "errors": [
    {
      "message": "line 3: links must start with http://, https://, mailto:, tel:, / or #",
      "path": "body.content.1.content.0.marks.0.attrs.href"
    }
  ],
  "requestId": "01a1aaa8-b80f-7773-8e7b-0804ee80071e",
  "status": 422,
  "title": "Validation failed",
  "type": "about:blank"
}
```

In a block row the path starts with the row, such as `layout.0.intro.content.1`.

What's refused:

| Markdown | Message |
|---|---|
| HTML other than `<u>` and `<br>` | `raw HTML isn't allowed; the only tags are <u>…</u> and <br>` |
| An image | `images arrive with the media library` |
| A link with a title, `[x](/a "Title")` | `link titles aren't kept; leave out the quoted title` |
| A table with aligned columns, `\|:--\|` | `tables can't align columns; leave the colons out of the line under the header` |
| Task items and plain items in one list | `a list can't mix task items with plain ones` |
| A numbered task list, `1. [ ] a` | ``a task list can't be numbered; start its items with `- [ ]` `` |
| A directive whose name isn't a block type of the field | ``unknown directive `::banner` `` |
| A directive with bad attributes, `::cta{label=nope}` | ``expected a directive like `::name{key="value"}`, not `::cta{label=nope}` `` |
| A body for a block type without exactly one rich text field, such as `:::cta` | `` `cta` has no single rich text field to hold text; write it as `::cta{…}` `` |
| A body left open, or closed with the wrong number of colons | ``…is never closed``, ``…doesn't close `:::aside` from line 2`` |
| `::ref` without both `collection` and `slug` | `` `::ref` takes a collection and a slug `` |
| A `doc:` link without a slug, `doc:posts` | `expected doc:<collection>/<slug>, not` … |
| An unclosed `<u>`, or a `</u>` with nothing open | ``…is never closed``, ``…closes nothing`` |
| A directive straight after a task box, `- [ ] ::cta{…}` | `a directive must start its own line, indented less than four spaces` |
| A numbered list starting past 1,000,000 | `expected a whole number from 0 to 1000000`, at the list's `attrs.start` |
| A NUL character anywhere | `must not contain the NUL character` |
| More than 1 MiB | `Markdown can be 1048576 bytes at most`, without a line |

A `format` other than `markdown`, or an object with keys besides `format` and `value`, is refused with `expected {"format": "markdown", "value": "…"}`.

## What changes on the way through

Markdown can't say everything the JSON tree can. When a value goes out as Markdown and comes back in, these are the differences, each one deliberate:

- A table cell holding several blocks becomes one paragraph, with hard breaks between them.
- A table cell holding one block that isn't a paragraph, such as a heading or a code block, becomes a paragraph with the same text.
- Marks come back in one order: bold, italic, underline, strike, link, code. Neighbouring text nodes with the same marks become one.
- Code blocks end their lines with `\n`, never `\r\n` or `\r`.
- An empty paragraph beside other blocks is dropped. A quote, list item, task item or cell holding only an empty paragraph keeps it.
- A numbered list's `"start": 1` isn't written, and neither is a block node's empty `fields`.
- A table without a header row gets its first row as the header.
- A task item with no `checked` comes back unchecked.

Some things have no Markdown at all, so `format=markdown` leaves them out:

- Subscript and superscript come out as plain text.
- Cell spans and widths, and a link's `newTab`, are dropped.
- A link to a document you can't read, or one without a slug, is its text alone. A relationship node like that is left out.

Everything else round-trips exactly, spaces and punctuation included. To keep what Markdown drops, read and write the JSON tree.
