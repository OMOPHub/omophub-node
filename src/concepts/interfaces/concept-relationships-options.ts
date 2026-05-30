import type { VocabReleaseMixin } from '../../common/interfaces/vocab-release.js';

/**
 * Options for `concepts.relationships(conceptId, ...)`.
 *
 * Note: shares the wire endpoint `GET /concepts/{id}/relationships` with
 * `relationships.get(conceptId, ...)`. Kept as a separate method so users
 * who think in concept-centric terms have a discoverable entry point.
 */
export interface ConceptRelationshipsOptions extends VocabReleaseMixin {
  relationshipIds?: string[];
  vocabularyIds?: string[];
  domainIds?: string[];
  includeInvalid?: boolean;
  standardOnly?: boolean;
  includeReverse?: boolean;
}
