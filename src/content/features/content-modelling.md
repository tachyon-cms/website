---
title: "Describe your content once. The API follows."
summary: "Twenty-two field types, from plain text to map points, pages built from blocks and real rich text. Send a content type to the server and its endpoints exist from that moment."
status: today
sources:
  - README.md#what-works-today
  - README.md#first-run
  - README.md#pages-and-rich-text
  - crates/tachyon-core/src/richtext/mod.rs
  - crates/tachyon-core/src/schema.rs
  - crates/tachyon-core/src/validate.rs
  - crates/tachyon-api/src/error.rs
  - crates/tachyon-api/src/globals.rs
---

## What a field can hold

Text, as one value or a list. Longer text in a textarea. Numbers, again one or a list, with a minimum, a maximum or whole numbers only. A checkbox, a date with or without its time, an email, a URL. Select and radio, where each option can carry a label for people and a value for your code. A slug that fills itself in from the title. Code, raw JSON, and a map point you can search by distance.

Then come the fields that give content its shape. A relationship links to a document in one collection, or in any of several. A group gathers fields under one name, so you get `seo.title` and `seo.description`. An array is a list of rows with fields of their own, which is how a page carries as many links as it needs.

Rows, collapsible sections and tabs are different again. They arrange the editing screen and change nothing about your data. The admin that uses them [isn't built yet](/product/admin), but the layout you give it is saved with your schema today.

## Pages and posts with a body

A landing page is a hero, a quote and a call to action, in whatever order the editor wants this week. A `blocks` field holds exactly that: a list of rows, each one of the block types you define, each with its own fields. Define a block once as a shared block and every collection that names it gets the same fields, rules and labels.

Long-form writing goes in a `richText` field: headings, lists, tables, code, links to other documents, and blocks placed in the flow of the text. Write it as JSON or as Markdown. Read it back as JSON, or ask for HTML, Markdown or plain text with `?format=` and it comes back as a string, escaped and with every link checked on the way out.

## Rules that sit on the field

Mark a field `required` or `unique`, give it a `default`, cap its length or its number of rows. Mark it `filterable` and it gets a database index, so filtering and sorting on it doesn't mean reading every row.

Break a rule and you hear about all of them at once. Each error names the field by its full path, `seo.title` or `links.0.url`, so a form can put the message right where the mistake is.

## Writes that only touch what you sent

Update `seo.title` and the rest of `seo` stays as it was. Lists are replaced whole, because half a list is rarely what anyone means. And `null` clears a field wherever it sits.

## A home for the one-off things

Site settings, the footer, the main navigation. There's only ever one of each, so they're globals: a single document with a schema of its own, read and edited at `/api/globals/{slug}`.

## The parts you'd otherwise build yourself

Every document gets a UUIDv7 ID, so IDs sort by when they were made. Deletes are soft. Date-times are stored in UTC to the millisecond, which means what you filter on is exactly what was saved. And every error comes back as RFC 9457 problem+json with a request ID you'll find in the logs.
