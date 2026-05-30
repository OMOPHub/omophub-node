import type { OMOPHub } from '../client.js';
import type { GetOptions } from '../common/interfaces/get-options.js';
import type { PaginatedData } from '../common/interfaces/pagination.js';
import type { ConceptSummary } from '../concepts/interfaces/concept.js';
import type { Response as OMOPHubResponse } from '../interfaces.js';
import type { ListVocabulariesOptions } from './interfaces/list-vocabularies-options.js';
import type {
  ConceptClass,
  Vocabulary,
  VocabularyDomain,
  VocabularyStats,
} from './interfaces/vocabulary.js';
import type { VocabularyConceptsOptions } from './interfaces/vocabulary-concepts-options.js';

export class Vocabularies {
  constructor(private readonly client: OMOPHub) {}

  /**
   * List vocabularies.
   *
   * @see https://docs.omophub.com/api-reference/vocabularies/list
   */
  async list(
    options: ListVocabulariesOptions & GetOptions = {},
  ): Promise<OMOPHubResponse<Vocabulary[] | PaginatedData<Vocabulary>>> {
    const { signal, headers, query, ...flags } = options;
    return this.client.get<Vocabulary[] | PaginatedData<Vocabulary>>('/vocabularies', {
      signal,
      headers,
      query: { ...flags, ...query },
    });
  }

  /**
   * Fetch a single vocabulary's metadata by its ID (e.g. `SNOMED`, `RxNorm`).
   */
  async get(vocabularyId: string, options: GetOptions = {}): Promise<OMOPHubResponse<Vocabulary>> {
    return this.client.get<Vocabulary>(
      `/vocabularies/${encodeURIComponent(vocabularyId)}`,
      options,
    );
  }

  /**
   * Concept counts and breakdowns for a single vocabulary.
   */
  async stats(
    vocabularyId: string,
    options: GetOptions = {},
  ): Promise<OMOPHubResponse<VocabularyStats>> {
    return this.client.get<VocabularyStats>(
      `/vocabularies/${encodeURIComponent(vocabularyId)}/stats`,
      options,
    );
  }

  /**
   * Per-domain breakdown for one vocabulary/domain pair.
   */
  async domainStats(
    vocabularyId: string,
    domainId: string,
    options: GetOptions = {},
  ): Promise<OMOPHubResponse<Record<string, unknown>>> {
    return this.client.get<Record<string, unknown>>(
      `/vocabularies/${encodeURIComponent(vocabularyId)}/stats/domains/${encodeURIComponent(domainId)}`,
      options,
    );
  }

  /**
   * Vocabulary-scoped domain catalog. Distinct from `client.domains.list()`
   * which hits `/domains` — this one returns domains as they appear in the
   * vocabulary metadata table.
   */
  async domains(options: GetOptions = {}): Promise<OMOPHubResponse<VocabularyDomain[]>> {
    return this.client.get<VocabularyDomain[]>('/vocabularies/domains', options);
  }

  /**
   * Concept-class catalog across all vocabularies.
   */
  async conceptClasses(options: GetOptions = {}): Promise<OMOPHubResponse<ConceptClass[]>> {
    return this.client.get<ConceptClass[]>('/vocabularies/concept-classes', options);
  }

  /**
   * Paginated listing of concepts within a single vocabulary, with
   * optional search and standard/invalid filters.
   */
  async concepts(
    vocabularyId: string,
    options: VocabularyConceptsOptions & GetOptions = {},
  ): Promise<OMOPHubResponse<PaginatedData<ConceptSummary>>> {
    const { signal, headers, query, ...flags } = options;
    return this.client.get<PaginatedData<ConceptSummary>>(
      `/vocabularies/${encodeURIComponent(vocabularyId)}/concepts`,
      { signal, headers, query: { ...flags, ...query } },
    );
  }
}
