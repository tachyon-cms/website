// The public surface of TachyonCMS v0.2.0: v0.1.0's, plus what blocks and rich text add,
// copied by hand from the source as for v0.1.0-surface.mjs. Cited from the v0.2.0 tag
// (1cac741) by file, symbol and line; re-check with `git show v0.2.0:<file>`. Operators
// (`enum Op` in crates/tachyon-core/src/query.rs), config keys (`Config` and
// `AuthSettings` in crates/tachyon/src/config.rs) and error statuses didn't change.
import * as v010 from './v0.1.0-surface.mjs';

// crates/tachyon-api/src/lib.rs:83-88, `.route("/api/admin/collections/{slug}"` with
// `.delete(collections::delete)`: deleting a shared block
export const routes = [...v010.routes, 'DELETE /api/admin/collections/{slug}'];

// `enum FieldKind` variants `Blocks` (schema.rs:282-288) and `RichText` (schema.rs:291-301)
// in crates/tachyon-core/src/schema.rs; options are their serde names
export const fieldTypes = {
  ...v010.fieldTypes,
  blocks: ['blocks', 'minRows', 'maxRows'],
  richText: ['features', 'relationTo', 'blocks'],
};

export const { fieldOptions, operators, configKeys, errors } = v010;
