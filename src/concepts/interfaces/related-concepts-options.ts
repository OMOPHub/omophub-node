import type { VocabReleaseMixin } from '../../common/interfaces/vocab-release.js';

export interface RelatedConceptsOptions extends VocabReleaseMixin {
  relationshipTypes?: string[];
  /** Filter results by minimum relatedness score (0–1). */
  minScore?: number;
  /** Default 20 at the API; max 100. */
  pageSize?: number;
}
