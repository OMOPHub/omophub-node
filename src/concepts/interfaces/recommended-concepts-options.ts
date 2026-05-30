import type { PaginationOptions } from '../../common/interfaces/pagination.js';

/**
 * OHDSI Phoebe-style concept recommendations. Server-side caps:
 * `conceptIds` 1–100, `relationshipTypes` ≤ 20, `vocabularyIds`/`domainIds` ≤ 50.
 */
export interface RecommendedConceptsOptions extends PaginationOptions {
  conceptIds: number[];
  relationshipTypes?: string[];
  vocabularyIds?: string[];
  domainIds?: string[];
  /** Defaults true at the API — restrict candidates to standard concepts. */
  standardOnly?: boolean;
  includeInvalid?: boolean;
}
