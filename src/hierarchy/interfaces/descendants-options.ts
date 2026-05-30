import type { PaginationOptions } from '../../common/interfaces/pagination.js';

export interface DescendantsOptions extends PaginationOptions {
  vocabularyIds?: string[];
  /** Max descent depth. Capped at 20 by the server. Default 10. */
  maxLevels?: number;
  relationshipTypes?: string[];
  includeDistance?: boolean;
  includePaths?: boolean;
  includeInvalid?: boolean;
  domainIds?: string[];
}
