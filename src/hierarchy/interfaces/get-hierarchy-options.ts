export interface GetHierarchyOptions {
  /** `'flat'` (default) returns concepts + paths; `'graph'` returns nodes + edges. */
  format?: 'flat' | 'graph';
  vocabularyIds?: string[];
  domainIds?: string[];
  /** Max traversal depth. Capped at 20 by the server. Default 10. */
  maxLevels?: number;
  maxResults?: number;
  relationshipTypes?: string[];
  includeInvalid?: boolean;
}
