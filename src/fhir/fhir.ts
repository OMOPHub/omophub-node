import type { OMOPHub } from '../client.js';
import type { PostOptions } from '../common/interfaces/post-options.js';
import { syntheticError } from '../common/utils/synthetic-error.js';
import { toSnakeCaseKeys } from '../common/utils/to-snake-case.js';
import type { Response as OMOPHubResponse } from '../interfaces.js';
import type {
  Coding,
  FhirBatchResult,
  FhirCodeableConceptResult,
  FhirResolveResult,
} from './interfaces/fhir.js';
import type { ResolveBatchOptions } from './interfaces/resolve-batch-options.js';
import type { ResolveCodeableConceptOptions } from './interfaces/resolve-codeable-concept-options.js';
import type { ResolveOptions } from './interfaces/resolve-options.js';

export class Fhir {
  constructor(private readonly client: OMOPHub) {}

  /**
   * Resolve a single FHIR coding to its OMOP standard concept.
   *
   * Accepts two equivalent input forms:
   *
   * ```ts
   * // Flat form:
   * client.fhir.resolve({ system: 'http://snomed.info/sct', code: '44054006' });
   *
   * // Nested-coding form:
   * client.fhir.resolve({ coding: { system: 'http://snomed.info/sct', code: '44054006' } });
   * ```
   *
   * Flat fields take precedence when both forms are supplied.
   *
   * @see https://docs.omophub.com/api-reference/fhir/resolve
   */
  async resolve(
    options: ResolveOptions & PostOptions,
  ): Promise<OMOPHubResponse<FhirResolveResult>> {
    const hasCodingObj =
      options.coding !== undefined &&
      options.coding !== null &&
      typeof options.coding === 'object' &&
      !Array.isArray(options.coding) &&
      typeof options.coding.code === 'string' &&
      options.coding.code.length > 0;
    const hasFlatCode = typeof options.code === 'string' && options.code.length > 0;
    // The server also accepts text-only input — `display` alone triggers
    // a semantic-search fallback to the best-matching standard concept.
    const hasDisplayOnly = typeof options.display === 'string' && options.display.length > 0;
    if (!hasCodingObj && !hasFlatCode && !hasDisplayOnly) {
      return syntheticError<FhirResolveResult>(
        'missing_required_field',
        'Provide a `coding` object with a `code`, a flat `code`, or `display` text for semantic fallback.',
      );
    }

    const { signal, headers, query, idempotencyKey, coding, ...flatFields } = options;
    // Merge order: coding first, flat overrides — lets callers spread a
    // FHIR object and then patch specific fields.
    const merged = coding ? { ...coding, ...stripUndefined(flatFields) } : flatFields;
    const body = toSnakeCaseKeys(merged);
    return this.client.post<FhirResolveResult>('/fhir/resolve', body, {
      signal,
      headers,
      query,
      idempotencyKey,
    });
  }

  /**
   * Resolve a batch of up to 100 FHIR codings in a single request.
   *
   * @see https://docs.omophub.com/api-reference/fhir/resolve-batch
   */
  async resolveBatch(
    codings: Coding[],
    options: ResolveBatchOptions & PostOptions = {},
  ): Promise<OMOPHubResponse<FhirBatchResult>> {
    if (!Array.isArray(codings) || codings.length < 1 || codings.length > 100) {
      return syntheticError<FhirBatchResult>(
        'validation_error',
        '`codings` must be an array of 1–100 entries.',
      );
    }
    const { signal, headers, query, idempotencyKey, ...rest } = options;
    const body = toSnakeCaseKeys({ codings, ...rest });
    return this.client.post<FhirBatchResult>('/fhir/resolve/batch', body, {
      signal,
      headers,
      query,
      idempotencyKey,
    });
  }

  /**
   * Resolve a FHIR `CodeableConcept` (up to 20 codings) by picking the
   * best-matching OMOP standard concept across the supplied codings.
   *
   * @see https://docs.omophub.com/api-reference/fhir/resolve-codeable-concept
   */
  async resolveCodeableConcept(
    coding: Coding[],
    options: ResolveCodeableConceptOptions & PostOptions = {},
  ): Promise<OMOPHubResponse<FhirCodeableConceptResult>> {
    if (!Array.isArray(coding) || coding.length < 1 || coding.length > 20) {
      return syntheticError<FhirCodeableConceptResult>(
        'validation_error',
        '`coding` must be an array of 1–20 entries.',
      );
    }
    const { signal, headers, query, idempotencyKey, ...rest } = options;
    const body = toSnakeCaseKeys({ coding, ...rest });
    return this.client.post<FhirCodeableConceptResult>('/fhir/resolve/codeable-concept', body, {
      signal,
      headers,
      query,
      idempotencyKey,
    });
  }
}

/**
 * Strips keys whose value is `undefined`. Used when merging flat fields
 * onto a coding object so an unset `system` doesn't blow away the
 * coding's `system`.
 */
function stripUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v;
  }
  return out as Partial<T>;
}
