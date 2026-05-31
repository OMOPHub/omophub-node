import type { PaginationOptions } from '../../common/interfaces/pagination.js';

export interface SemanticSearchOptions extends PaginationOptions {
  vocabularyIds?: string[];
  domainIds?: string[];
  standardConcept?: 'S' | 'C' | 'N';
  conceptClassId?: string;
  /** Similarity threshold (0–1). */
  threshold?: number;
}
