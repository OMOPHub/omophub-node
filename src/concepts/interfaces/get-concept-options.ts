import type { VocabReleaseMixin } from '../../common/interfaces/vocab-release.js';

export interface GetConceptOptions extends VocabReleaseMixin {
  includeRelationships?: boolean;
  includeSynonyms?: boolean;
  includeHierarchy?: boolean;
}
