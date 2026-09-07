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

/** One concept-name suggestion returned by `GET /search/suggest`. */
export interface AutocompleteEntry {
  suggestion: string;
  concept_id: Concept['concept_id'];
  concept_code: Concept['concept_code'];
  vocabulary_id: Concept['vocabulary_id'];
  domain_id: Concept['domain_id'];
  concept_class_id: Concept['concept_class_id'];
  standard_concept: Concept['standard_concept'];
  context?: {
    vocabulary_id: string;
    domain_id: string;
    concept_class_id: string;
  };
}

/**
 * `GET /search/suggest` returns `{ query, suggestions: [...] }` — the
 * caller's original query is echoed back. Wrapped, not a bare array.
 */
export interface AutocompleteResult {
  query: string;
  suggestions: AutocompleteEntry[];
}
