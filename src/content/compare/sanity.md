---
name: Sanity
summary: "Sanity pairs an editor you shape in code with its Content Lake, where your content is stored. TachyonCMS keeps everything in your own Postgres, and doesn't have an editor yet."
checked: 2026-10-28
rows:
  - topic: Where content lives
    tachyon: In your own PostgreSQL database, on a server you run.
    them: In Sanity's Content Lake, which stores it as structured JSON documents.
    source: https://www.sanity.io/docs/content-lake
  - topic: Editing
    tachyon: No admin screen yet. You work over HTTP or with the `tachyon` command.
    them: Sanity Studio, an open-source, real-time collaborative editor you configure in JavaScript or TypeScript and extend with React. You can deploy it yourself or on Sanity's hosting.
    source: https://www.sanity.io/docs/studio
  - topic: Querying
    tachyon: REST, with `where` filters, sorting, cursor paging, and `select` and `populate` to return only the fields you want.
    them: GROQ, a query language that combines documents and returns only the fields you ask for.
    source: https://www.sanity.io/docs/groq
  - topic: GraphQL
    tachyon: Not yet. That's milestone 7.
    them: A read-only GraphQL API generated from your schema and deployed with the Sanity CLI. Writes go through the Mutation API.
    source: https://www.sanity.io/docs/graphql
  - topic: History
    tachyon: Not yet. Drafts and versions are milestone 4.
    them: Every edit is kept as revision history. Free keeps 3 days, Growth 90 and Enterprise 365.
    source: https://www.sanity.io/docs/content-lake/history-experience
  - topic: Roles
    tachyon: Four built-in roles plus your own on any install, and access rules per collection, global and field that go into the SQL query.
    them: Administrator and Viewer on every plan, Editor, Developer and Contributor from Growth up, and custom roles on some Enterprise plans.
    source: https://www.sanity.io/docs/user-guides/roles
  - topic: Licence
    tachyon: MIT, the whole thing.
    them: Sanity Studio is MIT.
    source: https://github.com/sanity-io/sanity
  - topic: Price
    tachyon: Free. You pay for your own server and database.
    them: Free for up to 20 seats, 2 public datasets and 10k documents. Growth is $15 a seat a month; Enterprise is quoted.
    source: https://www.sanity.io/pricing
notYet:
  - There's no editor of any kind, let alone a real-time collaborative one.
  - No revision history, drafts, media library or translations.
  - No GraphQL and no query language beyond REST parameters.
  - No hosted service. Running the server and its database is your job.
  - It's pre-alpha, so keep it off the public internet for now.
---

## Who should pick which

**Pick Sanity** if a team of editors needs to work in the same documents at once, in an editor you can bend to fit your content, and you're happy for that content to live in Sanity's Content Lake. The free plan goes a long way for a small team, and none of that collaboration exists in TachyonCMS.

**Pick TachyonCMS** if the content has to sit in a database you run, every line of the stack has to be MIT, or you want custom roles and field-level rules on a free install. You'll be building against an API for now, because the admin is still on its way.

Not sure which matters more to you? Ask yourself who'll be editing next month. If the answer is "people who don't write code", that's Sanity, today.
