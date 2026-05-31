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

/**
 * `POST /search/bulk` returns a **bare array** of per-search result
 * items, NOT a summary wrapper. Use `data.length` for the count and
 * `data.filter(r => r.status === 'completed').length` for completed.
 */
export type BulkBasicSearchResponse = BulkBasicResultItem[];

export interface BulkSemanticResultItem {
  search_id: string;
  query: string;
  status: BulkSearchStatus;
  results: SemanticSearchResult[];
  error?: string;
  duration?: number;
}

/**
 * `POST /search/semantic-bulk` returns a wrapper object — unlike
 * `bulkBasic` which is a bare array. The semantic endpoint adds aggregate
 * counts and a total duration to the response.
 */
export interface BulkSemanticSearchResponse {
  results: BulkSemanticResultItem[];
  total_searches: number;
  completed_count: number;
  failed_count: number;
  total_duration?: number;
}
