export interface BatchConceptsOptions {
  /** 1–100 concept IDs to look up in a single request. */
  conceptIds: number[];
  includeRelationships?: boolean;
  includeSynonyms?: boolean;
  includeMappings?: boolean;
  /** Restrict returned concepts to a list of vocabulary IDs. */
  vocabularyFilter?: string[];
  /** When true, returns only `standard_concept = 'S'` rows. Defaults true at the API. */
  standardOnly?: boolean;
}
