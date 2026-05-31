export interface ResolveBatchOptions {
  resourceType?: string;
  includeRecommendations?: boolean;
  /** Max recommendations per coding (1–20). Default 5 at the API. */
  recommendationsLimit?: number;
  includeQuality?: boolean;
  onUnmapped?: 'error' | 'sentinel';
}
