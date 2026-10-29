---
title: "Ask for exactly what the page needs."
summary: "Filter through relationships and into lists, sort, page with cursors, and fill in linked documents only as deep as you allow. All from the query string."
status: today
sources:
  - README.md#what-works-today
  - README.md#access-rules
  - crates/tachyon-core/src/query.rs
  - crates/tachyon-core/src/select.rs
  - crates/tachyon-core/src/virtuals.rs
  - crates/tachyon-core/src/joins.rs
  - crates/tachyon-api/src/params.rs
  - crates/tachyon-api/src/documents.rs
  - crates/tachyon-db/src/query.rs
---

## Filters that follow your links

`where[price][gt]=10` is the easy part. `where[author.name][equals]=Ann` reaches through a relationship to the author's own fields, and `where[links.url][like]=docs` looks inside every row of a list.

Twelve operators cover it: `equals`, `not_equals`, `in`, `not_in`, `gt`, `gte`, `lt`, `lte`, `like`, `contains`, `exists` and `near`. Each field type takes only the ones that make sense for it. Ask for `gt` on a text field and you get a 400 that says so, not an empty list you then have to puzzle over. `near` sorts map points nearest first.

## Sort and page

Lists come back newest first unless you say otherwise, ten to a page and never more than a hundred. `sort=-price` puts the dearest first. Numbered pages work with `page`, and `count=true` adds the total. For a long scroll, every response with more to come hands you a `nextCursor`; pass it back as `after` and you carry on from the last document you saw.

## Fill in the links, then trim

A relationship comes back as the linked document itself, one level down by default. `depth=2` fills in the links inside that, and five is as deep as any request goes. A field's own `maxDepth` stops it sooner, whatever `depth` a request asks for.

Then trim. `select[title]=true` returns just the title and the ID. `populate[users][name]=true` cuts the documents your links fill in down to what the page shows. And if every page wants the same trim, a collection's `defaultPopulate` sets it once.

## Values you never store twice

A virtual field shows a value from a linked document without copying it. Give a post `"virtual": "author.name"` and every read carries the author's current name. You can filter on it like any other field.

A join field runs the other way. Give a category `{"type": "join", "collection": "posts", "on": "category"}` and each read lists the posts that link to it, newest first. Page, sort, filter and count them per request with `joins[posts][limit]=5`, or switch them off with `joins=false`.

## Safe to put in front of the world

Filter values reach Postgres as bound parameters, never pasted into the SQL. And because [access rules](/product/access-control) join the same query, a filter can't be used to find out whether a hidden document exists.
