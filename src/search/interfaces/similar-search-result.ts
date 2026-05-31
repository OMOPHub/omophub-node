import type { ConceptSummary } from '../../concepts/interfaces/concept.js';

export interface SimilarConcept extends ConceptSummary {
  similarity_score: number;
  domain_id?: string;
  concept_class_id?: string;
  standard_concept?: 'S' | 'C' | 'N' | null;
  scores?: {
    semantic?: number;
    lexical?: number;
    hybrid?: number;
  };
  explanation?: string;
}

export interface SimilarSearchMetadata {
  original_query: string;
  algorithm_used: 'semantic' | 'lexical' | 'hybrid';
  similarity_threshold: number;
  total_candidates: number;
  results_returned: number;
  processing_time_ms: number;
  embedding_latency_ms?: number;
}

export interface SimilarSearchResult {
  similar_concepts: SimilarConcept[];
  search_metadata: SimilarSearchMetadata;
}
