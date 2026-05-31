import type { GetConceptOptions } from './get-concept-options.js';

/**
 * `get` and `getByCode` accept the same optional flags — the only
 * difference is how the concept is identified (numeric ID vs.
 * vocabulary+code). Aliased rather than duplicated so any new option
 * added to `GetConceptOptions` automatically propagates here.
 */
export type GetConceptByCodeOptions = GetConceptOptions;
