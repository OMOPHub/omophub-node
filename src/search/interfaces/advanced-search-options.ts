import type { PaginationOptions } from '../../common/interfaces/pagination.js';

export interface RelationshipFilter {
  relationship_id: string;
  target_concept_id?: number;
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
