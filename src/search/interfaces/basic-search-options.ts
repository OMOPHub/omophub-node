import type { PaginationOptions } from '../../common/interfaces/pagination.js';

export interface BasicSearchOptions extends PaginationOptions {
  vocabularyIds?: string[];
  domainIds?: string[];
  conceptClassIds?: string[];
  /** `'S'` standard, `'C'` classification, `'N'` non-standard. */
  standardConcept?: 'S' | 'C' | 'N';
  includeSynonyms?: boolean;
  includeInvalid?: boolean;
  /** Minimum relevance score (0–1). */
  minScore?: number;
  exactMatch?: boolean;
  sortBy?: 'relevance' | 'name' | 'concept_count' | 'last_updated';
  sortOrder?: 'asc' | 'desc';
}
