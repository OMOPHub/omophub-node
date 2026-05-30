import type { PaginationOptions } from '../../common/interfaces/pagination.js';

export interface DomainConceptsOptions extends PaginationOptions {
  vocabularyIds?: string[];
  /** When true, returns only `standard_concept = 'S'` rows. */
  standardOnly?: boolean;
  includeInvalid?: boolean;
}
