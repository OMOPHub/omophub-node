import type { OMOPHub } from '../client.js';
import type { GetOptions } from '../common/interfaces/get-options.js';
import type { PaginateOptions } from '../common/interfaces/paginate-options.js';
import type { PaginatedData } from '../common/interfaces/pagination.js';
import type { PostOptions } from '../common/interfaces/post-options.js';
import { type PaginateAllResult, paginate, paginateAll } from '../common/utils/paginate.js';
import { syntheticError } from '../common/utils/synthetic-error.js';
import { toSnakeCaseKeys } from '../common/utils/to-snake-case.js';
import type { Response as OMOPHubResponse } from '../interfaces.js';
import type { GetMappingsOptions } from './interfaces/get-mappings-options.js';
import type { MapConceptsOptions } from './interfaces/map-concepts-options.js';
import type { MapConceptsResult, Mapping, MappingsListResult } from './interfaces/mapping.js';

/** Matches the search resource's iterator default. */
const ITER_DEFAULT_PAGE_SIZE = 100;

/**
 * Falls back to a derived page when the server omits `meta.pagination`
 * (older deployments predating mappings pagination), so the iterators
 * terminate rather than loop.
 */
function derivePagination(
  response: OMOPHubResponse<unknown>,
  page: number,
  pageSize: number,
  actualCount: number,
) {
  const fromMeta = response.meta?.pagination;
  if (fromMeta) return fromMeta;
  return {
    page,
    page_size: pageSize,
    total_items: actualCount,
    total_pages: actualCount < pageSize ? page : page + 1,
    has_next: actualCount >= pageSize,
    has_previous: page > 1,
  };
}

export class Mappings {
  constructor(private readonly client: OMOPHub) {}

  /**
   * List the mappings already defined for a single concept.
   *
   * **Paginated — one call is not necessarily the whole set.** `pageSize`
   * defaults to 100 server-side and is clamped to 200; a concept with more
   * mappings than that returns a subset that is indistinguishable from a
   * complete answer unless you read `meta.pagination.has_next`. When you are
   * assembling a code list, prefer {@link getIter} or {@link getAll}, which
   * walk every page for you.
   *
   * @see https://docs.omophub.com/api-reference/mappings/get
   */
  async get(
    conceptId: number,
    options: GetMappingsOptions & GetOptions = {},
  ): Promise<OMOPHubResponse<MappingsListResult>> {
    const { signal, headers, query, ...flags } = options;
    return this.client.get<MappingsListResult>(`/concepts/${conceptId}/mappings`, {
      signal,
      headers,
      query: { ...flags, ...query },
    });
  }

  /**
   * Async iterator over every mapping for a concept, across all pages.
   * Throws `OMOPHubIteratorError` if any page fails.
   */
  getIter(
    conceptId: number,
    options: GetMappingsOptions & GetOptions & PaginateOptions = {},
  ): AsyncGenerator<Mapping> {
    const { maxPages, pageSize, ...rest } = options;
    return paginate<Mapping>((page, size) => this.#fetchPage(conceptId, rest, page, size), {
      pageSize: pageSize ?? ITER_DEFAULT_PAGE_SIZE,
      maxPages,
    });
  }

  /**
   * Eagerly collects every mapping for a concept into a single array.
   * Errors are accumulated rather than thrown, so a partial result is
   * distinguishable from a complete one via the returned `errors`.
   */
  async getAll(
    conceptId: number,
    options: GetMappingsOptions & GetOptions & PaginateOptions = {},
  ): Promise<PaginateAllResult<Mapping>> {
    const { maxPages, pageSize, ...rest } = options;
    return paginateAll<Mapping>((page, size) => this.#fetchPage(conceptId, rest, page, size), {
      pageSize: pageSize ?? ITER_DEFAULT_PAGE_SIZE,
      maxPages,
    });
  }

  /**
   * Adapts `get` into the generic `PageFetcher` shape the pagination
   * helpers expect: `mappings` lifted out of the result object, and the
   * envelope's real `meta.pagination` passed through so `has_next` drives
   * the walk rather than a page-length guess.
   */
  async #fetchPage(
    conceptId: number,
    rest: Omit<GetMappingsOptions & GetOptions, 'page' | 'pageSize'>,
    page: number,
    size: number,
  ): Promise<OMOPHubResponse<PaginatedData<Mapping>>> {
    const r = await this.get(conceptId, { ...rest, page, pageSize: size });
    if (r.error) return { ...r, data: null } as never;
    return {
      ...r,
      data: {
        data: r.data.mappings ?? [],
        meta: { pagination: derivePagination(r, page, size, r.data.mappings?.length ?? 0) },
      },
    };
  }

  /**
   * Map a batch of source concepts (or vocabulary codes) to a target
   * vocabulary.
   *
   * Exactly one of `sourceConcepts` or `sourceCodes` must be supplied —
   * enforced by the `MapConceptsOptions` discriminated union and
   * re-validated at runtime so JS callers also get a structured error.
   *
   * `vocabRelease` is sent as a query-string parameter (NOT in the JSON
   * body) — matches the Python SDK convention.
   *
   * **Procedure mappings:** for Procedure-domain sources the API applies
   * a fallback vocabulary priority when `targetVocabulary` is left to
   * "best fit" semantics: SNOMED → LOINC → CPT4 → HCPCS → ICD10PCS →
   * ICD9Proc → OPCS4 → OMOP Extension.
   */
  async map(
    options: MapConceptsOptions & PostOptions,
  ): Promise<OMOPHubResponse<MapConceptsResult>> {
    const hasConcepts = Array.isArray(options.sourceConcepts) && options.sourceConcepts.length > 0;
    const hasCodes = Array.isArray(options.sourceCodes) && options.sourceCodes.length > 0;
    if (hasConcepts === hasCodes) {
      return syntheticError<MapConceptsResult>(
        'missing_required_field',
        'Provide exactly one of `sourceConcepts` or `sourceCodes` with at least one entry.',
      );
    }

    const { vocabRelease, signal, headers, query, idempotencyKey, ...bodyFields } = options;
    const body = toSnakeCaseKeys(bodyFields);
    return this.client.post<MapConceptsResult>('/concepts/map', body, {
      signal,
      headers,
      query: { vocabRelease, ...query },
      idempotencyKey,
    });
  }
}
