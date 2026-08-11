import type { PaginationOptions } from '../../common/interfaces/pagination.js';
import type { VocabReleaseMixin } from '../../common/interfaces/vocab-release.js';

export interface GetMappingsOptions extends PaginationOptions, VocabReleaseMixin {
  /** Restrict mappings to a single target vocabulary (e.g. `'SNOMED'`). */
  targetVocabulary?: string;
  includeInvalid?: boolean;
}
