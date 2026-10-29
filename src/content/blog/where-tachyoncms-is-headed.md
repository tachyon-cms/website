---
title: Where TachyonCMS is headed
description: Rich text first, then drafts and scheduling, media, live preview and authoring tools, and after those the admin screen. Here's the order, what sets it, and ten places to jump in.
date: 2026-10-28
image: /media/blog/where-tachyoncms-is-headed/card.png
imageAlt: 'Where TachyonCMS is headed: rich text and blocks (under way), drafts, versions and scheduling, media, live preview, authoring tools, then the admin screen.'
---

Most CMS choices make you pick a side. You get one the developers love and the editors dread, or one the editors can use and the developers patch forever. I started TachyonCMS because I don't think you should have to choose.

[v0.1.0](/blog/v0-1-0) is the developer half, and it's out. Content types defined over the API or kept in a JSON file you diff and apply. Twenty-odd field types, relationships and map points among them. Filters that reach through relationships and into lists, and `select` and `populate` so you fetch only what you need. Sign-in, scoped API keys, roles, and access rules down to a single field.

What's left is everything an editor touches. Here's the order I'm building it in.

## What sets the order

I want tachyoncms.com running on TachyonCMS itself. Right now the page you're reading is a Markdown file in a Git repo. Moving it across is the goal, and the goal decides what comes first.

## The list

<figure>
  <a href="/media/blog/where-tachyoncms-is-headed/infographic.png"><img src="/media/blog/where-tachyoncms-is-headed/infographic.png" alt="Where TachyonCMS is headed. The goal: run tachyoncms.com on TachyonCMS itself. Next, in order: rich text and blocks (under way), drafts, versions and scheduled publishing, media, live preview, authoring tools, then the admin screen. Where you come in: ten open issues, a vote on the order in Discussion #39, and Discussion #38 to pick the first starter." width="1600" height="1953" loading="lazy" decoding="async" /></a>
  <figcaption>The order, on one page.</figcaption>
</figure>

1. **Rich text and blocks.** Long-form writing with code samples and tables, and pages built from reusable sections. This one's under way.
2. **Drafts, versions and scheduled publishing**, so nothing goes live before it's meant to.
3. **Media.** Upload once, reuse anywhere, with responsive images.
4. **Live preview** of a draft before it's published.
5. **Authoring tools.** Markdown in and out, and bulk import.

After those comes the admin screen. The bar for it: anyone who has used WordPress can pick it up without training.

None of that is in v0.1.0, and none of it has a date. What you're looking at is the order.

## Think the order's wrong?

Then I want to hear it now, not after it ships. [Vote on what comes next](https://github.com/tachyon-cms/tachyoncms/discussions/39), or say so in [the discussion this post started as](https://github.com/tachyon-cms/tachyoncms/discussions/35).

Building a site on top of TachyonCMS? [Tell me which front end](https://github.com/tachyon-cms/tachyoncms/discussions/38) you're using, and I'll build that starter first.

## Ten places to jump in

I've opened [ten issues](https://github.com/tachyon-cms/tachyoncms/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22%2C%22help+wanted%22) that are ready to pick up. Each one says which files to change, how to test it, and when it's done. Some are a ten-minute fix. Three harden security paths, and those get a careful review.

Say you're taking one, and it's yours.
