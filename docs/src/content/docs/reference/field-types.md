---
title: Field types
description: Every field type in TachyonCMS, every option it takes, the values it accepts and the validation messages. Blocks and rich text are new in v0.2.0.
---

Every field type, with its options, defaults and the values it accepts. For a guided introduction, see [Fields](/fields).

A field is a JSON object in a schema's `fields` list, such as `{"name": "title", "type": "text", "required": true}`. A key the server doesn't know is refused by name (``field `title`: unknown option `maxLenght` ``), and so is an unknown `type`.

## Options on every field

| Option | Type | Default | Description |
|---|---|---|---|
| `name` | string | none | Required on every field except `row`, `collapsible` and `tabs`. 1 to 64 letters, digits and underscores, starting with a letter. `id`, `createdAt`, `updatedAt` and `status` are reserved at the top level, and in `users` so are `email`, `role`, `password` and `currentPassword`. Inside a block type, `id` and `blockType` are. |
| `type` | string | none | Required. One of the types on this page. |
| `label` | string | none | A human name. Titles a `collapsible`. |
| `required` | boolean | `false` | The field must have a value. |
| `default` | any | none | Used when a new document doesn't send the field. Must itself be a valid value. |
| `unique` | boolean | `false` | No two live documents may share a value. Top-level fields only, and only the types in [Unique and filterable](#unique-and-filterable). |
| `filterable` | boolean | `false` | Builds a database index so filters and sorts on the field stay fast. Same limits as `unique`. |
| `admin` | object | `{}` | Hints for an editing screen. See [Admin hints](#admin-hints). |
| `virtual` | string | none | A path through a relationship, such as `author.name`. The value is read from there, never stored. See [Joins and virtual fields](/joins-and-virtual-fields). |
| `access` | object | none | Field rules: `read`, `create` and `update`. See [Field rules](/access-rules#field-rules). |

## Text and numbers

### `text`

One line of text, or a list of them with `hasMany`. Stored as a string, or an array of strings.

| Option | Type | Default | Description |
|---|---|---|---|
| `minLength` | integer | none | Fewest characters. Counts characters, not bytes. |
| `maxLength` | integer | none | Most characters. |
| `hasMany` | boolean | `false` | Store a list of strings. |
| `minRows` | integer | none | Fewest items. Only with `hasMany`. |
| `maxRows` | integer | none | Most items. Only with `hasMany`. |

### `textarea`

Longer text. Stored as a string.

| Option | Type | Default | Description |
|---|---|---|---|
| `minLength` | integer | none | Fewest characters. |
| `maxLength` | integer | none | Most characters. |

### `number`

A number, or a list of them with `hasMany`. Stored as a JSON number.

| Option | Type | Default | Description |
|---|---|---|---|
| `min` | number | none | Smallest value allowed. |
| `max` | number | none | Largest value allowed. |
| `integer` | boolean | `false` | Whole numbers only. |
| `hasMany` | boolean | `false` | Store a list of numbers. |
| `minRows` | integer | none | Fewest items. Only with `hasMany`. |
| `maxRows` | integer | none | Most items. Only with `hasMany`. |

### `code`

Source code, stored as a string.

| Option | Type | Default | Description |
|---|---|---|---|
| `language` | string | none | The language for an editor's highlighting, such as `rust` or `html`. Not checked. |

### `json`

Any JSON value. No options of its own. `null` inside the value is ordinary data; `null` as the whole value clears the field. A `json` field can't be filtered, sorted, unique or filterable.

## Choices and flags

### `boolean`

`true` or `false`. No options of its own. `checkbox` is accepted as another name for it, and saved schemas show `boolean`.

### `select`

One of a fixed list of values, or several with `multiple`. Stored as a string, or an array of strings.

| Option | Type | Default | Description |
|---|---|---|---|
| `options` | array | none | Required, at least one. Each is a value (`"draft"`) or `{"label": "Draft", "value": "draft"}`. Values must be unique. Only the value is stored. |
| `multiple` | boolean | `false` | Store a list of values. |

### `radio`

One of a fixed list of values. Stored as a string.

| Option | Type | Default | Description |
|---|---|---|---|
| `options` | array | none | Required, at least one, as for `select`. |

## Dates, addresses and places

### `date`

A date-time, or a plain date with `dateOnly`. A date-time is sent in RFC 3339 form with any offset and stored in UTC to the millisecond: `2026-10-12T09:30:00+02:00` is stored as `2026-10-12T07:30:00.000Z`. Years run from 0 to 9999.

| Option | Type | Default | Description |
|---|---|---|---|
| `dateOnly` | boolean | `false` | Store a date like `2026-10-12`, with no time. |

### `email`

An email address, stored as a string. No options of its own.

### `url`

An `http` or `https` URL with a host, stored as a string. No options of its own.

### `point`

A location as `[longitude, latitude]`, such as `[-0.1276, 51.5072]`. Longitude runs from -180 to 180 and latitude from -90 to 90. No options of its own. Filter it by distance with [`near`](/reference/filters#near); it can't be sorted, unique or filterable.

### `slug`

A URL-friendly name: lowercase letters, digits and single hyphens, like `my-first-post`, up to 200 bytes. A slug is always unique and must be a top-level field.

| Option | Type | Default | Description |
|---|---|---|---|
| `from` | string | none | A top-level `text` field (without `hasMany`) to make the slug from when a document arrives without one: `Shipping v0.1.0` becomes `shipping-v0-1-0`. |

## Links

### `relationship`

A link to a document, or a list of links with `hasMany`. With one collection in `relationTo`, a link is the document's ID. With several, it's `{"relationTo": "<collection>", "value": "<document ID>"}`. The linked document must exist and be readable by whoever saves the link. See [Relationships](/relationships).

| Option | Type | Default | Description |
|---|---|---|---|
| `relationTo` | string or array | none | Required. The collection slug, or several. Each must be an existing collection (not a global) or this collection. |
| `hasMany` | boolean | `false` | Store a list of links. |
| `maxDepth` | integer, 0 to 5 | none | Populate through this field at most this deep, whatever `depth` asks for. |

### `join`

The documents of another collection whose relationship links here, read fresh on every request and never stored. Returned as `{"docs": […], "hasNextPage": …}`. A join can't be `required`, `unique`, `filterable` or `virtual`, have a `default`, sit inside an `array`, or belong to a global. See [Join fields](/joins-and-virtual-fields#join-fields).

| Option | Type | Default | Description |
|---|---|---|---|
| `collection` | string | none | Required. The collection to read from. |
| `on` | string | none | Required. The path of the relationship in `collection` that links here, such as `category` or `links.target`. |
| `where` | object | none | A filter always applied, such as `{"published": {"equals": "true"}}`. Uses the [filter operators](/reference/filters#operators) except `near`. |
| `defaultLimit` | integer, 1 to 100 | `10` | Documents per join, unless the request asks otherwise. |
| `defaultSort` | string | newest first | A field of `collection` to sort by, with `-` for descending. |

## Structure

### `group`

An object of other fields. Stored as a JSON object. Fields inside a group can't be `unique`, `filterable` or a `slug`.

| Option | Type | Default | Description |
|---|---|---|---|
| `fields` | array | none | Required. The fields inside. |

### `array`

A list of rows, each an object of other fields. Stored as an array of objects.

| Option | Type | Default | Description |
|---|---|---|---|
| `fields` | array | none | Required. The fields of each row. |
| `minRows` | integer | none | Fewest rows. |
| `maxRows` | integer | none | Most rows. |

## Blocks and rich text

New in v0.2.0.

### `blocks`

A list of rows, each one of several block types with its own fields. Stored as an array of objects, each `{"id": "<uuid>", "blockType": "<slug>", ...that type's fields}`. A row sent without an `id` gets one; a row sent with one keeps it. With `required`, an empty list counts as missing. See [Blocks](/blocks).

| Option | Type | Default | Description |
|---|---|---|---|
| `blocks` | array | none | Required, at least one. Each is a block type, `{"slug", "fields", "labels"}`, or a [shared block](/blocks#shared-blocks), `{"blockRef": "<slug>"}`. |
| `minRows` | integer | none | Fewest rows. |
| `maxRows` | integer | none | Most rows. |

### Block types

Each entry in a `blocks` list, on a `blocks` field or a `richText` field, is a block type written in place or a shared block. One written in place takes:

| Key | Type | Default | Description |
|---|---|---|---|
| `slug` | string | none | Required. A lowercase letter, then lowercase letters, digits and underscores, 64 at most. Unique within the field. Rows name it as `blockType`. |
| `fields` | array | none | Required. The type's fields. None may be `unique`, `filterable` or a `slug`, or a `join`. |
| `labels` | object | none | `{"singular": "…", "plural": "…"}`, what an editor calls its rows. |

A `blockRef` must name a shared block, a schema saved with `"kind": "block"`. Shared blocks can name other shared blocks, up to 8 deep, and never in a loop.

### `richText`

Formatted text, stored as a tree of nodes: `{"type": "doc", "content": […]}`. Can also be sent as Markdown, `{"format": "markdown", "value": "…"}`. With `required`, a value with no nodes, or only blank paragraphs, counts as missing. Can't be `unique` or `filterable`. See [Rich text](/rich-text) for the nodes and marks, and [Markdown input](/markdown-input).

| Option | Type | Default | Description |
|---|---|---|---|
| `features` | array | everything | What the field allows, from `bold`, `italic`, `underline`, `strike`, `subscript`, `superscript`, `code`, `link`, `heading`, `bulletList`, `orderedList`, `taskList`, `blockquote`, `horizontalRule`, `hardBreak`, `table`, `codeBlock`, `relationship` and `block`. Each at most once. Paragraphs and plain text are always allowed. |
| `relationTo` | array | `[]` | Collections that links and relationship nodes may point at. Each must exist. With `features`, needs `link` or `relationship` in it. |
| `blocks` | array | `[]` | Block types the text may hold as block nodes, as for a [`blocks`](#blocks) field. With `features`, needs `block` in it. |

One value nests at most 32 levels deep and holds at most 50,000 nodes, counting the rich text inside its block nodes.

### Refused when you save

| Message | Cause |
|---|---|
| ``field `layout`: blocks needs at least one block type`` | An empty `blocks` list on a `blocks` field. |
| ``field `layout`: block slug `Hero` must start with a lowercase letter and use only lowercase letters, digits and underscores (64 at most)`` | A bad block slug. |
| ``field `layout`: block `hero` is defined more than once`` | Two block types with one slug. |
| ``field `layout`: minRows is greater than maxRows`` | |
| ``field name `blockType` is reserved`` | A block type with a field called `id` or `blockType`. |
| ``field `layout`: blockRef `nope` doesn't match a shared block`` | A `blockRef` to a slug that isn't a shared block. |
| ``field `inner`: shared blocks can't name each other in a loop: cta → section → cta`` | Shared blocks naming each other in a circle. |
| ``field `inner`: shared blocks can nest at most 8 deep: …`` | A chain of shared blocks more than 8 deep. |
| ``field `body`: features lists `bold` twice`` | |
| ``field `body`: blocks needs `block` in features, or no features list`` | |
| ``field `body`: relationTo needs `link` or `relationship` in features, or no features list`` | |
| ``field `body`: richText fields can't be unique or filterable`` | |
| ``field `body`: relationTo lists `notes` twice`` | |
| ``field `body`: relationTo `Bad` isn't a valid collection slug`` | |
| ``relationTo `nope` doesn't match an existing collection`` | A `relationTo` collection that doesn't exist. |
| `labels: only shared blocks take labels` | `labels` on a collection or global. |
| `access: a shared block has no documents, so it takes no access rules; put rules on its fields` | `access` on a shared block. |
| `defaultPopulate: a shared block is never populated, so it can't have one` | `defaultPopulate` on a shared block. |
| `url: only collections have pages of their own` | `url` on a global or shared block. |
| ``url: `{nope}` must name a top-level text or slug field`` | A placeholder for a field that isn't a stored top-level `text` or `slug`. A virtual one gets ``url: `{name}` is virtual; a url needs a stored text or slug field``. |
| ``url: a `{` is never closed`` | |
| `url: must start with http://, https://, / or #` | |

An unknown feature is a `400`: ``field `body`: unknown variant `sparkle`, expected one of `bold`, …``.

## Layout

Layout fields arrange other fields on an editing screen. Their fields are stored as if they sat directly in the parent, so layout changes no data. They take no `name`, can't be `required`, `unique` or `filterable`, have no `default`, and can't carry `access` rules. A `collapsible` needs a `label`; `row` and `tabs` take none.

### `row`

Shows its fields side by side.

| Option | Type | Default | Description |
|---|---|---|---|
| `fields` | array | none | Required. The fields to show. |

### `collapsible`

Shows its fields in a section that can fold away, titled by its `label`.

| Option | Type | Default | Description |
|---|---|---|---|
| `initiallyCollapsed` | boolean | `false` | Start folded. |
| `fields` | array | none | Required. The fields to show. |

### `tabs`

Shows fields in tabs.

| Option | Type | Default | Description |
|---|---|---|---|
| `tabs` | array | none | Required, at least one. Each tab is `{"label": "…", "fields": […]}`, plus an optional `name`. Every tab needs a label. A named tab nests its fields under that name, like a `group`. |

## Unique and filterable

`unique`, `filterable` and `slug` need a single comparable value at the top level of the schema. They work on:

- `text` and `number` without `hasMany`;
- `textarea`, `boolean`, `date`, `email`, `url`, `radio`, `code` and `slug`;
- `select` without `multiple`;
- `relationship` with one collection in `relationTo` and no `hasMany`.

Elsewhere they're refused, such as ``field `tags`: select fields with multiple values can't be unique or filterable``.

## Admin hints

`admin` holds hints for an editing screen. The API stores them and returns them with the schema, but doesn't enforce them.

| Hint | Type | Default | Description |
|---|---|---|---|
| `description` | string | none | Help text. |
| `placeholder` | string | none | Placeholder text. |
| `hidden` | boolean | `false` | Hide the field. |
| `readOnly` | boolean | `false` | Show the field without letting people edit it. |
| `position` | `main` or `sidebar` | `main` | Where the field sits. |
| `width` | string | none | Such as `50%` or `240px`. |
| `condition` | object | none | Show the field only when another matches: `{"field": "kind", "equals": "note"}`. The test is one of `equals`, `notEquals`, `in` (an array) or `exists` (a boolean). |

## Validation messages

A document that doesn't fit gets a `422` with one entry per problem (see [Errors](/reference/errors#validation-errors)). These are the messages:

| Message | Field types |
|---|---|
| `is required` | any, with `required` |
| `unknown field` | any: the body names a field the schema doesn't have |
| `expected text` | `text`, `textarea`, `code` |
| `must be at least N characters`, `must be at most N characters` | `text`, `textarea` |
| `expected a number`, `expected a whole number` | `number` |
| `must be at least N`, `must be at most N` | `number` with `min` or `max` |
| `expected true or false` | `boolean` |
| `expected a date like 2026-10-12` | `date` with `dateOnly` |
| `expected a date-time like 2026-10-12T09:30:00Z` | `date` |
| `expected an email address` | `email` |
| `expected an http or https URL` | `url` |
| `expected one of: a, b` | `select`, `radio`; a `blocks` row's `blockType` |
| `expected a list of: a, b` | `select` with `multiple` |
| `expected lowercase letters, digits and single hyphens, like my-first-post` | `slug` |
| `expected [longitude, latitude], like [-0.1276, 51.5072]` | `point` |
| `expected a document ID`, `expected a list of document IDs` | `relationship` |
| `expected a link like {"relationTo": "<collection>", "value": "<document ID>"} to one of: …` | `relationship` with several collections |
| `doesn't match any document in the related collection` | `relationship`: no such document, or one you can't read |
| `expected a list` | `hasMany`, `multiple`, `array`, `blocks` |
| `must have at least N rows`, `must have at most N rows` | `hasMany` with `minRows`/`maxRows`, `array`, `blocks` |
| `expected an object` | `group`, an `array` or `blocks` row |
| `this row ID is used twice`, `expected a row ID` | a `blocks` row's `id` |
| `expected a rich text document like {"type": "doc", "content": []}` | `richText` |
| ``the `heading` feature isn't turned on for this field`` | `richText`, at the node |
| `links must start with http://, https://, mailto:, tel:, / or #` | `richText`, at the link's `href` |
| ``no `pages` document you can read has the slug `home` `` | `richText` sent as Markdown with a `doc:` link or `::ref` |
| `nests more than 32 levels deep`, `holds more than 50000 nodes` | `richText` |
| ``unknown node type `x` ``, ``unknown mark `x` ``, ``unknown attribute `x` ``, ``unknown key `x` `` | `richText` |
| `` `listItem` can't go inside `doc` ``, `needs at least one node inside`, `expected text that isn't empty` | `richText`: a node in the wrong place, an empty container or text node |
| `` `bold` is applied twice ``, `code blocks hold plain text without marks` | `richText` marks |
| `a link takes href or doc, not both`, `a link needs href or doc`, `this field can't link to documents`, ``can't link to `x`; expected one of: …`` | `richText` links |
| `this field has no block types`, `this block ID is used twice`, `expected a block ID` | `richText` block nodes |
| `expected a whole number from 1 to 6`, `expected a whole number from 0 to 1000000`, `expected a whole number from 1 to 1000` | `richText`: a heading's `level`, a list's `start`, a cell's `colspan` or `rowspan` |
| `every row of a table must span the same number of columns: …`, `reaches past the last row` | `richText` tables |
| `line N: …` | `richText` sent as Markdown. See [When Markdown is refused](/markdown-input#when-markdown-is-refused). |
| `must not contain the NUL character` | any text |
| `is filled from posts.category; it can't be set` | `join` |
| `is read from author.name; set that instead` | a `virtual` field |
| `must be unique; another document already uses this value` | `unique`, `slug` |
