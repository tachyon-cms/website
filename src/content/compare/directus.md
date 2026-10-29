---
name: Directus
summary: "Directus puts an API and a web app on top of a SQL database, and it's ready for editors now. TachyonCMS is Postgres-only, MIT, and still an API without an admin."
checked: 2026-10-28
rows:
  - topic: Database
    tachyon: PostgreSQL, and only PostgreSQL. TachyonCMS creates and migrates its own tables.
    them: PostgreSQL, MySQL, Oracle, SQL Server, SQLite or CockroachDB.
    source: https://directus.com/docs/configuration/database
  - topic: APIs
    tachyon: REST, generated from your content types. No GraphQL yet.
    them: REST and GraphQL from your database, plus an SDK and realtime.
    source: https://directus.com/docs/getting-started/overview
  - topic: Editing
    tachyon: No admin screen yet. You work over HTTP or with the `tachyon` command.
    them: The Data Studio, a web app for your team's content, files, users and dashboards.
    source: https://directus.com/docs/getting-started/overview
  - topic: Drafts and versions
    tachyon: Not yet. They're next on the roadmap, after rich text.
    them: Content versioning. Draft changes in a version, publish it when it's ready, and revert through revisions.
    source: https://directus.com/docs/guides/content/content-versioning
  - topic: Translations
    tachyon: Not yet. Translations are planned, with no date.
    them: A translations field for content, and a Data Studio that can be translated too.
    source: https://directus.com/docs/guides/content/translations
  - topic: Access control
    tachyon: Roles, plus rules per collection, global and field. A rule can be a filter on the document and the person asking, and it goes into the SQL query.
    them: Roles hold policies. Permissions are set per collection and action, and filter rules decide which items a user can reach.
    source: https://directus.com/docs/guides/auth/access-control
  - topic: Extending
    tachyon: No plugins yet. WebAssembly plugins are planned, with no date.
    them: App extensions for the Data Studio and API extensions for the server, published through the Directus Marketplace.
    source: https://directus.com/docs/guides/extensions/overview
  - topic: Running it
    tachyon: Release binaries or a Docker image, beside your own Postgres.
    them: A Docker image you can deploy on many platforms.
    source: https://directus.com/docs/self-hosting/overview
  - topic: Licence
    tachyon: MIT.
    them: The Monospace Sustainable Core License 1.0, which turns each release into GPL-3.0 four years after it's made available.
    source: https://github.com/directus/directus/blob/main/license
  - topic: Price
    tachyon: Free, for anyone. There's no paid tier.
    them: Free for organisations under $5M in annual revenue with fewer than 50 employees. Paid plans start at $89 a month billed yearly, and Directus Cloud adds $89 a month billed yearly on top.
    source: https://directus.com/pricing
notYet:
  - There's no admin screen, so nobody who doesn't write code can edit content yet.
  - No file storage or media library.
  - No content versions, translations or GraphQL.
  - It won't sit on a database you already have. TachyonCMS wants its own Postgres.
  - No extensions, and no hosted service.
  - It's pre-alpha, so keep it off the public internet for now.
---

## Who should pick which

**Pick Directus** if you already have a SQL database and want an API and an editing app on top of it this afternoon. It takes six databases, the Data Studio is ready for editors, and versions, translations and extensions are all there. If your organisation fits under its free threshold, it costs nothing to self-host.

**Pick TachyonCMS** if you want a plain MIT licence that's the same for every organisation, and you're starting fresh on Postgres. You'll be calling an API, because the admin isn't built yet.

Moving an existing database? Directus is built for that. TachyonCMS isn't.
