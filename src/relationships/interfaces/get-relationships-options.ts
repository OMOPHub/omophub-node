import type { PaginationOptions } from '../../common/interfaces/pagination.js';
import type { VocabReleaseMixin } from '../../common/interfaces/vocab-release.js';

/**
 * Options for `relationships.get(conceptId, ...)`.
 *
 * Shares the wire endpoint with `concepts.relationships(conceptId, ...)` —
 * the two methods are kept as parallel entry points so users who think
 * concept-first or relationship-first both have a discoverable surface.
 * Keep field lists in sync with `ConceptRelationshipsOptions`.
 */
export interface GetRelationshipsOptions extends PaginationOptions, VocabReleaseMixin {
  relationshipIds?: string[];
  vocabularyIds?: string[];
  domainIds?: string[];
  includeInvalid?: boolean;
  standardOnly?: boolean;
  includeReverse?: boolean;
}
