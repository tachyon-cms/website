---
title: "You shouldn't have to pick a side."
summary: "CMSs tend to be loved by developers and puzzling for editors, or the other way round. TachyonCMS is built to be both, and the developer half ships today."
status: today
sources:
  - README.md#why-another-cms
  - README.md#what-works-today
  - README.md#roadmap
  - README.md
  - Cargo.toml
  - crates/tachyon-db/src/query.rs
  - .github/workflows/release.yml
  - LICENSE
---

## The choice you're usually handed

Some CMSs are built for developers: typed, API-first, a pleasure to code against, and baffling to whoever has to publish the Tuesday newsletter. WordPress is built for the editor, and you pay for that ease in plugins, patches and page speed.

I don't think you should have to choose. TachyonCMS aims at three things at once.

## Fast, and you can see why

It's Rust on Axum and Tokio, one binary with Postgres beside it, and published content is read from a single row. That's an argument from how it's built, not a number. Reproducible benchmarks against the popular CMSs come first, method and all, and only then will I quote one.

## Safe, by default rather than by checklist

There's no `unsafe` code; the compiler is told to refuse it. Every query is either checked at compile time or built from a validated filter tree with bound parameters. Access rules go into the SQL itself, so a hidden document never leaves the database. [Security](/security) has the rest, including how to check a release before you run it.

## Easy for editors, which is where it's headed

The admin isn't built yet. The bar it has to clear is that someone who has only used WordPress picks it up without training. [For editors](/editors) is the honest version of that story: what's planned, and what's already underneath.

## What you can run today

- An API that appears the moment you define a content type, with [twenty field types](/product/content-modelling).
- [Filters, sorting, cursors and populated links](/product/querying), trimmed to what the page needs.
- [Access rules](/product/access-control) down to a single field, compiled into the query.
- [Sessions, scoped API keys](/product/sign-in) and passwords checked against known breaches.
- A [schema file](/product/schema-as-code) you can diff in a pull request, where renames keep their data.

Linux and macOS binaries and a Docker image come with every release, signed.

## Early, and open about it

TachyonCMS is pre-alpha and MIT licensed. The content API, sign-in and access rules work; the admin, media, drafts and GraphQL don't exist yet, so keep it off public networks for now. If that's the stage you like to join a project at, the door's open.
