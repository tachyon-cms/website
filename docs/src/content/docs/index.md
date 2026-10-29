---
title: TachyonCMS docs
description: Install, run and configure TachyonCMS, a headless CMS in one Rust binary backed by one Postgres database.
---

TachyonCMS is a headless CMS written in Rust. You run one binary next to one Postgres database, define your content types, and get a JSON API for them: documents you can create, read, update, delete, filter and link together, with sign-in, roles, API keys and access rules down to a single field.

These pages describe **v0.1.0**, the first release. For why it exists, what's on the roadmap and how it compares, see [tachyoncms.com](https://tachyoncms.com).

:::caution[Pre-alpha]
v0.1.0 has the content API, sign-in and access rules. It has no admin screen, media library, drafts or GraphQL yet. Keep it off public networks for now.
:::

## Start here

1. [Install TachyonCMS](/install) with Docker or a release binary, and create the first Admin.
2. Read [Concepts](/concepts) for the ideas everything else builds on.
3. Define a [content type](/content-types) and add documents to it.

## Content and queries

- [Content types](/content-types): collections, globals, and changing them without losing data.
- [Fields](/fields): every field type, its options and how values are validated.
- [Querying](/querying): filters, sorting, paging and choosing which fields come back.
- [Relationships](/relationships): links between documents, and getting them back populated.
- [Joins and virtual fields](/joins-and-virtual-fields): showing related documents without storing them twice.
- [Schema files](/schema-files): keep content types in version control with `tachyon schema`.

## Users and access

- [Sign-in](/sign-in): the first Admin, sessions, bearer tokens and passwords.
- [Roles](/roles): Admin, Editor, Author and Viewer, and roles of your own.
- [API keys](/api-keys): scoped keys for websites and servers.
- [Access rules](/access-rules): which documents and fields each person can see and change.

## Running it

- [Configuration](/configuration): every setting, in `tachyon.toml` or the environment.
- [Deploy with Docker](/deploy/docker) or [as a binary](/deploy/binary).
- [Security model](/security-model): what TachyonCMS protects, and how.
- [Get involved](/get-involved): report bugs, contribute, and report security issues privately.

## About the examples

Every request on these pages was run against the v0.1.0 Docker image, and every response shown is the one it returned. Responses are pretty-printed, and long ones are trimmed where the page says so. IDs and timestamps will differ on your machine, and session tokens and API keys are cut short to `tcs_…` and `tcy_…`.

The examples use `curl -g`, which stops curl reading the square brackets in query strings such as `where[title][equals]` as a pattern.
