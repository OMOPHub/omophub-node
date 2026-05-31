import type { Coding } from './fhir.js';
import type { ResolveCommonOptions } from './resolve-common-options.js';

/**
 * Options for `fhir.resolve()`. Accepts either flat fields
 * (`{ system, code, display, vocabularyId }`) or a nested `coding` object
 * — mirrors the Python SDK's `_extract_coding`. The flat form takes
 * precedence when both are supplied.
 *
 * At minimum, `code` (or `coding.code`) is required.
 *
 * Common knobs (`resourceType`, `includeRecommendations`,
 * `recommendationsLimit`, `includeQuality`, `onUnmapped`) are inherited
 * from `ResolveCommonOptions` and shared with `resolveBatch` /
 * `resolveCodeableConcept`.
 */
export interface ResolveOptions extends ResolveCommonOptions {
  // Flat-form fields
  system?: string;
  code?: string;
  display?: string;
  vocabularyId?: string;

  // Nested-form
  coding?: Coding;
}
