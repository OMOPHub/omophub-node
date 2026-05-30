import type { PaginationOptions } from '../../common/interfaces/pagination.js';
import type { VocabReleaseMixin } from '../../common/interfaces/vocab-release.js';

/**
 * Note: the free-text `query` is the first positional argument to
 * `concepts.suggest()` — it would otherwise collide with
 * `PerCallOptions.query` (the escape-hatch query-param record).
 */
export interface SuggestConceptsOptions extends PaginationOptions, VocabReleaseMixin {
  vocabularyIds?: string[];
  domainIds?: string[];
}
