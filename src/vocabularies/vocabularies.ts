import type { OMOPHub } from '../client.js';
import type { GetOptions } from '../common/interfaces/get-options.js';
import type { Response as OMOPHubResponse } from '../interfaces.js';
import type { ListVocabulariesOptions } from './interfaces/list-vocabularies-options.js';
import type {
  ListConceptClassesResult,
  ListVocabulariesResult,
  ListVocabularyDomainsResult,
  Vocabulary,
  VocabularyConceptsResult,
  VocabularyStats,
} from './interfaces/vocabulary.js';
import type { VocabularyConceptsOptions } from './interfaces/vocabulary-concepts-options.js';

export class Vocabularies {
  constructor(private readonly client: OMOPHub) {}

  /**
   * List vocabularies. Result is wrapped under `vocabularies`; pagination
   * metadata lives on the outer `Response.meta.pagination`.
   *
   * @see https://docs.omophub.com/api-reference/vocabularies/list
   */
  async list(
    options: ListVocabulariesOptions & GetOptions = {},
  ): Promise<OMOPHubResponse<ListVocabulariesResult>> {
    const { signal, headers, query, ...flags } = options;
    return this.client.get<ListVocabulariesResult>('/vocabularies', {
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
   * vocabulary metadata table. Wrapped under `domains`.
   */
  async domains(options: GetOptions = {}): Promise<OMOPHubResponse<ListVocabularyDomainsResult>> {
    return this.client.get<ListVocabularyDomainsResult>('/vocabularies/domains', options);
  }

  /**
   * Concept-class catalog across all vocabularies. Returns a **bare array**
   * of `ConceptClass` rows — confirmed against the live API; not wrapped.
   */
  async conceptClasses(
    options: GetOptions = {},
  ): Promise<OMOPHubResponse<ListConceptClassesResult>> {
    return this.client.get<ListConceptClassesResult>('/vocabularies/concept-classes', options);
  }

  /**
   * Paginated listing of concepts within a single vocabulary. Returns a
   * **bare array** of `Concept` rows — confirmed against the live API;
   * pagination metadata on outer `Response.meta`.
   */
  async concepts(
    vocabularyId: string,
    options: VocabularyConceptsOptions & GetOptions = {},
  ): Promise<OMOPHubResponse<VocabularyConceptsResult>> {
    const { signal, headers, query, ...flags } = options;
    return this.client.get<VocabularyConceptsResult>(
      `/vocabularies/${encodeURIComponent(vocabularyId)}/concepts`,
      { signal, headers, query: { ...flags, ...query } },
    );
  }
}
