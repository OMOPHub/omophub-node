import type { OMOPHub } from '../client.js';
import type { GetOptions } from '../common/interfaces/get-options.js';
import type { PaginateOptions } from '../common/interfaces/paginate-options.js';
import type { PostOptions } from '../common/interfaces/post-options.js';
import {
  normaliseBasicSearchData,
  normaliseSemanticSearchData,
} from '../common/utils/normalize-search-response.js';
import {
  derivePagination,
  ITER_DEFAULT_PAGE_SIZE,
  type PaginateAllResult,
  paginate,
  paginateAll,
} from '../common/utils/paginate.js';
import { syntheticError } from '../common/utils/synthetic-error.js';
import { toSnakeCaseKeys } from '../common/utils/to-snake-case.js';
import type { Concept } from '../concepts/interfaces/concept.js';
import type { Response as OMOPHubResponse } from '../interfaces.js';
import type { AdvancedSearchOptions } from './interfaces/advanced-search-options.js';
import type { AutocompleteOptions } from './interfaces/autocomplete-options.js';
import type { BasicSearchOptions } from './interfaces/basic-search-options.js';
import type { BulkBasicOptions } from './interfaces/bulk-basic-options.js';
import type {
  BulkBasicSearchInput,
  BulkBasicSearchResponse,
  BulkSemanticSearchInput,
  BulkSemanticSearchResponse,
} from './interfaces/bulk-search.js';
import type { BulkSemanticOptions } from './interfaces/bulk-semantic-options.js';
import type { AutocompleteResult, SearchResult } from './interfaces/search-result.js';
import type { SemanticSearchOptions } from './interfaces/semantic-search-options.js';
import type {
  SemanticSearchResult,
  SemanticSearchResultSet,
} from './interfaces/semantic-search-result.js';
import type { SimilarSearchOptions } from './interfaces/similar-search-options.js';
import type { SimilarSearchResult } from './interfaces/similar-search-result.js';

/**
 * `/v1/search/semantic` validates `page_size` at `max: 100` — stricter than the
 * router-wide clamp of 200, and it *rejects* rather than clamping. Asking for
 * more used to 400 every page, so `semanticIter` / `semanticAll` returned
 * nothing at all instead of walking with a smaller page.
 */
const SEMANTIC_MAX_PAGE_SIZE = 100;

export class Search {
  constructor(private readonly client: OMOPHub) {}

  // ─── Basic keyword search ──────────────────────────────────────────

  /**
   * Keyword search across concepts.
   *
   * Normalises the response so `data.concepts` is always a `Concept[]`,
   * regardless of whether the server returned `{ concepts: [...] }`,
   * `{ data: [...] }`, or a bare array.
   */
  async basic(
    query: string,
    options: BasicSearchOptions & GetOptions = {},
  ): Promise<OMOPHubResponse<SearchResult>> {
    const { signal, headers, query: extraQuery, ...flags } = options;
    const response = await this.client.get<unknown>('/search/concepts', {
      signal,
      headers,
      // positional `query` spread LAST so user-supplied options.query can't
      // silently override the primary search term.
      query: { ...flags, ...extraQuery, query },
    });
    if (response.error) {
      return { data: null, error: response.error, meta: null, headers: response.headers };
    }
    return {
      data: normaliseBasicSearchData(response.data),
      error: null,
      meta: response.meta,
      headers: response.headers,
    };
  }

  /**
   * Async iterator that walks the basic-search pages, yielding one
   * concept at a time. Throws `OMOPHubIteratorError` if any page fails.
   */
  basicIter(
    query: string,
    options: BasicSearchOptions & GetOptions & PaginateOptions = {},
  ): AsyncGenerator<Concept> {
    const { maxPages, pageSize, ...rest } = options;
    return paginate<Concept>(
      async (page, size) => {
        const r = await this.basic(query, { ...rest, page, pageSize: size });
        if (r.error) return { ...r, data: null } as never;
        return {
          ...r,
          data: {
            data: r.data.concepts,
            meta: {
              // 'more-if-page-full': this endpoint has returned real pagination
              // (createPaginatedResponse over LIMIT/OFFSET) since the initial
              // commit, and honours `page` — verified against production
              // 2026-08-11, where page 2 returns different concept_ids. So the
              // fallback is unreachable in practice, and if some older
              // deployment did omit the meta block it would still page.
              pagination: derivePagination(
                r,
                page,
                size,
                r.data.concepts.length,
                'more-if-page-full',
              ),
            },
          },
        };
      },
      { pageSize: pageSize ?? ITER_DEFAULT_PAGE_SIZE, maxPages },
    );
  }

