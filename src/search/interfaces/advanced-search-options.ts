import type { PaginationOptions } from '../../common/interfaces/pagination.js';

/**
 * camelCase input shape — `toSnakeCaseKeys` recurses into the array and
 * converts to `relationship_id` / `target_concept_id` / `target_vocabularies`
 * at the wire. Filters are ANDed, so every filter is required.
 */
export interface RelationshipFilter {
  relationshipId: string;
  targetConceptId?: number;
  /** The concept at the other end must belong to one of these vocabularies. */
  targetVocabularies?: string[];
  /** Defaults to `'forward'` server-side; `'both'` accepts either orientation. */
  direction?: 'forward' | 'reverse' | 'both';
}

export interface AdvancedSearchOptions extends PaginationOptions {
  vocabularyIds?: string[];
  domainIds?: string[];
  conceptClassIds?: string[];
  standardConceptsOnly?: boolean;
  includeInvalid?: boolean;
  /** Restrict matches to concepts with these specific relationships. */
  relationshipFilters?: RelationshipFilter[];
}
