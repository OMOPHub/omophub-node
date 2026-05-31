export interface ResolveCodeableConceptOptions {
  /** Optional human-readable description of the CodeableConcept. */
  text?: string;
  resourceType?: string;
  includeRecommendations?: boolean;
  recommendationsLimit?: number;
  includeQuality?: boolean;
  onUnmapped?: 'error' | 'sentinel';
}
