import type { VocabReleaseMixin } from '../../common/interfaces/vocab-release.js';

export interface GetConceptByCodeOptions extends VocabReleaseMixin {
  includeRelationships?: boolean;
  includeSynonyms?: boolean;
  includeHierarchy?: boolean;
}
