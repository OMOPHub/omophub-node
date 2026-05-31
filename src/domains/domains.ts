import type { OMOPHub } from '../client.js';
import type { GetOptions } from '../common/interfaces/get-options.js';
import type { Response as OMOPHubResponse } from '../interfaces.js';
import type { DomainConceptsResult, ListDomainsResult } from './interfaces/domain.js';
import type { DomainConceptsOptions } from './interfaces/domain-concepts-options.js';
import type { ListDomainsOptions } from './interfaces/list-domains-options.js';

export class Domains {
  constructor(private readonly client: OMOPHub) {}

  /**
   * List all OMOP domains. Distinct from `vocabularies.domains()` —
   * this endpoint (`/domains`) returns the canonical domain catalog,
   * while the vocabularies version returns domains scoped to vocabulary
   * usage. Wrapped under `domains`.
   *
   * Not paginated server-side (Python and R SDKs both call this endpoint
   * without page/page_size). Returns the full catalog in a single call.
   *
   * @see https://docs.omophub.com/api-reference/domains/list
   */
  async list(
    options: ListDomainsOptions & GetOptions = {},
  ): Promise<OMOPHubResponse<ListDomainsResult>> {
    const { signal, headers, query, ...flags } = options;
    return this.client.get<ListDomainsResult>('/domains', {
      signal,
      headers,
      query: { ...flags, ...query },
    });
  }

  /**
   * List the concepts that belong to a specific domain. Wrapped under
   * `concepts`; pagination metadata on outer `Response.meta`.
   *
   * @see https://docs.omophub.com/api-reference/domains/concepts
   */
  async concepts(
    domainId: string,
    options: DomainConceptsOptions & GetOptions = {},
  ): Promise<OMOPHubResponse<DomainConceptsResult>> {
    const { signal, headers, query, ...flags } = options;
    return this.client.get<DomainConceptsResult>(
      `/domains/${encodeURIComponent(domainId)}/concepts`,
      { signal, headers, query: { ...flags, ...query } },
    );
  }
}
