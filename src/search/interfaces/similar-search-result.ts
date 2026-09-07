import type { ConceptSummary } from '../../concepts/interfaces/concept.js';

export interface SimilarConcept extends ConceptSummary {
  /**
   * Absent when the request set `includeScores: false`, which the API honours
   * by omitting the key rather than zeroing it.
   */
  similarity_score?: number;
  domain_id?: string;
  concept_class_id?: string;
  standard_concept?: 'S' | 'C' | 'N' | null;
  scores?: {
    semantic?: number;
    lexical?: number;
    hybrid?: number;
  };
  /** Present when the request set `includeExplanations: true`. */
  explanation?: string;
  /**
   * @deprecated Duplicate of `explanation`, emitted by the API for one release
   * so clients that read the old name keep working. Read `explanation`.
   */
  similarity_explanation?: string;
}

export interface SimilarSearchMetadata {
  original_query: string;
  algorithm_used: 'semantic' | 'lexical' | 'hybrid';
  similarity_threshold: number;
  /**
   * How many concepts cleared `similarity_threshold` inside the bounded
   * retrieval pool — not how many were evaluated. The pool holds up to 500 and
   * everything below the threshold is discarded before this is counted.
   */
  total_candidates: number;
  results_returned: number;
  processing_time_ms: number;
  embedding_latency_ms?: number;
  /**
   * True when retrieval hit its candidate bound, so `total_candidates` and the
   * pagination totals count only what qualified inside the pool that was
   * searched, rather than across the whole corpus. Treat them as "at least this
   * many".
   */
  totals_are_lower_bound?: boolean;
  /**
   * The algorithm that was asked for, when a fallback served the request
   * instead — `hybrid` degrades to `lexical` if the embedding service is
   * unavailable. Present only when it differs from `algorithm_used`.
   */
  degraded_from?: 'semantic' | 'lexical' | 'hybrid';
  /** The concept the search started from, when `conceptId` was supplied. */
  source_concept_id?: number;
}

/** The reference concept a similarity search started from. */
export interface SimilarSourceConcept {
  concept_id: number;
  concept_name: string;
  concept_code?: string;
  vocabulary_id?: string;
  domain_id?: string;
  concept_class_id?: string;
  standard_concept?: 'S' | 'C' | 'N' | null;
}

export interface SimilarSearchResult {
  similar_concepts: SimilarConcept[];
  search_metadata: SimilarSearchMetadata;
  /** Returned when the search started from a `conceptId`. */
  source_concept?: SimilarSourceConcept;
}
