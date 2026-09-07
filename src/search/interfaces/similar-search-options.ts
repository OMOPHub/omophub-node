interface SimilarSearchBase {
  /** `'semantic'` (the API's default), `'lexical'`, or `'hybrid'`. */
  algorithm?: 'semantic' | 'lexical' | 'hybrid';
  /**
   * Similarity floor (0–1). Default 0.7 at the API. `0` is a valid value and
   * is honoured — it returns every candidate the retrieval produced.
   */
  similarityThreshold?: number;
  /**
   * Page of the ranked candidate pool, 1-based.
   *
   * Every algorithm ranks a bounded pool, so reachable depth is bounded too;
   * page while `meta.pagination.has_next` is true rather than comparing `page`
   * to `total_pages`, and check `search_metadata.totals_are_lower_bound`
   * before treating a total as exact.
   */
  page?: number;
  pageSize?: number;
  vocabularyIds?: string[];
  domainIds?: string[];
  conceptClassIds?: string[];
  /** `'N'` selects non-standard concepts, which OMOP stores as a null column. */
  standardConcept?: 'S' | 'C' | 'N';
  /**
   * Include invalid/deprecated concepts. Defaults to `false`, and is supported
   * only with `algorithm: 'lexical'` — the embedding index holds valid
   * concepts only, so the API answers 400 for the other two rather than
   * ignoring the filter.
   */
  includeInvalid?: boolean;
  /** Include `similarity_score` on each concept. Default true. */
  includeScores?: boolean;
  /** Include an `explanation` on each concept. Default false. */
  includeExplanations?: boolean;
  /** Exclude the reference concept from its own results. Default true. */
  excludeSelf?: boolean;
}

/**
 * Exactly one of `conceptId`, `conceptName`, or `query` must be supplied.
 *
 * Encoded as a discriminated union so TypeScript enforces the XOR at the
 * call site. A runtime check in `search.similar()` defends against JS
 * callers / `as any` users.
 *
 * Note: `query` here is the free-text search variant. Because of this it
 * conflicts with `PerCallOptions.query` (the escape-hatch params record),
 * which is why `search.similar()` uses a two-arg signature
 * `similar(options, requestOptions)` rather than merged options.
 */
export type SimilarSearchOptions =
  | (SimilarSearchBase & { conceptId: number; conceptName?: never; query?: never })
  | (SimilarSearchBase & { conceptId?: never; conceptName: string; query?: never })
  | (SimilarSearchBase & { conceptId?: never; conceptName?: never; query: string });