  /**
   * Eagerly collects every basic-search page into a single array of
   * concepts. Errors are accumulated rather than thrown.
   */
  async basicAll(
    query: string,
    options: BasicSearchOptions & GetOptions & PaginateOptions = {},
  ): Promise<PaginateAllResult<Concept>> {
    const { maxPages, pageSize, ...rest } = options;
    return paginateAll<Concept>(
      async (page, size) => {
        const r = await this.basic(query, { ...rest, page, pageSize: size });
        if (r.error) return { ...r, data: null } as never;
        return {
          ...r,
          data: {
            data: r.data.concepts,
            meta: {
              // 'more-if-page-full': this endpoint has returned real pagination
              // (createPaginatedResponse over LIMIT/OFFSET) since the initial
              // commit, and honours `page` — verified against production
              // 2026-08-11, where page 2 returns different concept_ids. So the
              // fallback is unreachable in practice, and if some older
              // deployment did omit the meta block it would still page.
              pagination: derivePagination(
                r,
                page,
                size,
                r.data.concepts.length,
                'more-if-page-full',
              ),
            },
          },
        };
      },
      { pageSize: pageSize ?? ITER_DEFAULT_PAGE_SIZE, maxPages },
    );
  }

  // ─── Advanced (POST) search ────────────────────────────────────────

  /**
   * Advanced search with relationship filters. POST body so complex
   * filter graphs can be expressed without URL-length pressure.
   */
  async advanced(
    query: string,
    options: AdvancedSearchOptions & PostOptions = {},
  ): Promise<OMOPHubResponse<SearchResult>> {
    const { signal, headers, query: extraQuery, idempotencyKey, ...flags } = options;
    const body = toSnakeCaseKeys({ query, ...flags });
    const response = await this.client.post<unknown>('/search/advanced', body, {
      signal,
      headers,
      query: extraQuery,
      idempotencyKey,
    });
    if (response.error) {
      return { data: null, error: response.error, meta: null, headers: response.headers };
    }
    return {
      data: normaliseBasicSearchData(response.data),
      error: null,
      meta: response.meta,
      headers: response.headers,
    };
  }

  // ─── Autocomplete ──────────────────────────────────────────────────

  /**
   * Lightweight typeahead suggestions. The server returns compact suggestion
   * records with the matched value, match type, and occurrence count.
   */
  async autocomplete(
    query: string,
    options: AutocompleteOptions & GetOptions = {},
  ): Promise<OMOPHubResponse<AutocompleteResult>> {
    const {
      signal,
      headers,
      query: extraQuery,
      domains,
      domainIds,
      vocabularyIds,
      pageSize,
    } = options;
    return this.client.get<AutocompleteResult>('/search/autocomplete', {
      signal,
      headers,
      query: {
        ...(vocabularyIds ? { vocabularyIds } : {}),
        ...(domainIds || domains ? { domainIds: domainIds ?? domains } : {}),
        ...(pageSize !== undefined ? { pageSize } : {}),
        ...extraQuery,
        query,
      },
    });
  }

  // ─── Semantic search ───────────────────────────────────────────────

  /**
   * Semantic (embedding-based) search.
   *
   * Normalises the response so `data.results` is always a populated array,
   * regardless of whether the server returned `{ results: [...] }`,
   * `{ data: [...] }`, or a bare array — same defensive shape-handling
   * the iter / all variants apply.
   */
  async semantic(
    query: string,
    options: SemanticSearchOptions & GetOptions = {},
  ): Promise<OMOPHubResponse<SemanticSearchResultSet>> {
    const { signal, headers, query: extraQuery, ...flags } = options;
    const response = await this.client.get<unknown>('/search/semantic', {
      signal,
      headers,
      query: { ...flags, ...extraQuery, query },
    });
    if (response.error) {
      return { data: null, error: response.error, meta: null, headers: response.headers };
    }
    const results = normaliseSemanticSearchData(response.data);
    const raw =
      response.data && typeof response.data === 'object' && !Array.isArray(response.data)
        ? (response.data as Record<string, unknown>)
        : {};
    const normalised: SemanticSearchResultSet = { results };
    if (raw.search_metadata && typeof raw.search_metadata === 'object') {
      normalised.search_metadata =
        raw.search_metadata as SemanticSearchResultSet['search_metadata'];
    }
    return {
      data: normalised,
      error: null,
      meta: response.meta,
      headers: response.headers,
    };
  }

  /**
   * Async iterator over semantic-search results.
   */
  semanticIter(
    query: string,
    options: SemanticSearchOptions & GetOptions & PaginateOptions = {},
  ): AsyncGenerator<SemanticSearchResult> {
    const { maxPages, pageSize, ...rest } = options;
    return paginate<SemanticSearchResult>(
      async (page, size) => {
        const r = await this.semantic(query, { ...rest, page, pageSize: size });
        if (r.error) return { ...r, data: null } as never;
        const results = normaliseSemanticSearchData(r.data);
        return {
          ...r,
          data: {
            data: results,
            meta: {
              // 'more-if-page-full': /v1/search/semantic passes `page` through
              // to the search service and returns `meta.pagination` on every
              // response — verified against production 2026-08-11, where page 2
              // returns different concept_ids. Unlike the pre-2026-08-04
              // mappings endpoint, it has never had a page-ignoring form.
              pagination: derivePagination(r, page, size, results.length, 'more-if-page-full'),
            },
          },
        };
      },
      { pageSize: Math.min(pageSize ?? ITER_DEFAULT_PAGE_SIZE, SEMANTIC_MAX_PAGE_SIZE), maxPages },
    );
  }

