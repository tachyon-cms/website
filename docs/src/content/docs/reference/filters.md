---
title: Filters and sorting
description: Every filter operator in TachyonCMS v0.1.0, which fields each one works on, how values are read, and the limits.
---

This page lists every operator, path and limit for `where` and `sort`. For a guided introduction with examples, see [Querying](/querying).

## Syntax

A condition is `where[path][operator]=value` in the query string of `GET /api/{collection}`, or in a join's `joins[field][where]` option. Every condition in one `where` must match. To match any of several, number the groups under `or`; `and` works the same way and nests:

```text
where[kind][equals]=note
where[or][0][kind][equals]=note&where[or][1][publishedOn][gte]=2026-10-27
```

A join field's `where` in a schema takes the same conditions as a JSON object, such as `{"published": {"equals": "true"}}`. In JSON, `in` and `not_in` also take an array.

Use `curl -g` so curl doesn't treat the brackets as a pattern.

## Operators

| Operator | Matches | Value |
|---|---|---|
| `equals` | The value exactly. | One value. |
| `not_equals` | Anything else, including documents with no value. | One value. |
| `in` | Any of the values. | 1 to 100 values, comma-separated. |
| `not_in` | None of the values, including documents with no value. | 1 to 100 values, comma-separated. |
| `gt` | Greater than the value. | One value. |
| `gte` | Greater than or equal to the value. | One value. |
| `lt` | Less than the value. | One value. |
| `lte` | Less than or equal to the value. | One value. |
| `like` | Text containing the value anywhere, ignoring case. `%` and `_` are matched literally. | Text. |
| `contains` | A list holding the value. | One value of the list's item type. |
| `exists` | `true`: the field has a value. `false`: it doesn't. | `true` or `false`. |
| `near` | Points within a distance, nearest first. | `longitude,latitude[,max[,min]]`, distances in metres. |

## Operators by field

Each field compares as one of these kinds, and each kind takes only some operators. Any other pairing is a `400`: ``where[title][gt]: gt can't be used on this field``.

| Compares as | Fields | Operators |
|---|---|---|
| Text | `text`, `textarea`, `email`, `url`, `select`, `radio`, `slug`, `code`; a single `relationship` (by document ID) | `equals`, `not_equals`, `in`, `not_in`, `like`, `exists` |
| Number | `number` | `equals`, `not_equals`, `in`, `not_in`, `gt`, `gte`, `lt`, `lte`, `exists` |
| Date | `date` | `equals`, `not_equals`, `in`, `not_in`, `gt`, `gte`, `lt`, `lte`, `exists` |
| Boolean | `boolean` (`checkbox`) | `equals`, `not_equals`, `exists` |
| Point | `point` | `near`, `exists` |
| List | `text` or `number` with `hasMany`, `select` with `multiple`, `relationship` with `hasMany` | `contains`, `exists` |
| ID | `id` | `equals`, `not_equals`, `in`, `not_in` |
| Timestamp | `createdAt`, `updatedAt` | `equals`, `not_equals`, `in`, `not_in`, `gt`, `gte`, `lt`, `lte` |

`json` and `join` fields can't be filtered. A `group` or `array` can't be filtered as a whole, only through a path to a field inside it.

## Values

Every value arrives as text and is read according to the field:

| Field | Value |
|---|---|
| `number` | A number, such as `5` or `2.5`. |
| `boolean` | `true` or `false`. |
| `date` with `dateOnly` | A date like `2026-10-12`. |
| `date` | A date-time like `2026-10-12T09:30:00Z`. |
| `select`, `radio` | One of the field's option values. |
| `relationship`, `id` | A document ID. |
| A polymorphic link's `relationTo` | One of the field's `relationTo` collections. |
| Anything else | Text. |

A value that doesn't fit is a `400` naming the parameter, such as ``where[price][gt]: expected a number``.

## Paths

| Path | Reaches |
|---|---|
| `title` | A top-level field. |
| `id`, `createdAt`, `updatedAt` | The document's own ID and timestamps. |
| `seo.title` | A field inside a group. |
| `links.url` | A field in any row of an array. |
| `category.name` | A field of the linked document, through a relationship. See [Filter through a link](/relationships#filter-through-a-link). |
| `owner.relationTo`, `owner.value` | The collection or the ID of a link to several collections. `owner` alone means `owner.value`. |
| A virtual field | The value it reads, at its source. See [Joins and virtual fields](/joins-and-virtual-fields). |

A path can go through at most 3 relationships and into at most 3 nested arrays. `near` works on top-level `point` fields only, not through a relationship, into an array or in a join's `where`. To match one link in a `relationship` with `hasMany`, use `contains` with its document ID, not a path into it.

Filters only see what you can read. A document a [read rule](/access-rules) hides from you never matches, even through a relationship. A path to a field you can't read is a `403`: ``where[phone][equals]: you can't filter or sort by a field you can't read``.

## `near`

`where[location][near]=-0.1246,51.5007,5000` matches points within 5,000 metres of that longitude and latitude.

| Part | Required | Range |
|---|---|---|
| Longitude | yes | -180 to 180 |
| Latitude | yes | -90 to 90 |
| Maximum distance | no | 0 or more, in metres |
| Minimum distance | no | 0 or more, and no more than the maximum |

Without a `sort`, results come back nearest first when `near` is at the top level of `where` or inside `and`. Page through them with `page`, not `after`. See [Near a point](/querying#near-a-point) for an example.

## Sort

`sort=field` orders a list by one field, smallest first; `sort=-field` reverses it. Documents with no value for the field come last either way. Without `sort`, lists are newest first.

| Can sort by | Can't sort by |
|---|---|
| Any field that compares as text, number, date or boolean; `id`, `createdAt`, `updatedAt`; a field inside a group (`seo.title`) | More than one field; a list; a `point`; a field inside an array; a path through a relationship; a virtual field |

A sort that can't work is a `400`, such as ``sort: `tags` holds a list and can't be sorted``.

## Limits

| Limit | Value | Error |
|---|---|---|
| Query parameters in one request | 100 | ``too many query parameters (max 100)`` |
| Brackets in one parameter name | 16 levels | ``parameter `…` is nested too deeply`` |
| Conditions in one filter | 50 | ``where[…]: too many conditions (max 50)`` |
| `and` / `or` nesting | 5 levels | ``where[…]: is nested too deeply`` |
| Values in `in` or `not_in` | 100 | ``where[…]: expected up to 100 comma-separated values`` |
| Relationships in one path | 3 | ``…reaches through too many relationships (3 at most)`` |
| Nested arrays in one path | 3 | ``…reaches into too many nested lists (3 at most)`` |

## Errors

Every problem with a filter or sort is a `400` whose `detail` names the parameter at fault, except a field you can't read, which is a `403`. An unknown operator lists the ones that exist:

```sh
curl -g 'localhost:3000/api/posts?where[title][starts_with]=a'
```

```json
{
  "detail": "where[title][starts_with]: unknown operator; use equals, not_equals, in, not_in, gt, gte, lt, lte, like, contains, exists or near",
  "requestId": "01a18491-0183-76a8-b3f6-39f5084f97c0",
  "status": 400,
  "title": "Bad request",
  "type": "about:blank"
}
```

See [Errors](/reference/errors) for the response format.
