---
name: Contentful
summary: "Contentful is a hosted content platform with editors, previews and a CDN ready to go. TachyonCMS is software you run yourself, and it's still an API without an admin."
checked: 2026-10-28
rows:
  - topic: Where it runs
    tachyon: On your server, as a release binary or a Docker image, beside your own Postgres.
    them: Contentful runs it for you. Content goes out through a CDN from data centres around the world, with EU data residency as an option.
    source: https://www.contentful.com/developers/docs/references/api-basics/
  - topic: Reading content
    tachyon: REST, with filters, sorting, cursor paging and populated links. Reading needs no sign-in unless a rule says so.
    them: The Content Delivery API, read-only JSON over the CDN, plus a GraphQL Content API whose schema follows your content types.
    source: https://www.contentful.com/developers/docs/references/api-basics/
  - topic: Writing content
    tachyon: The same REST API, signed in with a session, a bearer token or a scoped API key.
    them: The Content Management API, which Contentful's own web app is built on.
    source: https://www.contentful.com/developers/docs/references/api-basics/
  - topic: Previews and images
    tachyon: Neither yet. Drafts are milestone 4 and media is milestone 6.
    them: A Content Preview API for unpublished content, and an Images API that resizes, crops and converts.
    source: https://www.contentful.com/developers/docs/references/api-basics/
  - topic: Editing
    tachyon: No admin screen yet. You work over HTTP or with the `tachyon` command.
    them: A web app with a rich text editor, scheduled publishing, content versioning, comments and live preview, depending on your plan.
    source: https://www.contentful.com/pricing/
  - topic: Roles
    tachyon: Four built-in roles plus your own, and access rules per collection, global and field that go into the SQL query.
    them: Admin and Editor on Free, Author too on Lite, and custom roles on Enterprise.
    source: https://www.contentful.com/pricing/
  - topic: Languages
    tachyon: Not yet. Localization is milestone 5.
    them: Two locales on Free, three on Lite, and as many as you agree on Enterprise.
    source: https://www.contentful.com/pricing/
  - topic: Limits
    tachyon: Whatever your server and database can take. There are no quotas.
    them: Free has 10 users, 25 content types, 10,000 records and 100K API calls a month. Lite raises those.
    source: https://www.contentful.com/pricing/
  - topic: Price
    tachyon: Free, under MIT. You pay for your own server and database.
    them: Free for learning and exploring, Lite at $300 a month, and Enterprise quoted.
    source: https://www.contentful.com/pricing/
notYet:
  - There's no admin screen, and none of the editing extras that come with one.
  - No previews, image transforms, versions, scheduled publishing or locales.
  - No GraphQL. That's milestone 7.
  - No CDN or hosted service. You run it and keep it up.
  - No apps or webhooks. Plugins and webhooks are milestone 9.
  - It's pre-alpha, so keep it off the public internet for now.
---

## Who should pick which

**Pick Contentful** if you'd rather nobody on your team ran a server. Editors get a finished web app, developers get REST and GraphQL from a CDN, and the plans grow with you. For a marketing team that needs to ship this quarter, that's the safer bet, and it isn't close.

**Pick TachyonCMS** if your content has to stay on infrastructure you control, you don't want record or API-call quotas, or you'd like the whole thing under MIT. It'll ask more of you: you host it, and until the admin lands, you edit through the API.

Already on Contentful's free plan and bumping into its limits? That's a fair reason to look around. Just weigh the admin you'd be giving up today.
