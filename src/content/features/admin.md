---
title: "An admin anyone can pick up. It isn't built yet."
summary: "TachyonCMS is an API today. The admin comes next, held to one test: someone who has only used WordPress picks it up without training."
status: headed
sources:
  - README.md#roadmap
  - README.md#why-another-cms
  - README.md#what-works-today
  - README.md#access-rules
---

## What's true today

There's no admin screen in v0.1.0. You manage content types, users and documents over HTTP or with the `tachyon` command, and that's the whole interface. I'd rather say so here than show you a mockup and let you guess.

## The test it has to pass

Someone who has only ever used WordPress should be able to sit down and run a site with it, without training: adding a content type, writing a post, scheduling it. If that person needs a manual, it isn't finished.

## What's already underneath

Some of the admin's groundwork ships today, because it lives in the schema:

- Rows, collapsible sections and tabs decide how fields will sit on the editing screen, without changing your data.
- Every field can carry a description, a placeholder, a place in the sidebar or a condition for when it shows.
- `GET /api/access` tells each person what they may do, so the admin can hide a button rather than let it fail.

## What comes with it

The roadmap builds the admin alongside the core, starting after milestone 3: sign-in, API keys and access rules, which all shipped in v0.1.0. After that come drafts, versions, scheduled publishing and a Trash (milestone 4), translations and full-text search (5), a media library with image processing (6), live preview (10) and a WordPress importer (11).

There are no dates yet. The [roadmap](/roadmap) shows the order.
