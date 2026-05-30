import type { OMOPHub } from '../client.js';
import type { GetOptions } from '../common/interfaces/get-options.js';
import type { PostOptions } from '../common/interfaces/post-options.js';
import { syntheticError } from '../common/utils/synthetic-error.js';
import { toSnakeCaseKeys } from '../common/utils/to-snake-case.js';
import type { Response as OMOPHubResponse } from '../interfaces.js';
import type { GetMappingsOptions } from './interfaces/get-mappings-options.js';
import type { MapConceptsOptions } from './interfaces/map-concepts-options.js';
import type { MapConceptsResult, MappingsListResult } from './interfaces/mapping.js';

export class Mappings {
  constructor(private readonly client: OMOPHub) {}

  /**
   * List the mappings already defined for a single concept.
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
