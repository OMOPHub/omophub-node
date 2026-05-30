import type { ConceptSummary } from '../../concepts/interfaces/concept.js';

export interface SemanticSearchResult extends ConceptSummary {
  similarity_score: number;
  matched_text?: string;
  domain_id?: string;
  concept_class_id?: string;
  standard_concept?: 'S' | 'C' | 'N' | null;
}

export interface SemanticSearchMetadata {
  query: string;
  threshold?: number;
  total_candidates?: number;
  processing_time_ms?: number;
}

export interface SemanticSearchResultSet {
  results: SemanticSearchResult[];
  search_metadata?: SemanticSearchMetadata;
}
