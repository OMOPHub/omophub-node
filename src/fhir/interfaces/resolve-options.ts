import type { Coding } from './fhir.js';

/**
 * Options for `fhir.resolve()`. Accepts either flat fields
 * (`{ system, code, display, vocabularyId }`) or a nested `coding` object
 * — mirrors the Python SDK's `_extract_coding`. The flat form takes
 * precedence when both are supplied.
 *
 * At minimum, `code` (or `coding.code`) is required.
 */
export interface ResolveOptions {
  // Flat-form fields
  system?: string;
  code?: string;
  display?: string;
  vocabularyId?: string;

  // Nested-form
  coding?: Coding;

  // Common
  /** FHIR resource type for context-aware mapping (e.g. `'Condition'`, `'Observation'`). */
  resourceType?: string;
  /** Include Phoebe-style recommendations alongside the resolution. */
  includeRecommendations?: boolean;
  /** Max recommendations (1–20). Default 5 at the API. */
  recommendationsLimit?: number;
  includeQuality?: boolean;
  /**
   * `'error'` (default) returns a 404 for unmapped codings; `'sentinel'`
   * returns a `concept_id: 0` row so batch flows can keep going.
   */
  onUnmapped?: 'error' | 'sentinel';
}
