import type { PaginationOptions } from '../../common/interfaces/pagination.js';

export interface ListVocabulariesOptions extends PaginationOptions {
  includeStats?: boolean;
  includeInactive?: boolean;
  sortBy?: 'name' | 'concept_count' | 'last_updated';
  sortOrder?: 'asc' | 'desc';
}
