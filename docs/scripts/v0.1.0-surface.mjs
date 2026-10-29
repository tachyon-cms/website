// The public surface of TachyonCMS v0.1.0, copied by hand from the tagged source so the
// reference pages can be checked against it without network or git. Update it with each
// release, from the files named beside each list.

// crates/tachyon-api/src/lib.rs:79-110 and crates/tachyon-api/src/auth/routes.rs:33-62
export const routes = [
  'GET /api/setup',
  'POST /api/setup',
  'POST /api/auth/login',
  'POST /api/auth/logout',
  'GET /api/auth/me',
  'GET /api/auth/sessions',
  'DELETE /api/auth/sessions/{id}',
  'POST /api/auth/password',
  'GET /api/auth/keys',
  'POST /api/auth/keys',
  'DELETE /api/auth/keys/{id}',
  'POST /api/auth/keys/{id}/rotate',
  'GET /api/users',
  'POST /api/users',
  'GET /api/users/{id}',
  'PATCH /api/users/{id}',
  'DELETE /api/users/{id}',
  'GET /api/admin/roles',
  'POST /api/admin/roles',
  'PUT /api/admin/roles/{slug}',
  'DELETE /api/admin/roles/{slug}',
  'GET /api/admin/collections',
  'POST /api/admin/collections',
  'GET /api/admin/collections/{slug}',
  'PUT /api/admin/collections/{slug}',
  'POST /api/admin/collections/{slug}/preview',
  'GET /api/access',
  'GET /api/globals/{slug}',
  'PATCH /api/globals/{slug}',
  'GET /api/{collection}',
  'POST /api/{collection}',
  'GET /api/{collection}/{id}',
  'PATCH /api/{collection}/{id}',
  'DELETE /api/{collection}/{id}',
  'GET /api/{collection}/{id}/references',
];

// FieldKind in crates/tachyon-core/src/schema.rs:170-279 (`checkbox` is an alias of `boolean`)
export const fieldTypes = {
  text: ['minLength', 'maxLength', 'hasMany', 'minRows', 'maxRows'],
  textarea: ['minLength', 'maxLength'],
  number: ['min', 'max', 'integer', 'hasMany', 'minRows', 'maxRows'],
  boolean: [],
  date: ['dateOnly'],
  email: [],
  url: [],
  select: ['options', 'multiple'],
  radio: ['options'],
  code: ['language'],
  point: [],
  slug: ['from'],
  relationship: ['relationTo', 'hasMany', 'maxDepth'],
  json: [],
  join: ['collection', 'on', 'where', 'defaultLimit', 'defaultSort'],
  group: ['fields'],
  array: ['fields', 'minRows', 'maxRows'],
  row: ['fields'],
  collapsible: ['initiallyCollapsed', 'fields'],
  tabs: ['tabs'],
};

// Field in crates/tachyon-core/src/schema.rs:69-94
export const fieldOptions = ['name', 'type', 'label', 'required', 'default', 'unique', 'filterable', 'admin', 'virtual', 'access'];

// Op in crates/tachyon-core/src/query.rs:219-264
export const operators = ['equals', 'not_equals', 'in', 'not_in', 'gt', 'gte', 'lt', 'lte', 'like', 'contains', 'exists', 'near'];

// Config and AuthSettings in crates/tachyon/src/config.rs:9-49
export const configKeys = [
  'database_url',
  'listen',
  'public_url',
  'auth.session_idle',
  'auth.session_absolute',
  'auth.lockout_attempts',
  'auth.lockout_window',
  'auth.lockout_duration',
  'auth.argon2_memory_kib',
  'auth.breach_check',
  'auth.breach_check_url',
  'auth.allowed_origins',
];

// ApiError::into_response in crates/tachyon-api/src/error.rs:59-116: status and title
export const errors = [
  [400, 'Bad request'],
  [401, 'Unauthorized'],
  [403, 'Forbidden'],
  [404, 'Not found'],
  [405, 'Method not allowed'],
  [409, 'Conflict'],
  [409, 'Confirmation required'],
  [413, 'Content too large'],
  [422, 'Validation failed'],
  [500, 'Internal server error'],
  [503, 'Service unavailable'],
];