  /**
   * Eagerly collect every semantic-search page.
   */
  async semanticAll(
    query: string,
    options: SemanticSearchOptions & GetOptions & PaginateOptions = {},
  ): Promise<PaginateAllResult<SemanticSearchResult>> {
    const { maxPages, pageSize, ...rest } = options;
    return paginateAll<SemanticSearchResult>(
      async (page, size) => {
        const r = await this.semantic(query, { ...rest, page, pageSize: size });
        if (r.error) return { ...r, data: null } as never;
        const results = normaliseSemanticSearchData(r.data);
        return {
          ...r,
          data: {
            data: results,
            meta: {
              // 'more-if-page-full': /v1/search/semantic passes `page` through
              // to the search service and returns `meta.pagination` on every
              // response — verified against production 2026-08-11, where page 2
              // returns different concept_ids. Unlike the pre-2026-08-04
              // mappings endpoint, it has never had a page-ignoring form.
              pagination: derivePagination(r, page, size, results.length, 'more-if-page-full'),
            },
          },
        };
      },
      { pageSize: Math.min(pageSize ?? ITER_DEFAULT_PAGE_SIZE, SEMANTIC_MAX_PAGE_SIZE), maxPages },
    );
  }

  // ─── Bulk endpoints ────────────────────────────────────────────────

  /**
   * Run up to 50 basic searches in a single request. Returns a result
   * per search keyed by the caller-supplied `search_id`.
   */
  async bulkBasic(
    searches: BulkBasicSearchInput[],
    options: BulkBasicOptions & PostOptions = {},
  ): Promise<OMOPHubResponse<BulkBasicSearchResponse>> {
    if (!Array.isArray(searches) || searches.length < 1 || searches.length > 50) {
      return syntheticError<BulkBasicSearchResponse>(
        'validation_error',
        '`searches` must be an array of 1–50 items.',
      );
    }
    const { signal, headers, query, idempotencyKey, defaults } = options;
    const body = toSnakeCaseKeys({ searches, defaults });
    return this.client.post<BulkBasicSearchResponse>('/search/bulk', body, {
      signal,
      headers,
      query,
      idempotencyKey,
    });
  }

  /**
   * Run up to 25 semantic searches in a single request.
   */
  async bulkSemantic(
    searches: BulkSemanticSearchInput[],
    options: BulkSemanticOptions & PostOptions = {},
  ): Promise<OMOPHubResponse<BulkSemanticSearchResponse>> {
    if (!Array.isArray(searches) || searches.length < 1 || searches.length > 25) {
      return syntheticError<BulkSemanticSearchResponse>(
        'validation_error',
        '`searches` must be an array of 1–25 items.',
      );
    }
    const { signal, headers, query, idempotencyKey, defaults } = options;
    const body = toSnakeCaseKeys({ searches, defaults });
    return this.client.post<BulkSemanticSearchResponse>('/search/semantic-bulk', body, {
      signal,
      headers,
      query,
      idempotencyKey,
    });
  }

  // ─── Similarity search ─────────────────────────────────────────────

  /**
   * Similarity search by `conceptId`, `conceptName`, or `query`. Exactly
   * one of the three must be supplied — TS enforces via the discriminated
   * `SimilarSearchOptions` type; this method also defends at runtime so
   * JS callers get a structured error rather than a wire 400.
   *
   * Uses a two-arg signature because `query` is one of the XOR fields
   * and would otherwise collide with `PerCallOptions.query`.
   */
  async similar(
    options: SimilarSearchOptions,
    requestOptions: PostOptions = {},
  ): Promise<OMOPHubResponse<SimilarSearchResult>> {
    // Tight checks rather than `!== undefined`: a JS caller passing
    // `null`, `''`, or `NaN` for one of the XOR fields should be treated
    // as "not provided" and rejected synthetically, not forwarded to the
    // API as a malformed POST.
    const hasConceptId =
      typeof options.conceptId === 'number' && Number.isFinite(options.conceptId);
    const hasConceptName =
      typeof options.conceptName === 'string' && options.conceptName.length > 0;
    const hasQuery = typeof options.query === 'string' && options.query.length > 0;
    const provided = [hasConceptId, hasConceptName, hasQuery].filter(Boolean).length;
    if (provided !== 1) {
      return syntheticError<SimilarSearchResult>(
        'missing_required_field',
        'Provide exactly one of `conceptId`, `conceptName`, or `query` (non-empty).',
      );
    }
    const body = toSnakeCaseKeys(options);
    return this.client.post<SimilarSearchResult>('/search/similar', body, requestOptions);
  }
}
