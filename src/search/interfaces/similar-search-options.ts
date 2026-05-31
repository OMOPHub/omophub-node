interface SimilarSearchBase {
  /** `'semantic'`, `'lexical'`, or `'hybrid'` (default). */
  algorithm?: 'semantic' | 'lexical' | 'hybrid';
  /** Similarity floor (0–1). Default 0.7 at the API. */
  similarityThreshold?: number;
  pageSize?: number;
  vocabularyIds?: string[];
  domainIds?: string[];
  standardConcept?: 'S' | 'C' | 'N';
  includeInvalid?: boolean;
  includeScores?: boolean;
  includeExplanations?: boolean;
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
