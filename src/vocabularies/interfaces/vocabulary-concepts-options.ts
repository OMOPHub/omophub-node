import type { PaginationOptions } from '../../common/interfaces/pagination.js';

export interface VocabularyConceptsOptions extends PaginationOptions {
  /** Free-text search inside the vocabulary. */
  search?: string;
  /** `'S'` standard, `'C'` classification, `'all'` (default), or `'N'` non-standard. */
  standardConcept?: 'S' | 'C' | 'N' | 'all';
  includeInvalid?: boolean;
  includeRelationships?: boolean;
  includeSynonyms?: boolean;
  sortBy?: 'name' | 'concept_id' | 'concept_code';
  sortOrder?: 'asc' | 'desc';
}
