---
title: Roles
description: The four built-in roles, adding roles of your own, and managing users.
---

Every user has one role. The role sets what they can do by default; [access rules](/access-rules) can narrow that for a collection, a global or a field.

## Built-in roles

| Role | Can |
|---|---|
| Viewer | read |
| Author | create content, and change or delete what they created |
| Editor | change all content and globals |
| Admin | everything, including content types, users and roles |

Anyone, signed in or not, can read content unless an access rule says otherwise. Signed-out callers can't change anything.

An Author who tries to change someone else's document gets a `403`:

```json
{
  "detail": "You can only change documents you created.",
  "requestId": "01a18461-13f9-76cc-84e0-75f4761588c2",
  "status": 403,
  "title": "Forbidden",
  "type": "about:blank"
}
```

"Created" means the user who sent the create request. It isn't tied to any field, so a relationship such as `author` doesn't change it.

## Abilities

A role is three abilities. `GET /api/admin/roles` lists every role with them, for any signed-in user:

```sh
curl localhost:3000/api/admin/roles -H "authorization: Bearer $TOKEN"
```

```json
{
  "docs": [
    {
      "abilities": {
        "content": "all",
        "schemas": true,
        "users": true
      },
      "builtin": true,
      "name": "Admin",
      "slug": "admin"
    },
    {
      "abilities": {
        "content": "own",
        "schemas": false,
        "users": false
      },
      "builtin": true,
      "name": "Author",
      "slug": "author"
    },
    {
      "abilities": {
        "content": "all",
        "schemas": false,
        "users": false
      },
      "builtin": true,
      "name": "Editor",
      "slug": "editor"
    },
    {
      "abilities": {
        "content": "read",
        "schemas": false,
        "users": false
      },
      "builtin": true,
      "name": "Viewer",
      "slug": "viewer"
    }
  ]
}
```

| Ability | Values |
|---|---|
| `content` | `all`: create, change and delete any document, and change globals. `own`: create documents, and change or delete only their own. `read`: read only. |
| `schemas` | `true` to create and change content types. |
| `users` | `true` to manage users and roles, and other people's sessions. |

:::caution[`users: true` is as good as Admin]
A role with the `users` ability can change anyone's role, its own included, to `admin`, and can make API keys with the `admin` scope. Treat it as Admin-equivalent, and give it only to people you'd make Admin.
:::

## Add a role

An Admin, or a role with the `users` ability, can add roles with `POST /api/admin/roles`. The slug uses lowercase letters, digits and underscores, starting with a letter:

```sh
curl -X POST localhost:3000/api/admin/roles \
  -H "authorization: Bearer $TOKEN" \
  -H 'content-type: application/json' \
  -d '{"slug": "reviewer", "name": "Reviewer", "abilities": {"content": "read", "schemas": false, "users": false}}'
```

```json
{
  "abilities": {
    "content": "read",
    "schemas": false,
    "users": false
  },
  "builtin": false,
  "name": "Reviewer",
  "slug": "reviewer"
}
```

A custom role becomes useful when access rules name it: `{"role": "reviewer"}` can let reviewers read drafts that Viewers can't. See [Access rules](/access-rules).

`PUT /api/admin/roles/{slug}` changes a custom role's `name` and `abilities`. `DELETE /api/admin/roles/{slug}` removes one. Built-in roles can't be changed or removed, and neither can a role that users have or that an access rule names:

```json
{
  "detail": "Some users have the role `reviewer`. Give them another role first.",
  "requestId": "01a18469-2f1b-76b2-b596-a87bbbebdb15",
  "status": 409,
  "title": "Conflict",
  "type": "about:blank"
}
```

## Manage users

Users are managed at `/api/users` by Admins, or anyone whose role has the `users` ability.

| Method and path | Does |
|---|---|
| `GET /api/users` | Lists users with their email and role. Takes the same query parameters as any list. |
| `POST /api/users` | Creates a user. |
| `GET /api/users/{id}` | Reads a user. Anyone signed in can read their own. |
| `PATCH /api/users/{id}` | Changes a user. Anyone signed in can change their own profile. |
| `DELETE /api/users/{id}` | Deletes a user, and ends their sessions and API keys. |

Create a user with `email`, `password`, `role` and the profile fields. The role defaults to `viewer`:

```sh
curl -X POST localhost:3000/api/users \
  -H "authorization: Bearer $TOKEN" \
  -H 'content-type: application/json' \
  -d '{"email": "ann@example.com", "password": "violet kettle under the stairs", "role": "author", "name": "Ann"}'
```

```json
{
  "createdAt": "2026-10-28T21:18:30.842219Z",
  "email": "ann@example.com",
  "id": "01a18460-fbba-75ad-be56-f085bab18202",
  "name": "Ann",
  "role": "author",
  "status": "published",
  "updatedAt": "2026-10-28T21:18:30.842219Z"
}
```

Change someone's role with `PATCH`:

```sh
curl -X PATCH localhost:3000/api/users/01a18460-fc34-726a-859b-7c494b9f7192 \
  -H "authorization: Bearer $TOKEN" \
  -H 'content-type: application/json' \
  -d '{"role": "reviewer"}'
```

```json
{
  "createdAt": "2026-10-28T21:18:30.964467Z",
  "email": "rae@example.com",
  "id": "01a18460-fc34-726a-859b-7c494b9f7192",
  "name": "Rae",
  "role": "reviewer",
  "status": "published",
  "updatedAt": "2026-10-28T21:18:30.964467Z"
}
```

A few safeguards:

- Only an Admin, or a role with the `users` ability, can change a role.
- The last Admin can't be removed or given another role:

  ```json
  {
    "detail": "This is the last Admin. Make someone else an Admin first.",
    "requestId": "01a18469-2f00-7650-a2e9-2cfd9fefb606",
    "status": 409,
    "title": "Conflict",
    "type": "about:blank"
  }
  ```

- To change your own email, send your password as `currentPassword` too.
- Change your own password with [`POST /api/auth/password`](/sign-in#change-your-password), not here.

## Profiles and privacy

A user's email, role and password stay private: only `/api/users` and `/api/auth/me` show them. Their profile is different. `name` and every other profile field show wherever a document [links to them](/relationships#linking-to-users), to anyone who can read that document.

For a profile field that shouldn't travel, such as a phone number, add the field to `users` with a [field rule](/access-rules#field-rules): `"access": {"read": {"role": "admin"}}`. Then only Admins see it in a populated author or can filter on it.
