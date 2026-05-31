import type { ResolveCommonOptions } from './resolve-common-options.js';

/**
 * Options for `fhir.resolveBatch(codings, options)`. All fields are
 * inherited from `ResolveCommonOptions` — `recommendationsLimit` is
 * applied **per coding** in the batch.
 */
export type ResolveBatchOptions = ResolveCommonOptions;
