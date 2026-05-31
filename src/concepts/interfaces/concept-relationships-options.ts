import type { PaginationOptions } from '../../common/interfaces/pagination.js';
import type { VocabReleaseMixin } from '../../common/interfaces/vocab-release.js';

/**
 * Options for `concepts.relationships(conceptId, ...)`.
 *
 * Shares the wire endpoint `GET /concepts/{id}/relationships` with
 * `relationships.get(conceptId, ...)`. Kept as a separate method so users
 * who think in concept-centric terms have a discoverable entry point.
 *
 * Field list must stay aligned with `GetRelationshipsOptions` (in
 * `relationships/interfaces/`) since both methods hit the same endpoint —
 * a parity test in `relationships.test.ts` enforces equivalent wire URLs.
 */
export interface ConceptRelationshipsOptions extends PaginationOptions, VocabReleaseMixin {
  relationshipIds?: string[];
  vocabularyIds?: string[];
  domainIds?: string[];
  includeInvalid?: boolean;
  standardOnly?: boolean;
  includeReverse?: boolean;
}
