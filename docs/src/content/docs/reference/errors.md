---
title: Errors
description: The problem+json error format TachyonCMS v0.1.0 uses, every status it returns, and the messages behind them.
---

Every error from the API is a JSON object with the content type `application/problem+json`, in the format of [RFC 9457](https://www.rfc-editor.org/rfc/rfc9457). The status and `title` say what kind of problem it is, and `detail` says what went wrong.

```json
{
  "detail": "unknown query parameter `filter`",
  "requestId": "01a18491-017e-731c-863e-064c9439f5a5",
  "status": 400,
  "title": "Bad request",
  "type": "about:blank"
}
```

## Members

| Member | Type | Present | Description |
|---|---|---|---|
| `type` | string | always | Always `about:blank`: the status and title are the whole classification. |
| `title` | string | always | The status's title, from the table below. |
| `status` | number | always | The HTTP status code, repeated. |
| `requestId` | string | always | The request's ID, also sent in the `x-request-id` header and written to every log line for the request. |
| `detail` | string | most errors | What went wrong, in a sentence you can show a person. Absent from `404`, `405`, `422` and `500`. |
| `errors` | array | `422` only | One `{"path", "message"}` object per problem. |
| `preview` | object | `409 Confirmation required` only | What a schema change would do. See [Content types](/content-types#rename-a-field). |

A request can send its own `x-request-id` of up to 128 letters, digits, `-` and `_`. The server keeps it instead of making one, so you can follow a request from a proxy to the logs.

## Statuses

| Status | Title | Returned when |
|---|---|---|
| `400` | Bad request | The body isn't JSON or has the wrong shape, or a query parameter is unknown or malformed. |
| `401` | Unauthorized | Nobody is signed in and the request needs someone to be, or the credentials sent don't work. |
| `403` | Forbidden | The caller is known but may not do this: their role, an access rule or a key's scopes refuse it. |
| `404` | Not found | No such route, collection, global or document, or one the caller can't read. A malformed ID is a `404` too. |
| `405` | Method not allowed | The route exists, but not with this method. |
| `409` | Conflict | The request clashes with stored data: setup already done, a slug or role that exists, a document other documents link to. |
| `409` | Confirmation required | A schema change would remove or retype fields, or leave documents that won't validate. Send it again with `"confirm": true`. |
| `413` | Content too large | The body is over 10 MB. |
| `422` | Validation failed | A document, schema, account or key doesn't pass its checks. |
| `500` | Internal server error | Something failed on the server. The cause is logged with the `requestId`, never sent. |
| `503` | Service unavailable | The request ran for more than 30 seconds and was stopped. Try again. |

## Validation errors

A `422` lists every problem at once. `path` is a dotted path to the field, with list rows by position, such as `links.0.url`. An empty `path` means the body as a whole, or, for a schema, the schema as a whole with the field named in the message.

```json
{
  "errors": [
    {
      "message": "is required",
      "path": "title"
    },
    {
      "message": "expected a list",
      "path": "tags"
    }
  ],
  "requestId": "01a18491-0171-7206-8221-f7a2ec928076",
  "status": 422,
  "title": "Validation failed",
  "type": "about:blank"
}
```

The messages for each field type are in [Field types](/reference/field-types#validation-messages).

## Common messages

These are the `detail` texts you're most likely to meet, by status.

### `400`

| Detail | Cause |
|---|---|
| `` Expected request with `Content-Type: application/json` `` | A body sent without that header. |
| `Failed to parse the request body as JSON: …` | A body that isn't valid JSON. |
| `` unknown field `remember`, expected one of `email`, `password`, `bearer` `` | A key the endpoint doesn't take. Sign-in, setup, password, key, role and schema-change bodies refuse unknown keys. |
| `` unknown query parameter `filter` `` | A query parameter the endpoint doesn't take. |
| `limit must be at least 1`, `page must be at least 1`, `depth must be between 0 and 5`, `count must be true or false` | A list parameter out of range. |
| `use either page or after, not both`, `after isn't a valid cursor`, `after doesn't match this sort; start again without it` | A cursor problem. See [Page through results](/querying#page-through-results). |
| `where[…]: …`, `sort: …` | A filter or sort that doesn't fit the collection. See [Filters and sorting](/reference/filters#errors). |
| ``field `title`: unknown variant `string`, expected one of `text`, … `` | A schema with an unknown field type. |

### `401`

| Detail | Cause |
|---|---|
| `Sign in first.` | No credentials, for something that needs them. |
| `Email or password is wrong.` | A failed sign-in, including a locked account. |
| `This session has ended. Sign in again.` | A bearer session token that expired or was signed out. |
| `This API key isn't valid, or has expired or been revoked.` | An API key that doesn't work, including one replaced by rotation. |
| `Use Authorization: Bearer followed by an API key or a session token.` | An `Authorization` header in any other form. |

A session cookie that has expired counts as signed out rather than a `401`, since browsers keep sending old cookies.

### `403`

| Detail | Cause |
|---|---|
| `You don't have permission to do this.` | The role, an access rule or the key's scopes refuse the action. |
| `You can only change documents you created.` | An Author changing or deleting someone else's document. |
| `An access rule doesn't let you change this document.` | An update or delete rule that the document doesn't match. |
| ``You don't have permission to write `author`.`` | A field rule refuses a field in the body. |
| `where[…]: you can't filter or sort by a field you can't read` | A filter or sort on a field a rule hides. |
| `This request came from another site.` | A change signed by the session cookie, from an origin other than `public_url` or `allowed_origins`. |
| `This API key can't do that; it needs the admin scope.` | A key without the `admin` scope, on a route for your own account, sessions, roles or content types. |
| `Manage API keys from a signed-in session, not with another key.` | Any `/api/auth/keys` route called with a key. |
| `You can only see and change your own account.` | Reading or changing another user without the `users` ability. |

### `409`

| Detail | Cause |
|---|---|
| `Setup has already been done. Sign in instead.` | `POST /api/setup` after the first account exists. |
| ``collection `posts` already exists``, ``role `reviewer` already exists`` | Creating something under a slug that's taken. |
| `1 other document links to this one; remove that link first` | Deleting a document that others link to. Callers other than an unscoped Admin get the count left out. |
| `This is the last Admin. Make someone else an Admin first.` | Deleting the last Admin, or giving them another role. |
| ``Some users have the role `reviewer`. Give them another role first.`` | Deleting a role that's in use. |
| ``access rules in posts name the role `reviewer`; change them first`` | Deleting a role an access rule names. |
| `` `editor` is a built-in role and can't be changed or removed. `` | Changing or deleting a built-in role. |
| `This collection's fields just changed. Reload and try again.` | A write that raced a schema change. |
| `a document with this value already exists` | A unique value that's taken, where no single field can be named. Usually this comes as a `422` on the field instead. |

## Examples

A route that doesn't exist, and a method a route doesn't take, have no `detail`:

```json
{
  "requestId": "01a18491-0197-76a2-b27d-4d6938fc9282",
  "status": 404,
  "title": "Not found",
  "type": "about:blank"
}
```

```json
{
  "requestId": "01a18491-0195-7752-b0bb-f2c734383a0f",
  "status": 405,
  "title": "Method not allowed",
  "type": "about:blank"
}
```

A body over 10 MB:

```json
{
  "detail": "the request body is over 10 MB",
  "requestId": "01a18491-019d-7531-9c64-de26c6eaa996",
  "status": 413,
  "title": "Content too large",
  "type": "about:blank"
}
```

A request stopped after 30 seconds has the `detail` `the request took too long; try again`.
