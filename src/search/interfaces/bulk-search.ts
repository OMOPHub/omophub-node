import type { Concept } from '../../concepts/interfaces/concept.js';
import type { SemanticSearchResult } from './semantic-search-result.js';

export interface BulkSearchDefaults {
  vocabulary_ids?: string[];
  domain_ids?: string[];
  page_size?: number;
}

export interface BulkBasicSearchInput {
  /** Caller-supplied ID echoed back on the matching result for correlation. */
  search_id: string;
  query: string;
  vocabulary_ids?: string[];
  domain_ids?: string[];
  page_size?: number;
}

export interface BulkSemanticSearchInput {
  search_id: string;
  query: string;
  threshold?: number;
  page_size?: number;
  vocabulary_ids?: string[];
  domain_ids?: string[];
}

export type BulkSearchStatus = 'completed' | 'failed';

export interface BulkBasicResultItem {
  search_id: string;
  query: string;
  status: BulkSearchStatus;
  results: Concept[];
  error?: string;
  duration?: number;
}

export interface BulkBasicSearchResponse {
  results: BulkBasicResultItem[];
  total_searches: number;
  completed_searches: number;
  failed_searches: number;
}

export interface BulkSemanticResultItem {
  search_id: string;
  query: string;
  status: BulkSearchStatus;
  results: SemanticSearchResult[];
  error?: string;
  duration?: number;
}

export interface BulkSemanticSearchResponse {
  results: BulkSemanticResultItem[];
  total_searches: number;
  /** Note the naming difference vs `BulkBasicSearchResponse.completed_searches`
   *  — the server uses `completed_count`/`failed_count` for the semantic
   *  endpoint. Surfaced as-is to match the wire. */
  completed_count: number;
  failed_count: number;
  total_duration?: number;
}
