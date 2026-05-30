import type { PaginationOptions } from '../../common/interfaces/pagination.js';

export interface AncestorsOptions extends PaginationOptions {
  vocabularyIds?: string[];
  /** Max distance from the source concept. Server-side cap applies. */
  maxLevels?: number;
  relationshipTypes?: string[];
  includePaths?: boolean;
  includeDistance?: boolean;
  includeInvalid?: boolean;
}
