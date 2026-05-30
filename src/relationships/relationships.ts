import type { OMOPHub } from '../client.js';
import type { GetOptions } from '../common/interfaces/get-options.js';
import type { Response as OMOPHubResponse } from '../interfaces.js';
import type { GetRelationshipsOptions } from './interfaces/get-relationships-options.js';
import type { ListRelationshipTypesOptions } from './interfaces/list-relationship-types-options.js';
import type { RelationshipsResult, RelationshipTypesResult } from './interfaces/relationship.js';

export class Relationships {
  constructor(private readonly client: OMOPHub) {}

  /**
   * List a concept's relationships.
   *
   * Hits the same wire endpoint as `client.concepts.relationships(...)` —
   * kept as a separate method so callers thinking in relationship-first
   * terms have a discoverable surface. Keep parameter lists in sync.
   *
   * @see https://docs.omophub.com/api-reference/relationships/get
   */
  async get(
    conceptId: number,
    options: GetRelationshipsOptions & GetOptions = {},
  ): Promise<OMOPHubResponse<RelationshipsResult>> {
    const { signal, headers, query, ...flags } = options;
    return this.client.get<RelationshipsResult>(`/concepts/${conceptId}/relationships`, {
      signal,
      headers,
      query: { ...flags, ...query },
    });
  }

  /**
   * List the catalog of available relationship types.
   *
   * @see https://docs.omophub.com/api-reference/relationships/types
   */
  async types(
    options: ListRelationshipTypesOptions & GetOptions = {},
  ): Promise<OMOPHubResponse<RelationshipTypesResult>> {
    const { signal, headers, query, ...flags } = options;
    return this.client.get<RelationshipTypesResult>('/relationships/types', {
      signal,
      headers,
      query: { ...flags, ...query },
    });
  }
}
