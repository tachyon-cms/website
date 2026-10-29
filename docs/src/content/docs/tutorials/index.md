---
title: Tutorials
description: Step-by-step walkthroughs that build something with TachyonCMS, with the real responses at every step.
---

Each tutorial builds one thing with TachyonCMS v0.1.0, from an empty database to a working result. You run every command yourself, and each step shows the response you should get back.

## Build a blog

In [Build a blog](/tutorials/build-a-blog) you start TachyonCMS and Postgres with Docker, then:

- add two authors who sign in with their own tokens;
- create a `posts` collection with a slug, an author and a `published` flag;
- write an access rule so drafts are visible only to the person who wrote them (and to Admins);
- query the front page, a single post and one author's posts, with each author's name filled in.

You need Docker and `curl`. If you'd rather learn one topic at a time, start with [Install](/install) and [Concepts](/concepts) instead.
