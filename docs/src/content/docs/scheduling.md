---
title: Scheduled publishing
description: Publish and unpublish at a set time, what a scheduled publish ships, the workers that run it, and why a rotated key's schedules fail. On main, arriving in the next release.
---

Want the post out at nine on Monday and gone at the end of the month, without anyone awake to press the button? Schedule it. TachyonCMS runs the publish and the unpublish itself, as the person who set them up.

:::note[Not in v0.2.0]
Scheduled publishing is on `main` and arrives in the next release. v0.2.0 can't schedule anything.
:::

Scheduling works on collections and globals with [drafts](/drafts) on.

## Set a schedule

`PUT /api/{collection}/{id}/schedule` takes `publishAt`, `unpublishAt` or both:

```sh
curl -X PUT localhost:3000/api/posts/01a1aeda-247d-7036-8c3e-6858c3682b86/schedule \
  -H "authorization: Bearer $ED_TOKEN" \
  -H 'content-type: application/json' \
  -d '{"publishAt": "2026-12-07T09:00:00Z", "unpublishAt": "2026-12-31T23:59:00Z"}'
```

```json
{
  "publishAt": "2026-12-07T09:00:00Z",
  "unpublishAt": "2026-12-31T23:59:00Z"
}
```

Each side takes an RFC 3339 time within the next 10 years. Leave one out and it stays as it was. Send `null` and it's cancelled:

```sh
curl -X PUT localhost:3000/api/posts/01a1aeda-247d-7036-8c3e-6858c3682b86/schedule \
  -H "authorization: Bearer $ED_TOKEN" \
  -H 'content-type: application/json' \
  -d '{"unpublishAt": null}'
```

```json
{
  "publishAt": "2026-12-07T09:00:00Z",
  "unpublishAt": null
}
```

A new time replaces the old one; there's at most one pending publish and one pending unpublish per document. `GET` on the same path shows what's pending, and `DELETE` cancels both and answers `{"publishAt": null, "unpublishAt": null}`.

Times that don't fit are a `422` at the side they're on:

| Sent | Message |
|---|---|
| A time that has passed | `must be in the future` |
| More than 10 years ahead | `must be at most 10 years from now` |
| Anything but an RFC 3339 time or `null`, such as `"monday"` | `must be an RFC 3339 date and time, or null` |

A key other than `publishAt` or `unpublishAt` is a `400`. A global schedules at `/api/globals/{slug}/schedule`.

## What a scheduled publish ships

A scheduled publish ships the draft as it stood when you scheduled it. Edits made since then wait for the next publish.

That's on purpose. Whoever scheduled the post reviewed a particular draft; if a later edit could ride along, nobody would have reviewed what goes live. So scheduling takes a snapshot of the draft, checks it the way a publish would (a missing `required` field is a `422` now, not a failed job later), and records it as a `draft` [version](/versions).

Here Ed schedules a post, then edits its draft before the time comes:

```sh
curl -X PUT localhost:3000/api/posts/01a1aedc-2c31-7697-aa59-17d4d7287d39/schedule \
  -H "authorization: Bearer $ED_TOKEN" \
  -H 'content-type: application/json' \
  -d '{"publishAt": "2026-11-06T03:17:11Z"}'

curl -X PATCH localhost:3000/api/posts/01a1aedc-2c31-7697-aa59-17d4d7287d39 \
  -H "authorization: Bearer $ED_TOKEN" \
  -H 'content-type: application/json' \
  -d '{"body": "Second draft, written after scheduling."}'
```

Once the time has passed, the public reads the body as it was scheduled (trimmed to three keys):

```json
{
  "body": "First draft.",
  "publishedAt": "2026-11-06T03:17:11.812999Z",
  "status": "published"
}
```

The draft still holds `"Second draft, written after scheduling."`. To ship that too, publish again or schedule again.

When a job runs, it checks the snapshot again: every link has to reach a published document the scheduler can read, and unique values have to be free. Trashing the document cancels both sides of its schedule.

## Who can schedule

Setting, changing and cancelling a schedule take the `publish` right, so an Author can't. Seeing a schedule takes `readDrafts`.

When a job's time comes, it acts as whoever scheduled it, as they are then: their role, their access rules, and their key's scopes if a key scheduled it. If they've been removed or have lost the right, the job fails and isn't retried, and nothing is published. Only a fault on the server's side, such as the database being out of reach, is tried again.

### Rotating or revoking a key fails its schedules

A schedule made with an [API key](/api-keys) runs only while that exact key is live and still belongs to the same user. Rotating the key, revoking it, or letting it expire fails everything it scheduled.

That's deliberate. A key usually gets rotated because it leaked, and nothing it queued should fire afterwards. After a rotation, schedule again with the new key.

Here a `posts:publish` key scheduled two posts, and Ed rotated it before either time came. Both jobs failed when their time arrived, with this in the `jobs` table:

```text
  kind   | state  | attempts |                                     last_error
---------+--------+----------+------------------------------------------------------------------------------------
 publish | failed |        1 | the API key that scheduled it was revoked or has expired, or its owner was removed
 publish | failed |        1 | the API key that scheduled it was revoked or has expired, or its owner was removed
```

A schedule made from a signed-in session isn't tied to that session. It runs as the user for as long as they exist and keep the right.

## The workers

Workers inside `tachyon serve` run the schedules. There are two unless you set `workers` under `[jobs]`:

```toml
[jobs]
workers = 4
```

or `TACHYON_JOBS__WORKERS=4` in the environment. An idle worker looks for due jobs every second, so a job runs within a second or so of its time.

The count can be at most 16, and has to be fewer than the database pool's connections, so requests still get one. The pool has 10 connections, which makes 9 the most that starts today. `0` runs no workers on this server: schedules are still accepted and wait until a server with workers picks them up. `tachyon serve` stops at startup, before it listens, on a count that doesn't fit:

```text
Error: jobs.workers is 10, but the database pool has 10 connections; use fewer than 10 so requests still get one
```

```text
Error: jobs.workers is 17; it can be at most 16
```

Several servers can share one database. Each job runs once, whichever server's worker takes it. A server that stops mid-job gives its workers up to 30 seconds to finish; a job cut off runs again once its 60-second lease runs out.

## What happened to a job

Finished jobs, whether they ran, failed or were cancelled, stay in the `jobs` table for 30 days, with `state` and `last_error`, so you can see what happened:

```sh
psql "$DATABASE_URL" -c "select kind, state, attempts, last_error, run_at from jobs order by run_at desc limit 10"
```

`state` is `queued`, `running`, `done`, `failed` or `cancelled`. After 30 days, the workers clear finished jobs away as they go, so a server running with `workers = 0` leaves them be. There's no API for the `jobs` table yet.
