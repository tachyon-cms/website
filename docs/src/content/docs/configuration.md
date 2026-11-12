---
title: Configuration
description: Every TachyonCMS v0.2.0 setting, in tachyon.toml or as TACHYON_ environment variables, plus the [jobs] section on main.
---

TachyonCMS reads its settings from three places, each overriding the one before:

1. Built-in defaults.
2. `tachyon.toml` in the working directory, if it exists. Point at another file with `--config path/to/file.toml`; a file named that way has to exist, or `tachyon` stops with its path.
3. Environment variables starting with `TACHYON_`.

The only setting without a default is `database_url`.

A top-level key TachyonCMS doesn't know, such as a misspelt `publc_url`, stops `tachyon` at startup instead of being ignored. That goes for every command, since `serve`, `migrate` and `schema` read the same config:

```text
unknown key `publc_url` in tachyon.toml; the top-level keys are database_url, listen, public_url, auth
```

Environment variables aren't checked this way, so a `TACHYON_` variable that isn't a setting is left alone. On `main`, where [`[jobs]`](#jobs) is added, the message ends `public_url, auth, jobs`.

## A complete file

This is `tachyon.example.toml` from the repository. The `[auth]` values are the defaults; `database_url` is a sample, since it has no default, and `breach_check_url` is left out ([see below](#auth)):

```toml
# Copy to tachyon.toml. Every setting can also come from the environment:
# TACHYON_LISTEN, TACHYON_PUBLIC_URL, TACHYON_AUTH__SESSION_IDLE and so on.

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

## Environment variables

Each setting has a variable: `TACHYON_` plus the name in capitals. Settings under `[auth]` use a double underscore, so `breach_check` becomes `TACHYON_AUTH__BREACH_CHECK`. Lists take TOML syntax:

```sh
TACHYON_AUTH__ALLOWED_ORIGINS='["https://www.example.com"]'
```

## Top-level settings

### `database_url`

The Postgres connection string. Required.

| | |
|---|---|
| Variable | `TACHYON_DATABASE_URL` |
| Default | none |

Without it, the server stops at startup:

```text
Error: missing field `database_url`
```

### `listen`

The address and port to listen on.

| | |
|---|---|
| Variable | `TACHYON_LISTEN` |
| Default | `127.0.0.1:3000` (the Docker image sets `0.0.0.0:3000`) |

### `public_url`

The address people use to reach TachyonCMS, such as `https://cms.example.com`. Browser sign-ins only accept changes coming from this address (see [Sign-in](/sign-in#cookie-signed-changes-and-other-sites)), so set it to exactly what's in the browser's address bar, including behind a reverse proxy.

| | |
|---|---|
| Variable | `TACHYON_PUBLIC_URL` |
| Default | `http://localhost:` plus the `listen` port, when listening on loopback |

It's required when `listen` is anything but a loopback address. Without it the server refuses to start:

```text
Error: set public_url (such as https://cms.example.com) when listening beyond this machine
```

It must be a full `http` or `https` address:

```text
Error: public_url must be a full web address, like https://cms.example.com
```

## `[auth]`

Durations are a whole number and a unit: `s`, `m`, `h` or `d`, such as `15m` or `7d`. A duration the server can't read stops it at startup and names the setting:

```text
Error: auth.session_idle: `soon` isn't a duration; use a number and s, m, h or d, like 15m or 7d
```

| Setting | Default | Does |
|---|---|---|
| `session_idle` | `7d` | Ends a session after this long without use. |
| `session_absolute` | `30d` | Ends a session after this long, however much it's used. |
| `lockout_attempts` | `5` | Wrong passwords within `lockout_window` that lock an account. |
| `lockout_window` | `15m` | The window for counting wrong passwords. |
| `lockout_duration` | `15m` | How long a locked account stays locked. |
| `argon2_memory_kib` | `19456` | Memory for each Argon2id password hash, in KiB. Time cost 2 and parallelism 1 are fixed. |
| `breach_check` | `true` | Refuse passwords known from data breaches, using the Have I Been Pwned range API. |
| `breach_check_url` | `https://api.pwnedpasswords.com` | Where the breach check sends its range queries. |
| `allowed_origins` | `[]` | Other sites, besides `public_url`, allowed to send changes signed by the session cookie. |

Turn `breach_check` off on a server with no internet access. Otherwise, if the service can't be reached within 2 seconds, the password is accepted and a warning is logged.

`allowed_origins` is for a front end on another origin that signs people in with the session cookie, such as `https://www.example.com` talking to `https://cms.example.com`. Front ends that send bearer tokens or API keys don't need it.

`tachyon serve` also stops at startup, naming the setting, on three mistakes that would otherwise only show up later:

- An `allowed_origins` entry that isn't an origin. Each one is an `http` or `https` address with a host and, if needed, a port, and nothing else: no user or password, path, query or fragment. `www.example.com` and `https://www.example.com/admin` are refused, `https://www.example.com` is fine. One that isn't an origin could never match a browser's `Origin` header. Wildcards aren't supported, so a `*` in an origin, as in `https://*.example.com`, is refused too: list each origin.
- `lockout_attempts` below 1, which would lock an account on its first wrong password.
- `session_absolute` shorter than `session_idle`, which would make the idle limit meaningless.

```text
Error: auth.allowed_origins: `www.example.com` isn't an origin; use a scheme and host, like https://www.example.com
```

## `[jobs]`

On `main`, arriving in the next release. Workers inside `tachyon serve` run [scheduled publishing](/scheduling). v0.2.0 has no `[jobs]` section, and stops on one as an unknown key.

| Setting | Default | Does |
|---|---|---|
| `workers` | `2` | How many workers this server runs. `0` runs none, leaving scheduled jobs to other servers on the same database. |

```toml
[jobs]
workers = 4
```

The variable is `TACHYON_JOBS__WORKERS`. The count can be at most 16, but the pool is what really decides it. A worker running a large schema change holds two of the database pool's 10 connections, and requests need one left over, so the workers need `2 × workers + 1` connections and 4 is the most that starts today. `tachyon serve` stops at startup on one that doesn't fit:

```text
Error: jobs.workers is 5, but the database pool has 10 connections; each worker can hold two and requests need one, so use at most 4
```

An unknown key under `[jobs]`, such as `wokers`, stops every command, as one under `[auth]` does.

## Logs

TachyonCMS writes JSON logs to stderr, one event per line. Set the level with `RUST_LOG`, which defaults to `info`:

```sh
RUST_LOG=warn tachyon serve
```

Every request's ID is in its log lines and in the `x-request-id` response header, and error responses carry it as `requestId`. A request that sends its own `x-request-id` (letters, digits, `-` and `_`, up to 128 characters) keeps it, so you can follow one request from a proxy through to the database.

## Command-line options

`--config` is the only option `tachyon` takes besides `--help` and `--version`:

```text
TachyonCMS server

Usage: tachyon [OPTIONS] <COMMAND>

Commands:
  serve    Run pending migrations, then serve the API
  migrate  Run pending migrations and exit
  schema   Keep collection schemas in a JSON file: export, compare, apply
  help     Print this message or the help of the given subcommand(s)

Options:
      --config <CONFIG>  Config file. Without it, tachyon.toml is read if it exists. Every setting can also come from a TACHYON_* environment variable
  -h, --help             Print help
  -V, --version          Print version
```
