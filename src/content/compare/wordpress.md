---
name: WordPress
summary: "WordPress hands an editor a finished site on day one. TachyonCMS v0.1.0 is an API with no admin screen yet. Here's where each one really stands."
checked: 2026-10-28
rows:
  - topic: Built with
    tachyon: Rust, shipped as one binary.
    them: PHP, with 8.3 or newer recommended.
    source: https://wordpress.org/about/requirements/
  - topic: Database
    tachyon: PostgreSQL, and only PostgreSQL.
    them: MySQL 8.0 or newer, or MariaDB 10.11 or newer.
    source: https://wordpress.org/about/requirements/
  - topic: Editing
    tachyon: No admin screen yet. You work over HTTP or with the `tachyon` command.
    them: The block editor. Paragraphs, images, galleries and the rest are blocks you arrange, then view before you publish.
    source: https://wordpress.org/documentation/article/wordpress-block-editor/
  - topic: API
    tachyon: REST, generated from your content types, with filters that reach through relationships, sorting, cursor paging and populated links.
    them: A REST API that sends and receives JSON for posts, pages, taxonomies and the other built-in types.
    source: https://developer.wordpress.org/rest-api/
  - topic: API sign-in
    tachyon: A session cookie, a bearer token, or an API key scoped to what it needs.
    them: Cookie sign-in from inside WordPress, and Application Passwords over HTTPS for everything else.
    source: https://developer.wordpress.org/rest-api/using-the-rest-api/authentication/
  - topic: Drafts and history
    tachyon: Not yet. Drafts, versions and scheduled publishing are next on the roadmap, after rich text.
    them: Every saved draft or update is a revision you can compare and restore, and autosave keeps a backup while you write.
    source: https://wordpress.org/documentation/article/revisions/
  - topic: Media
    tachyon: Not yet. Media is on the roadmap, after drafts.
    them: A Media Library for images, video, audio and files, with crop, rotate and scale for images.
    source: https://wordpress.org/documentation/article/media-library-screen/
  - topic: Roles
    tachyon: Four built-in roles plus your own, and access rules per collection, global and field that go into the SQL query.
    them: Six predefined roles, from Subscriber up to Super Admin, each a set of capabilities.
    source: https://wordpress.org/documentation/article/roles-and-capabilities/
  - topic: Extending
    tachyon: No plugins yet. WebAssembly plugins are planned, with no date.
    them: A plugin directory, and more blocks through plugins.
    source: https://wordpress.org/plugins/
  - topic: Licence
    tachyon: MIT.
    them: GPLv2 or later.
    source: https://wordpress.org/about/license/
  - topic: Hosting
    tachyon: You host it. Release binaries or a Docker image, beside your own Postgres. There's no hosted service.
    them: Host it yourself, or on WordPress.com, which has a free plan and paid plans from US$4 a month billed yearly.
    source: https://wordpress.com/pricing/
notYet:
  - There's no admin screen. If you can't send an HTTP request, you can't publish with TachyonCMS yet.
  - No media uploads, drafts, revisions or scheduled posts.
  - No themes and no front end. TachyonCMS serves JSON, and the site that shows it is yours to build.
  - No plugins and no translations.
  - No WordPress importer. Bulk import is on the roadmap, after live preview.
  - It's pre-alpha, so keep it off the public internet for now.
---

## Who should pick which

**Pick WordPress** if the person publishing needs to log in tomorrow and get on with it. Revisions, a media library, themes and plugins are all there today, and none of them are in TachyonCMS yet. That's most people with a website to run, and I'd tell a friend the same thing.

**Pick TachyonCMS** if you're a developer building your own front end and you want the content model, the roles and the rules about who reads what as JSON in version control. You'll also need to be happy on pre-alpha software, and to wait for the admin.

Somewhere in between? A WordPress site you'd like to move one day can stay where it is while the admin and the importer get built. [Watch the repo](https://github.com/tachyon-cms/tachyoncms) and decide when there's something to move to.
