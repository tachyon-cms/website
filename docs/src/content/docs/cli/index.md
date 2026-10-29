---
title: CLI
description: Commands and flags for the TachyonCMS command-line tool.
# Linked as Overview in the sidebar; this keeps it out of the generated Commands list.
sidebar:
  hidden: true
---

TachyonCMS ships as one binary, `tachyon`. It serves the API, runs migrations and moves collection schemas in and out of JSON files.

## Commands

| Command | What it does |
| --- | --- |
| [`tachyon serve`](/cli/tachyon-serve) | Runs pending migrations, then serves the API. The Docker image runs this by default. |
| [`tachyon migrate`](/cli/tachyon-migrate) | Runs pending migrations and exits. |
| [`tachyon schema export`](/cli/tachyon-schema-export) | Writes every collection's schema as JSON. |
| [`tachyon schema diff`](/cli/tachyon-schema-diff) | Shows what applying a schema file would change, without changing anything. |
| [`tachyon schema apply`](/cli/tachyon-schema-apply) | Applies a schema file. Changes that delete or retype data need `--yes`. |

[Schema files](/schema-files) walks through `export`, `diff` and `apply` with examples.

## Global options

`--config <CONFIG>` names the config file, `tachyon.toml` by default. It works on every command, before or after the subcommand. Every setting can also come from a `TACHYON_*` environment variable; the [configuration reference](/reference/config) lists them.

`tachyon --version` prints the version, and `--help` on any command prints the text shown on its page.

## About these pages

Each command page holds the exact `--help` output of the release binary these docs cover. CI regenerates them from that binary and fails if they differ. The [`tachyon`](/cli/tachyon) page has the top-level help.
