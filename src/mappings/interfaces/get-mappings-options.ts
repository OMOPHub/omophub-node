import type { PaginationOptions } from '../../common/interfaces/pagination.js';
import type { VocabReleaseMixin } from '../../common/interfaces/vocab-release.js';

export interface GetMappingsOptions extends PaginationOptions, VocabReleaseMixin {
  /** Restrict mappings to a single target vocabulary (e.g. `'SNOMED'`). */
  targetVocabulary?: string;
  /**
   * Relationship types to return. Comma-joined onto the query string; the
   * server defaults to `['Maps to']`.
   *
   * Pass `['Maps to', 'Maps to value']` to also get the Value-as-Concept
   * decomposition of composite concepts — "Allergy to penicillin G" maps to
   * "Allergy to drug" via `Maps to` and to "penicillin G" via
   * `Maps to value`, and the default returns only the first of those.
   */
  relationshipIds?: string[];
  /**
   * Whether to return mappings whose relationship or target concept is
   * deprecated. Omit to take the server default, which for this endpoint is
   * to **include** them; pass `false` to exclude them. The source concept is
   * never filtered, so a deprecated concept still returns what it maps to.
   */
  includeInvalid?: boolean;
}
