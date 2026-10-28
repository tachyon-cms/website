---
title: HTTP API
description: How requests to the TachyonCMS v0.1.0 HTTP API work, and a table of every endpoint.
---

Every endpoint TachyonCMS v0.1.0 serves. This page covers what they share and lists them all. Each area has its own page with a section per endpoint: [Sign-in and keys](/reference/http-api/auth), [Users and roles](/reference/http-api/users-and-roles), [Content types](/reference/http-api/collections) and [Documents](/reference/http-api/documents).

The guides explain the ideas behind them: [Sign-in](/sign-in), [API keys](/api-keys), [Roles](/roles), [Content types](/content-types), [Querying](/querying) and [Access rules](/access-rules).

## Requests and responses

- Every path starts with `/api`. The examples call `localhost:3000` and send `$TOKEN`, the Admin's bearer token from [`POST /api/auth/login`](/reference/http-api/auth#post-apiauthlogin), or `$AUTHOR_TOKEN`, an Author's.
- Request bodies are JSON with `content-type: application/json`, up to 10 MB.
- Responses are JSON. Errors are `application/problem+json`; see [Errors](/reference/errors).
- Every response carries an `x-request-id` header.
- A request that runs for more than 30 seconds is stopped with a `503`.
- Documents come back with `id`, `createdAt`, `updatedAt` and `status` (always `"published"` in v0.1.0) besides their fields. Keys are in alphabetical order.

### Credentials

Send one of these, or nothing:

| Credential | How | Notes |
|---|---|---|
| Session cookie | `__Host-tachyon_session`, set by sign-in | For browsers. A change (any method but `GET`, `HEAD` or `OPTIONS`) must also send an `Origin` matching [`public_url`](/reference/config#top-level-keys) or `allowed_origins`, or it's a `403`. An expired cookie counts as signed out. |
| Session token | `authorization: Bearer tcs_…` | From sign-in with `"bearer": true`. An ended session is a `401`. |
| API key | `authorization: Bearer tcy_…` | From [`POST /api/auth/keys`](/reference/http-api/auth#post-apiauthkeys). Acts as its owner, narrowed by its scopes. |

### Who can call what

The **Who** row of each endpoint uses these terms:

| Term | Means |
|---|---|
| Anyone | No credentials needed. Read rules still decide what comes back. |
| Signed in | A session, or an API key with the `admin` scope. Other keys get a `403`. |
| Session | A session only. API keys are refused. |
| `users` ability | A role with `users: true` (Admin by default). Keys also need the `admin` scope. A role with this ability can do everything an Admin can. |
| `schemas` ability | A role with `schemas: true` (Admin by default). Keys also need the `admin` scope. |
| Content | The role's `content` ability, the collection's [access rules](/access-rules) and, for a key, its [scopes](/api-keys#scopes): `collection:read`, `collection:write`, `*:read`, `*:write` or `admin`. |

Signed out, a refusal is a `401 Sign in first.`; signed in, it's a `403`.

Any endpoint can also return `400` for a body that isn't JSON, `401` for credentials that don't work, `413`, `500` and `503`. The **Errors** rows list the rest.

## All endpoints

| Method and path | Does | Who |
|---|---|---|
| [`GET /api/setup`](/reference/http-api/auth#get-apisetup) | Says whether setup is needed. | Anyone |
| [`POST /api/setup`](/reference/http-api/auth#post-apisetup) | Creates the first Admin. | Anyone, once |
| [`POST /api/auth/login`](/reference/http-api/auth#post-apiauthlogin) | Signs in. | Anyone |
| [`POST /api/auth/logout`](/reference/http-api/auth#post-apiauthlogout) | Signs out. | Session |
| [`GET /api/auth/me`](/reference/http-api/auth#get-apiauthme) | Returns your account. | Signed in |
| [`GET /api/auth/sessions`](/reference/http-api/auth#get-apiauthsessions) | Lists your sessions. | Signed in |
| [`DELETE /api/auth/sessions/{id}`](/reference/http-api/auth#delete-apiauthsessionsid) | Ends one of your sessions. | Signed in |
| [`POST /api/auth/password`](/reference/http-api/auth#post-apiauthpassword) | Changes your password. | Session |
| [`GET /api/auth/keys`](/reference/http-api/auth#get-apiauthkeys) | Lists your API keys. | Session |
| [`POST /api/auth/keys`](/reference/http-api/auth#post-apiauthkeys) | Makes an API key. | Session |
| [`DELETE /api/auth/keys/{id}`](/reference/http-api/auth#delete-apiauthkeysid) | Revokes an API key. | Session |
| [`POST /api/auth/keys/{id}/rotate`](/reference/http-api/auth#post-apiauthkeysidrotate) | Replaces an API key. | Session |
| [`GET /api/users`](/reference/http-api/users-and-roles#get-apiusers) | Lists users. | `users` ability |
| [`POST /api/users`](/reference/http-api/users-and-roles#post-apiusers) | Creates a user. | `users` ability |
| [`GET /api/users/{id}`](/reference/http-api/users-and-roles#get-apiusersid) | Reads a user. | Yourself, or `users` ability |
| [`PATCH /api/users/{id}`](/reference/http-api/users-and-roles#patch-apiusersid) | Changes a user. | Yourself, or `users` ability |
| [`DELETE /api/users/{id}`](/reference/http-api/users-and-roles#delete-apiusersid) | Deletes a user. | `users` ability |
| [`GET /api/admin/roles`](/reference/http-api/users-and-roles#get-apiadminroles) | Lists roles. | Signed in |
| [`POST /api/admin/roles`](/reference/http-api/users-and-roles#post-apiadminroles) | Adds a role. | `users` ability |
| [`PUT /api/admin/roles/{slug}`](/reference/http-api/users-and-roles#put-apiadminrolesslug) | Changes a custom role. | `users` ability |
| [`DELETE /api/admin/roles/{slug}`](/reference/http-api/users-and-roles#delete-apiadminrolesslug) | Removes a custom role. | `users` ability |
| [`GET /api/admin/collections`](/reference/http-api/collections#get-apiadmincollections) | Lists content types. | Signed in |
| [`POST /api/admin/collections`](/reference/http-api/collections#post-apiadmincollections) | Creates a content type. | `schemas` ability |
| [`GET /api/admin/collections/{slug}`](/reference/http-api/collections#get-apiadmincollectionsslug) | Reads a content type. | Signed in |
| [`PUT /api/admin/collections/{slug}`](/reference/http-api/collections#put-apiadmincollectionsslug) | Changes a content type. | `schemas` ability |
| [`POST /api/admin/collections/{slug}/preview`](/reference/http-api/collections#post-apiadmincollectionsslugpreview) | Previews a change. | `schemas` ability |
| [`GET /api/access`](/reference/http-api/documents#get-apiaccess) | Says what you may do. | Anyone |
| [`GET /api/globals/{slug}`](/reference/http-api/documents#get-apiglobalsslug) | Reads a global. | Content |
| [`PATCH /api/globals/{slug}`](/reference/http-api/documents#patch-apiglobalsslug) | Changes a global. | Content |
| [`GET /api/{collection}`](/reference/http-api/documents#get-apicollection) | Lists documents. | Content |
| [`POST /api/{collection}`](/reference/http-api/documents#post-apicollection) | Creates a document. | Content |
| [`GET /api/{collection}/{id}`](/reference/http-api/documents#get-apicollectionid) | Reads a document. | Content |
| [`PATCH /api/{collection}/{id}`](/reference/http-api/documents#patch-apicollectionid) | Changes a document. | Content |
| [`DELETE /api/{collection}/{id}`](/reference/http-api/documents#delete-apicollectionid) | Deletes a document. | Content |
| [`GET /api/{collection}/{id}/references`](/reference/http-api/documents#get-apicollectionidreferences) | Lists documents that link here. | Content |
