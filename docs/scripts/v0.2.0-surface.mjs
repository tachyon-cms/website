// The public surface of TachyonCMS v0.2.0: v0.1.0's, plus what blocks and rich text add,
// copied by hand from the source as for v0.1.0-surface.mjs. Operators, config keys and
// error statuses didn't change.
import * as v010 from './v0.1.0-surface.mjs';

// crates/tachyon-api/src/lib.rs:83-88: deleting a shared block
export const routes = [...v010.routes, 'DELETE /api/admin/collections/{slug}'];

// FieldKind::Blocks and FieldKind::RichText in crates/tachyon-core/src/schema.rs:282-301
export const fieldTypes = {
  ...v010.fieldTypes,
  blocks: ['blocks', 'minRows', 'maxRows'],
  richText: ['features', 'relationTo', 'blocks'],
};

export const { fieldOptions, operators, configKeys, errors } = v010;
