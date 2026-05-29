import type { OMOPHub } from '../client.js';
import type { GetOptions } from '../common/interfaces/get-options.js';
import type { PaginatedData } from '../common/interfaces/pagination.js';
import type { Response as OMOPHubResponse } from '../interfaces.js';
import type { ListVocabulariesOptions } from './interfaces/list-vocabularies-options.js';
import type { Vocabulary } from './interfaces/vocabulary.js';

export class Vocabularies {
  constructor(private readonly client: OMOPHub) {}

  /**
   * List vocabularies.
   *
   * ```ts
   * const { data, error } = await client.vocabularies.list({ pageSize: 50 });
   * ```
   *
   * @see https://docs.omophub.com/api-reference/vocabularies/list
   */
  async list(
    options: ListVocabulariesOptions = {},
    requestOptions: GetOptions = {},
  ): Promise<OMOPHubResponse<PaginatedData<Vocabulary>>> {
    return this.client.get<PaginatedData<Vocabulary>>('/vocabularies', {
      ...requestOptions,
      query: {
        page: options.page,
        page_size: options.pageSize,
        include_stats: options.includeStats,
        include_inactive: options.includeInactive,
        sort_by: options.sortBy,
        sort_order: options.sortOrder,
        ...requestOptions.query,
      },
    });
  }
}
