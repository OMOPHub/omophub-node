/**
 * Shared option fields accepted by every FHIR resolver method
 * (`resolve`, `resolveBatch`, `resolveCodeableConcept`). Extracted so a
 * new field added today reaches all three methods without manual
 * replication.
 */
export interface ResolveCommonOptions {
  /** FHIR resource type for context-aware mapping (e.g. `'Condition'`, `'Observation'`). */
  resourceType?: string;
  /** Include Phoebe-style recommendations alongside the resolution. */
  includeRecommendations?: boolean;
  /** Max recommendations (1–20). Default 5 at the API. */
  recommendationsLimit?: number;
  /** Surface the server's quality bucket on the resolution. */
  includeQuality?: boolean;
  /**
   * `'error'` (default) returns a 404 for unmapped codings; `'sentinel'`
   * returns a `concept_id: 0` row so batch flows can keep going.
   */
  onUnmapped?: 'error' | 'sentinel';
}
