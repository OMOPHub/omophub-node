import type { SourceCodeRef } from './mapping.js';

interface MapConceptsBase {
  /** Target vocabulary ID (e.g. `'SNOMED'`, `'RxNorm'`). Required. */
  targetVocabulary: string;
  mappingType?: 'direct' | 'equivalent' | 'broader' | 'narrower';
  includeInvalid?: boolean;
  /**
   * Vocabulary release pin. Sent as a `?vocab_release=` query-string
   * parameter (NOT in the JSON body) — matches the Python SDK convention.
   */
  vocabRelease?: string;
}

/**
 * `mappings.map` accepts exactly one of two input shapes:
 * - `sourceConcepts`: numeric OMOP concept IDs to map.
 * - `sourceCodes`: native-vocabulary `(vocabulary_id, concept_code)` pairs.
 *
 * Enforced by the discriminated union at the type level; defended at
 * runtime in `mappings.map()` so JS callers / `as any` users get a
 * structured `missing_required_field` error rather than a wire 400.
 */
export type MapConceptsOptions = MapConceptsBase &
  (
    | { sourceConcepts: number[]; sourceCodes?: never }
    | { sourceConcepts?: never; sourceCodes: SourceCodeRef[] }
  );
