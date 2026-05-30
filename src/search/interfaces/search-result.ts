import type { Concept } from '../../concepts/interfaces/concept.js';

/**
 * A single facet bucket — e.g. "SNOMED: 1,243".
 */
export interface SearchFacet {
  value: string;
  count: number;
  label?: string;
}

export interface SearchFacets {
  vocabularies?: SearchFacet[];
  domains?: SearchFacet[];
  concept_classes?: SearchFacet[];
}

export interface SearchMetadata {
  query?: string;
  total_results?: number;
  processing_time_ms?: number;
  query_enhanced?: boolean;
  enhanced_query?: string;
}

/**
 * Canonical `search.basic` and `search.advanced` payload — normalised at
 * the resource boundary so `concepts` is always a `Concept[]`, even when
 * the legacy server form returned `{ data: [...] }` instead.
 */
export interface SearchResult {
  concepts: Concept[];
  facets?: SearchFacets;
  search_metadata?: SearchMetadata;
}
