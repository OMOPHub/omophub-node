import type { PaginationOptions } from '../../common/interfaces/pagination.js';

/**
 * camelCase input shape — `toSnakeCaseKeys` recurses into the array and
 * converts to `relationship_id` / `target_concept_id` at the wire.
 */
export interface RelationshipFilter {
  relationshipId: string;
  targetConceptId?: number;
  direction?: 'forward' | 'reverse';
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
