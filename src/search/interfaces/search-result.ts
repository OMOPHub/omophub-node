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

/**
 * One entry in `AutocompleteResult.suggestions`. The server nests the
 * concept under a `suggestion` field and may add scoring fields alongside.
 */
export interface AutocompleteEntry {
  suggestion: Concept;
  match_score?: number;
  match_type?: string;
}

/**
 * `GET /search/suggest` returns `{ query, suggestions: [...] }` — the
 * caller's original query is echoed back. Wrapped, not a bare array.
 */
export interface AutocompleteResult {
  query: string;
  suggestions: AutocompleteEntry[];
}
