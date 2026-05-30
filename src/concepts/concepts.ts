import type { OMOPHub } from '../client.js';
import type { GetOptions } from '../common/interfaces/get-options.js';
import type { PaginatedData } from '../common/interfaces/pagination.js';
import type { PostOptions } from '../common/interfaces/post-options.js';
import { syntheticError } from '../common/utils/synthetic-error.js';
import { toSnakeCaseKeys } from '../common/utils/to-snake-case.js';
import type { Response as OMOPHubResponse } from '../interfaces.js';
import type { BatchConceptsOptions } from './interfaces/batch-concepts-options.js';
import type {
  BatchConceptResult,
  Concept,
  ConceptRelationshipsResult,
  ConceptSuggestion,
  RecommendedConceptsResult,
  RelatedConceptsResult,
} from './interfaces/concept.js';
import type { ConceptRelationshipsOptions } from './interfaces/concept-relationships-options.js';
import type { GetConceptByCodeOptions } from './interfaces/get-concept-by-code-options.js';
import type { GetConceptOptions } from './interfaces/get-concept-options.js';
import type { RecommendedConceptsOptions } from './interfaces/recommended-concepts-options.js';
import type { RelatedConceptsOptions } from './interfaces/related-concepts-options.js';
import type { SuggestConceptsOptions } from './interfaces/suggest-concepts-options.js';

export class Concepts {
  constructor(private readonly client: OMOPHub) {}

  /**
   * Fetch a single concept by its OMOP `concept_id`.
   *
   * Accepts `conceptId === 0` (the OMOP "unmapped" sentinel) — the SDK
   * does not pre-validate. The server is the source of truth on what's
   * a valid ID.
   *
   * @see https://docs.omophub.com/api-reference/concepts/get
   */
  async get(
    conceptId: number,
    options: GetConceptOptions & GetOptions = {},
  ): Promise<OMOPHubResponse<Concept>> {
    const { signal, headers, query, ...flags } = options;
    return this.client.get<Concept>(`/concepts/${conceptId}`, {
      signal,
      headers,
      query: { ...flags, ...query },
    });
  }

  /**
   * Fetch a concept by its native vocabulary code (e.g. SNOMED `44054006`).
   *
   * @see https://docs.omophub.com/api-reference/concepts/get-by-code
   */
  async getByCode(
    vocabularyId: string,
    conceptCode: string,
    options: GetConceptByCodeOptions & GetOptions = {},
  ): Promise<OMOPHubResponse<Concept>> {
    const { signal, headers, query, ...flags } = options;
    return this.client.get<Concept>(
      `/concepts/by-code/${encodeURIComponent(vocabularyId)}/${encodeURIComponent(conceptCode)}`,
      { signal, headers, query: { ...flags, ...query } },
    );
  }

  /**
   * Fetch up to 100 concepts in a single request.
   *
   * Returns a `validation_error` synthetically (no network call) if
   * `conceptIds` is missing, not an array, or outside `[1, 100]`.
   * The `Array.isArray` check defends against JS callers / `// @ts-expect-error`
   * users — TS strict mode catches it at compile time.
   */
  async batch(
    options: BatchConceptsOptions & PostOptions,
  ): Promise<OMOPHubResponse<BatchConceptResult>> {
    const { conceptIds, signal, headers, query, idempotencyKey, ...rest } = options;
    if (!Array.isArray(conceptIds) || conceptIds.length < 1 || conceptIds.length > 100) {
      return syntheticError<BatchConceptResult>(
        'validation_error',
        '`conceptIds` must be an array of 1–100 items.',
      );
    }
    const body = toSnakeCaseKeys({ conceptIds, ...rest });
    return this.client.post<BatchConceptResult>('/concepts/batch', body, {
      signal,
      headers,
      query,
      idempotencyKey,
    });
  }

  /**
   * Auto-complete suggestions for a free-text query.
   *
   * `query` is positional so it doesn't collide with `PerCallOptions.query`.
   */
  async suggest(
    query: string,
    options: SuggestConceptsOptions & GetOptions = {},
  ): Promise<OMOPHubResponse<ConceptSuggestion[] | PaginatedData<ConceptSuggestion>>> {
    const { signal, headers, query: extraQuery, ...flags } = options;
    return this.client.get<ConceptSuggestion[] | PaginatedData<ConceptSuggestion>>(
      '/concepts/suggest',
      { signal, headers, query: { query, ...flags, ...extraQuery } },
    );
  }

  /**
   * Phoebe-style related concepts ranked by relatedness score.
   */
  async related(
    conceptId: number,
    options: RelatedConceptsOptions & GetOptions = {},
  ): Promise<OMOPHubResponse<RelatedConceptsResult>> {
    const { signal, headers, query, ...flags } = options;
    return this.client.get<RelatedConceptsResult>(`/concepts/${conceptId}/related`, {
      signal,
      headers,
      query: { ...flags, ...query },
    });
  }

  /**
   * Concept-centric view of `GET /concepts/{id}/relationships`. Shares the
   * underlying endpoint with `client.relationships.get(conceptId)` — keep
   * the two in sync as new query params are added.
   */
  async relationships(
    conceptId: number,
    options: ConceptRelationshipsOptions & GetOptions = {},
  ): Promise<OMOPHubResponse<ConceptRelationshipsResult>> {
    const { signal, headers, query, ...flags } = options;
    return this.client.get<ConceptRelationshipsResult>(`/concepts/${conceptId}/relationships`, {
      signal,
      headers,
      query: { ...flags, ...query },
    });
  }

  /**
   * OHDSI Phoebe-style recommendations for one or more source concepts.
   *
   * Validates client-side: `conceptIds` 1–100, `relationshipTypes` ≤ 20,
   * `vocabularyIds`/`domainIds` ≤ 50 — returns `validation_error`
   * synthetically when any cap is exceeded.
   */
  async recommended(
    options: RecommendedConceptsOptions & PostOptions,
  ): Promise<OMOPHubResponse<RecommendedConceptsResult>> {
    const {
      conceptIds,
      relationshipTypes,
      vocabularyIds,
      domainIds,
      standardOnly,
      includeInvalid,
      page,
      pageSize,
      signal,
      headers,
      query,
      idempotencyKey,
    } = options;

    if (!Array.isArray(conceptIds) || conceptIds.length < 1 || conceptIds.length > 100) {
      return syntheticError<RecommendedConceptsResult>(
        'validation_error',
        '`conceptIds` must be an array of 1–100 items.',
      );
    }
    if (relationshipTypes && relationshipTypes.length > 20) {
      return syntheticError<RecommendedConceptsResult>(
        'validation_error',
        '`relationshipTypes` must contain at most 20 entries.',
      );
    }
    if (vocabularyIds && vocabularyIds.length > 50) {
      return syntheticError<RecommendedConceptsResult>(
        'validation_error',
        '`vocabularyIds` must contain at most 50 entries.',
      );
    }
    if (domainIds && domainIds.length > 50) {
      return syntheticError<RecommendedConceptsResult>(
        'validation_error',
        '`domainIds` must contain at most 50 entries.',
      );
    }

    const body = toSnakeCaseKeys({
      conceptIds,
      relationshipTypes,
      vocabularyIds,
      domainIds,
      standardOnly,
      includeInvalid,
    });
    return this.client.post<RecommendedConceptsResult>('/concepts/recommended', body, {
      signal,
      headers,
      query: { page, page_size: pageSize, ...query },
      idempotencyKey,
    });
  }
}
