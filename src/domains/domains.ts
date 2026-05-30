import type { OMOPHub } from '../client.js';
import type { GetOptions } from '../common/interfaces/get-options.js';
import type { PaginatedData } from '../common/interfaces/pagination.js';
import type { ConceptSummary } from '../concepts/interfaces/concept.js';
import type { Response as OMOPHubResponse } from '../interfaces.js';
import type { Domain } from './interfaces/domain.js';
import type { DomainConceptsOptions } from './interfaces/domain-concepts-options.js';
import type { ListDomainsOptions } from './interfaces/list-domains-options.js';

export class Domains {
  constructor(private readonly client: OMOPHub) {}

  /**
   * List all OMOP domains. Distinct from `vocabularies.domains()` —
   * this endpoint (`/domains`) returns the canonical domain catalog,
   * while the vocabularies version returns domains scoped to vocabulary
   * usage.
   *
   * @see https://docs.omophub.com/api-reference/domains/list
   */
  async list(
    options: ListDomainsOptions & GetOptions = {},
  ): Promise<OMOPHubResponse<Domain[] | PaginatedData<Domain>>> {
    const { signal, headers, query, ...flags } = options;
    return this.client.get<Domain[] | PaginatedData<Domain>>('/domains', {
      signal,
      headers,
      query: { ...flags, ...query },
    });
  }

  /**
   * List the concepts that belong to a specific domain.
   *
   * @see https://docs.omophub.com/api-reference/domains/concepts
   */
  async concepts(
    domainId: string,
    options: DomainConceptsOptions & GetOptions = {},
  ): Promise<OMOPHubResponse<PaginatedData<ConceptSummary>>> {
    const { signal, headers, query, ...flags } = options;
    return this.client.get<PaginatedData<ConceptSummary>>(
      `/domains/${encodeURIComponent(domainId)}/concepts`,
      { signal, headers, query: { ...flags, ...query } },
    );
  }
}
