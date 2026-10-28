---
name: Strapi
summary: "Strapi's Community edition and TachyonCMS are both open-source headless CMSs under MIT. Strapi has an admin panel, media, drafts and translations today. TachyonCMS has a REST API and access rules, and not much else yet."
checked: 2026-10-28
rows:
  - topic: Built with
    tachyon: Rust, shipped as one binary.
    them: Node.js, on an Active or Maintenance LTS release (v22, v24 and v26 today).
    source: https://docs.strapi.io/cms/installation/cli
  - topic: Database
    tachyon: PostgreSQL, and only PostgreSQL.
    them: PostgreSQL, MySQL, MariaDB or SQLite.
    source: https://docs.strapi.io/cms/installation/cli
  - topic: Content types
    tachyon: Defined over the API, or as JSON files you export, diff and apply with the `tachyon` command.
    them: Built in the admin panel's Content-type Builder, which runs in development only.
    source: https://docs.strapi.io/cms/features/content-type-builder
  - topic: APIs
    tachyon: REST, with filters, sorting, cursor paging and populated links. No GraphQL yet.
    them: REST by default, and GraphQL through Strapi's built-in GraphQL plugin.
    source: https://docs.strapi.io/cms/api/content-api
  - topic: Drafts
    tachyon: Not yet. Drafts, versions and scheduled publishing are milestone 4.
    them: Draft & Publish, free, switched on per content type.
    source: https://docs.strapi.io/cms/features/draft-and-publish
  - topic: Content history
    tachyon: Not yet.
    them: On the Growth plan (14 days kept) and Enterprise (you choose).
    source: https://strapi.io/pricing-self-hosted
  - topic: Translations
    tachyon: Not yet. Localization is milestone 5.
    them: Internationalization, free, with content kept per locale.
    source: https://docs.strapi.io/cms/features/internationalization
  - topic: Media
    tachyon: Not yet. A media library is milestone 6.
    them: A free Media Library for every uploaded asset.
    source: https://docs.strapi.io/cms/features/media-library
  - topic: Roles
    tachyon: Four built-in roles plus your own, and access rules per collection, global and field that go into the SQL query.
    them: Author, Editor and Super Admin in the admin panel, custom roles, and conditions such as "the administrator must be the creator".
    source: https://docs.strapi.io/cms/features/rbac
  - topic: Extending
    tachyon: No plugins yet. WebAssembly plugins are milestone 9.
    them: Plugins and providers, found through the Marketplace in the admin panel.
    source: https://docs.strapi.io/cms/plugins/installing-plugins-via-marketplace
  - topic: Licence and price
    tachyon: MIT, and free. There's no paid tier.
    them: The Community edition is MIT and free. Growth is $45 a month with three users; Enterprise is quoted.
    source: https://strapi.io/pricing-self-hosted
  - topic: Hosted for you
    tachyon: No. You run it, beside your own Postgres.
    them: Strapi Cloud, from $35 a project a month.
    source: https://strapi.io/pricing-cloud
notYet:
  - There's no admin panel. Content types, users and documents are managed over HTTP or with the `tachyon` command.
  - No media library, no drafts and no translations.
  - No GraphQL. That's milestone 7, with OpenAPI.
  - No plugins and no marketplace.
  - No hosted option. You run the binary or the Docker image, and the database.
  - It's pre-alpha, so keep it off the public internet for now.
---

## Who should pick which

**Pick Strapi** if you want an open-source headless CMS with an admin panel your editors can use this week. Media, drafts, translations and a plugin marketplace come free, and Strapi Cloud will host it if you'd rather not. If your team already lives in Node.js, it'll feel like home.

**Pick TachyonCMS** if what you care about most is one Rust binary on Postgres, content types you keep as files in Git, and access rules down to a single field that land in the database query itself. Today, that's a developer's tool. Pick it if you can build against an API now and wait for the admin.

Plenty of people will try both. That's fine by me.
