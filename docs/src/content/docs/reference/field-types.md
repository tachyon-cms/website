---
title: Field types
description: Every field type in TachyonCMS v0.1.0, every option it takes, the values it accepts and the validation messages.
---

Every field type, with its options, defaults and the values it accepts. For a guided introduction, see [Fields](/fields).

A field is a JSON object in a schema's `fields` list, such as `{"name": "title", "type": "text", "required": true}`. A key the server doesn't know is refused by name (``field `title`: unknown option `maxLenght` ``), and so is an unknown `type`.

## Options on every field

| Option | Type | Default | Description |
|---|---|---|---|
| `name` | string | none | Required on every field except `row`, `collapsible` and `tabs`. 1 to 64 letters, digits and underscores, starting with a letter. `id`, `createdAt`, `updatedAt` and `status` are reserved at the top level, and in `users` so are `email`, `role`, `password` and `currentPassword`. |
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
| `expected one of: a, b` | `select`, `radio` |
| `expected a list of: a, b` | `select` with `multiple` |
| `expected lowercase letters, digits and single hyphens, like my-first-post` | `slug` |
| `expected [longitude, latitude], like [-0.1276, 51.5072]` | `point` |
| `expected a document ID`, `expected a list of document IDs` | `relationship` |
| `expected a link like {"relationTo": "<collection>", "value": "<document ID>"} to one of: …` | `relationship` with several collections |
| `doesn't match any document in the related collection` | `relationship`: no such document, or one you can't read |
| `expected a list` | `hasMany`, `multiple`, `array` |
| `must have at least N rows`, `must have at most N rows` | `hasMany` with `minRows`/`maxRows`, `array` |
| `expected an object` | `group`, an `array` row |
| `must not contain the NUL character` | any text |
| `is filled from posts.category; it can't be set` | `join` |
| `is read from author.name; set that instead` | a `virtual` field |
| `must be unique; another document already uses this value` | `unique`, `slug` |
