import type { OMOPHub } from '../client.js';
import type { GetOptions } from '../common/interfaces/get-options.js';
import type { PaginateOptions } from '../common/interfaces/paginate-options.js';
import type { PaginatedData } from '../common/interfaces/pagination.js';
import type { PostOptions } from '../common/interfaces/post-options.js';
import {
  derivePagination,
  ITER_DEFAULT_PAGE_SIZE,
  type PaginateAllResult,
  paginate,
  paginateAll,
} from '../common/utils/paginate.js';
import { syntheticError } from '../common/utils/synthetic-error.js';
import { toSnakeCaseKeys } from '../common/utils/to-snake-case.js';
import type { Response as OMOPHubResponse } from '../interfaces.js';
import type { GetMappingsOptions } from './interfaces/get-mappings-options.js';
import type { MapConceptsOptions } from './interfaces/map-concepts-options.js';
import type { MapConceptsResult, Mapping, MappingsListResult } from './interfaces/mapping.js';

/**
 * The server clamps `page_size` to this on the mappings endpoint and does not
 * say that it did. The iterators clamp before asking, so that a "full page"
 * means what the fallback in `derivePagination` assumes it means — asking for
 * 500 and getting 200 would otherwise read as a short page, i.e. the end.
 */
const MAX_PAGE_SIZE = 200;

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
      pageSize: Math.min(pageSize ?? ITER_DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE),
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
      pageSize: Math.min(pageSize ?? ITER_DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE),
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
        meta: {
          // 'single-page': a mappings response with no `meta.pagination` comes
          // from a deployment predating 2026-08-04, whose query was
          // `LIMIT 100` with no OFFSET. It ignores `page`, so inferring
          // "a full page means there is more" would re-fetch the same 100 rows
          // forever instead of terminating.
          pagination: derivePagination(r, page, size, r.data.mappings?.length ?? 0, 'single-page'),
        },
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
