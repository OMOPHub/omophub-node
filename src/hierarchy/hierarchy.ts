import type { OMOPHub } from '../client.js';
import type { GetOptions } from '../common/interfaces/get-options.js';
import type { Response as OMOPHubResponse } from '../interfaces.js';
import type { AncestorsOptions } from './interfaces/ancestors-options.js';
import type { DescendantsOptions } from './interfaces/descendants-options.js';
import type { GetHierarchyOptions } from './interfaces/get-hierarchy-options.js';
import type {
  AncestorsResult,
  DescendantsResult,
  HierarchyResult,
} from './interfaces/hierarchy.js';

export class Hierarchy {
  constructor(private readonly client: OMOPHub) {}

  /**
   * Fetch the concept hierarchy in either flat or graph form.
   *
   * The `format` option drives the response shape — `'flat'` returns
   * `concepts` + `paths`, `'graph'` returns `nodes` + `edges`. The
   * server caps `maxLevels` at 20 regardless of what's sent.
   *
   * @see https://docs.omophub.com/api-reference/hierarchy/get
   */
  async get(
    conceptId: number,
    options: GetHierarchyOptions & GetOptions = {},
  ): Promise<OMOPHubResponse<HierarchyResult>> {
    const { signal, headers, query, ...flags } = options;
    return this.client.get<HierarchyResult>(`/concepts/${conceptId}/hierarchy`, {
      signal,
      headers,
      query: { ...flags, ...query },
    });
  }

  /**
   * List a concept's ancestors (concepts higher up in the hierarchy).
   */
  async ancestors(
    conceptId: number,
    options: AncestorsOptions & GetOptions = {},
  ): Promise<OMOPHubResponse<AncestorsResult>> {
    const { signal, headers, query, ...flags } = options;
    return this.client.get<AncestorsResult>(`/concepts/${conceptId}/ancestors`, {
      signal,
      headers,
      query: { ...flags, ...query },
    });
  }

  /**
   * List a concept's descendants (concepts lower in the hierarchy).
   */
  async descendants(
    conceptId: number,
    options: DescendantsOptions & GetOptions = {},
  ): Promise<OMOPHubResponse<DescendantsResult>> {
    const { signal, headers, query, ...flags } = options;
    return this.client.get<DescendantsResult>(`/concepts/${conceptId}/descendants`, {
      signal,
      headers,
      query: { ...flags, ...query },
    });
  }
}
