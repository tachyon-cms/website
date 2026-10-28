---
title: Configuration keys
description: Every TachyonCMS v0.1.0 setting and environment variable, with its type and default.
---

Every setting, in one table per section. For how settings are loaded and what each one is for, see [Configuration](/configuration).

## Where settings come from

Each source overrides the one before:

1. Built-in defaults.
2. The config file: `tachyon.toml` in the working directory, or the file named by `--config`. A missing file is skipped.
3. Environment variables: `TACHYON_` plus the key in capitals. A key under `[auth]` takes a double underscore: `TACHYON_AUTH__SESSION_IDLE`.

Lists in environment variables use TOML syntax: `TACHYON_AUTH__ALLOWED_ORIGINS='["https://www.example.com"]'`.

## Top-level keys

| Key | Variable | Type | Default | Description |
|---|---|---|---|---|
| `database_url` | `TACHYON_DATABASE_URL` | string | none (required) | Postgres connection string. |
| `listen` | `TACHYON_LISTEN` | `address:port` | `127.0.0.1:3000` | Address and port to serve on. The Docker image sets `0.0.0.0:3000`. |
| `public_url` | `TACHYON_PUBLIC_URL` | `http` or `https` URL | `http://localhost:` plus the `listen` port | The address browsers use. Cookie-signed changes are accepted only from this origin and `allowed_origins`. Required when `listen` isn't a loopback address. |

Unknown top-level keys and `TACHYON_` variables are ignored.

## `[auth]`

| Key | Variable | Type | Default | Description |
|---|---|---|---|---|
| `session_idle` | `TACHYON_AUTH__SESSION_IDLE` | duration | `7d` | A session ends after this long unused. |
| `session_absolute` | `TACHYON_AUTH__SESSION_ABSOLUTE` | duration | `30d` | A session ends this long after sign-in, however much it's used. Also the cookie's `Max-Age`. |
| `lockout_attempts` | `TACHYON_AUTH__LOCKOUT_ATTEMPTS` | integer | `5` | Wrong passwords within `lockout_window` that lock an account. |
| `lockout_window` | `TACHYON_AUTH__LOCKOUT_WINDOW` | duration | `15m` | The window for counting wrong passwords. |
| `lockout_duration` | `TACHYON_AUTH__LOCKOUT_DURATION` | duration | `15m` | How long a locked account stays locked. |
| `argon2_memory_kib` | `TACHYON_AUTH__ARGON2_MEMORY_KIB` | integer, KiB | `19456` | Memory for each Argon2id hash. Time cost 2 and parallelism 1 are fixed. Below 8 the server won't start. |
| `breach_check` | `TACHYON_AUTH__BREACH_CHECK` | boolean | `true` | Refuse new passwords found in data breaches, using the Have I Been Pwned range API. If the service doesn't answer within 2 seconds, the password is accepted and a warning is logged. |
| `breach_check_url` | `TACHYON_AUTH__BREACH_CHECK_URL` | URL | `https://api.pwnedpasswords.com` | Where the breach check sends its range queries. |
| `allowed_origins` | `TACHYON_AUTH__ALLOWED_ORIGINS` | list of origins | `[]` | Other sites allowed to send cookie-signed changes, such as a front end on `https://www.example.com`. |

A duration is a whole number above zero followed by `s`, `m`, `h` or `d`: `90s`, `15m`, `12h`, `7d`.

An unknown key under `[auth]`, in the file or the environment, stops the server and lists the keys that exist.

## Other environment variables

| Variable | Default | Description |
|---|---|---|
| `RUST_LOG` | `info` | Log level or filter, such as `warn` or `tachyon=debug`. Logs are JSON lines on stderr. |

## Command-line option

| Option | Default | Description |
|---|---|---|
| `--config <path>` | `tachyon.toml` | The config file to read. Works before or after the subcommand. |

The subcommands are listed in the [CLI reference](/cli).

## Startup errors

The server stops before listening when a setting is wrong:

| Cause | Message |
|---|---|
| No `database_url` | `` Error: missing field `database_url` `` |
| An empty `database_url` | `Error: database_url is empty` |
| No `public_url` while listening beyond loopback | `Error: set public_url (such as https://cms.example.com) when listening beyond this machine` |
| A `public_url` that isn't a full `http` or `https` address | `Error: public_url must be a full web address, like https://cms.example.com` |
| A bad duration | ``Error: auth.session_idle: `soon` isn't a duration; use a number and s, m, h or d, like 15m or 7d`` |
| `argon2_memory_kib` below 8 | `Error: memory cost is too small` |
| An unknown `[auth]` key | `` Error: unknown field: found `nope`, expected `one of …` `` |

## Example file

`tachyon.example.toml` from the repository, with every `[auth]` default:

```toml
database_url = "postgres://tachyon:tachyon@127.0.0.1:54329/tachyon"
listen = "127.0.0.1:3000"

# Where browsers reach the admin and API. Required when listening beyond this machine.
# public_url = "https://cms.example.com"

[auth]
session_idle = "7d"         # signed out after this long without use
session_absolute = "30d"    # and after this long whatever happens
lockout_attempts = 5        # wrong passwords within the window...
lockout_window = "15m"
lockout_duration = "15m"    # ...lock the account for this long
argon2_memory_kib = 19456   # password hashing memory (OWASP baseline)
breach_check = true         # refuse passwords known from data breaches
allowed_origins = []        # other sites allowed to send cookie-signed changes
```

The file's two opening comment lines are left out.
