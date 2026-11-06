// The public surface on TachyonCMS main, for the next release: v0.2.0's, plus drafts,
// versions, scheduled publishing and the trash (tachyon-cms/tachyoncms#57, 939571e).
// Copied by hand from the source as for v0.2.0-surface.mjs; re-check with
// `git show main:<file>`. Rename it after the release it becomes. Field types and options,
// operators and error statuses didn't change.
import * as v020 from './v0.2.0-surface.mjs';

// crates/tachyon-api/src/lib.rs:106-167
export const routes = [
  ...v020.routes,
  'POST /api/globals/{slug}/publish',
  'POST /api/globals/{slug}/unpublish',
  'GET /api/globals/{slug}/versions',
  'GET /api/globals/{slug}/versions/{vid}',
  'POST /api/globals/{slug}/versions/{vid}/restore',
  'GET /api/globals/{slug}/diff',
  'PUT /api/globals/{slug}/schedule',
  'GET /api/globals/{slug}/schedule',
  'DELETE /api/globals/{slug}/schedule',
  'GET /api/{collection}/trash',
  'DELETE /api/{collection}/trash',
  'DELETE /api/{collection}/trash/{id}',
  'POST /api/{collection}/trash/{id}/restore',
  'POST /api/{collection}/{id}/publish',
  'POST /api/{collection}/{id}/unpublish',
  'GET /api/{collection}/{id}/versions',
  'GET /api/{collection}/{id}/versions/{vid}',
  'POST /api/{collection}/{id}/versions/{vid}/restore',
  'GET /api/{collection}/{id}/diff',
  'PUT /api/{collection}/{id}/schedule',
  'GET /api/{collection}/{id}/schedule',
  'DELETE /api/{collection}/{id}/schedule',
];

// `JobsSettings` in crates/tachyon/src/config.rs:54-60
export const configKeys = [...v020.configKeys, 'jobs.workers'];

export const { fieldTypes, fieldOptions, operators, errors } = v020;
