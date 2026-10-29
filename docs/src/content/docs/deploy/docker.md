---
title: Deploy with Docker
description: Run the signed TachyonCMS v0.1.0 container image with Postgres, keep its data, and verify the image.
---

Each release publishes a container image at `ghcr.io/tachyon-cms/tachyoncms`, for `linux/amd64` and `linux/arm64`.

:::caution[Pre-alpha]
v0.1.0 isn't ready for a public network. These steps suit a private server, a staging setup or a local machine.
:::

## The image

- Built on `gcr.io/distroless/static-debian12:nonroot`, with the static `tachyon` binary and nothing else: no shell and no package manager.
- Runs as user 65532, not root.
- Listens on `0.0.0.0:3000` (`TACHYON_LISTEN`) and exposes port 3000.
- Runs `tachyon serve` by default. Pass another command, such as `migrate` or `schema export`, as the container's arguments.
- Needs `TACHYON_DATABASE_URL`, and `TACHYON_PUBLIC_URL` because it listens beyond loopback. See [Configuration](/configuration).

Pin the version tag, `v0.1.0`, rather than a moving tag.

## Verify the image

The image is signed with [cosign](https://docs.sigstore.dev/cosign/) by the release workflow. Check it before you run it:

```sh
cosign verify ghcr.io/tachyon-cms/tachyoncms:v0.1.0 \
  --certificate-identity 'https://github.com/tachyon-cms/tachyoncms/.github/workflows/release.yml@refs/heads/main' \
  --certificate-oidc-issuer https://token.actions.githubusercontent.com
```

```text
Verification for ghcr.io/tachyon-cms/tachyoncms:v0.1.0 --
The following checks were performed on each of these signatures:
  - The cosign claims were validated
  - Existence of the claims in the transparency log was verified offline
  - The code-signing certificate was verified using trusted certificate authority certificates
```

cosign then prints the signature details as JSON (left out here).

## Run it with Postgres

The [Install](/install) page starts both containers with `docker run`. For something that survives restarts, use Compose with a named volume for the database. Save this as `compose.yaml`:

```yaml
services:
  db:
    image: postgres:17
    environment:
      POSTGRES_USER: tachyon
      POSTGRES_PASSWORD: change-me
      POSTGRES_DB: tachyon
    volumes:
      - pgdata:/var/lib/postgresql/data
    restart: unless-stopped

  cms:
    image: ghcr.io/tachyon-cms/tachyoncms:v0.1.0
    environment:
      TACHYON_DATABASE_URL: postgres://tachyon:change-me@db:5432/tachyon
      TACHYON_PUBLIC_URL: https://cms.example.com
    ports:
      - "127.0.0.1:3000:3000"
    depends_on:
      - db
    restart: unless-stopped

volumes:
  pgdata:
```

```sh
docker compose up -d
docker compose logs cms
```

Then create the first Admin as in [Install](/install#create-the-first-admin).

- Publish the port on `127.0.0.1` and put a reverse proxy that terminates HTTPS in front. Browsers only send the session cookie over HTTPS, `localhost` aside.
- Set `TACHYON_PUBLIC_URL` to the HTTPS address people use.
- TachyonCMS connects to Postgres once at startup and exits if it can't. `restart: unless-stopped` brings it back once the database is up.
- Other settings go in as `TACHYON_` variables. See [Configuration](/configuration).

## Run other commands

Use `docker compose run` for one-off commands such as [schema files](/schema-files):

```sh
docker compose run --rm -v "$PWD:/work" -w /work cms schema diff schema.json
```

Database migrations run automatically each time the server starts, so upgrading is a matter of changing the image tag and recreating the container.

## Back up

Everything TachyonCMS stores is in Postgres: content, schemas, users, sessions and key hashes. Back up the database with your usual Postgres tools, such as `pg_dump`.
