---
title: "Say who sees what once, in the schema."
summary: "Roles decide who can change what. Rules narrow that per collection, global and field, and they're compiled into the SQL for whoever is asking."
status: today
sources:
  - README.md#who-can-do-what
  - README.md#access-rules
  - crates/tachyon-core/src/access.rs
  - crates/tachyon-api/src/access.rs
  - crates/tachyon-api/src/auth/roles.rs
---

## Four roles to start with

Unless a rule says otherwise, anyone can read, and signed-in users write according to their role.

| Role | Can |
| --- | --- |
| Viewer | read |
| Author | create content, and change or delete what they created |
| Editor | change all content and globals |
| Admin | everything, including content types, users and roles |

Need a reviewer, or an HR role? Add your own beside these four.

## Rules for which documents

Roles answer "who are you?". Most sites also need "which documents?": visitors see what's published, and authors see their own drafts too. That's what a rule says.

You can put one on a collection (read, create, update, delete), on a global (read, update) or on a field at any depth, inside groups, lists and tabs too. A rule is `true` or `false`, a role or a list of roles, `{"signedIn": true}`, an `and` or an `or`, or a filter written exactly the way `where` takes it. A filter can compare with the person asking, through `$user.id`, `$user.role` or a field from their profile such as `$user.team`.

So a salary field that only HR reads is one line on the field: `"access": {"read": {"role": "hr"}}`.

## Enforced in the query, not after it

This is the part I'd want to know first. A rule's filter goes into the database query everywhere a document can appear: lists, single reads, populated links, joins, virtual fields, and filters through relationships. Nobody can probe for a hidden document with `where[author.team]`, because the documents they can't see were never in the result to begin with.

A document you can't read is a 404, not a 403 that admits it's there. Updates and deletes are checked against the stored document inside the write. A field you can't read is missing from every response, and filtering or sorting on it is a 403 that names the parameter. API keys stay narrowed by their scopes on top of all of it. Admins pass every rule, so nobody can lock themselves out.

## Ask what you're allowed to do

`GET /api/access` answers for whoever asks. Each collection, global and field comes back `true`, `false` or `"conditional"`, which means it depends on the document. A front end can hide the buttons that would only fail.

## Checked when you save

A rule with a typo, a role that doesn't exist or a `$user` field that isn't there is refused when you save the schema, through the API or `tachyon schema apply`, with an error that names the rule. Deleting a role that a rule still names is refused too, so a rule can't quietly start meaning something else.

## Where it stops today

- A unique field gives one thing away. Saving a duplicate fails with a 422 even when the document holding that value is hidden from you, so don't make a field unique if its values must stay secret.
- Field rules use roles, sign-in and `true` or `false` for now, not filters.
- The `users` collection doesn't take collection rules yet. Saving one is refused rather than left doing nothing; rules on its profile fields work.
