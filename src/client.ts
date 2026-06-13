import type { DeleteOptions } from './common/interfaces/delete-options.js';
import type { GetOptions } from './common/interfaces/get-options.js';
import type { PatchOptions } from './common/interfaces/patch-options.js';
import type { HeadersInit, PerCallOptions } from './common/interfaces/per-call-options.js';
import type { PostOptions } from './common/interfaces/post-options.js';
import type { PutOptions } from './common/interfaces/put-options.js';
import { backoffMs, isNoSideEffectStatus, isRetryableStatus } from './common/utils/backoff.js';
import { appendQuery, buildQuery } from './common/utils/build-query.js';
import { envOrUndefined } from './common/utils/env.js';
import { mergeHeaders } from './common/utils/merge-headers.js';
import { connectionError, parseErrorResponse, timeoutError } from './common/utils/parse-error.js';
import { sleep } from './common/utils/sleep.js';
import { unwrapEnvelope } from './common/utils/unwrap-envelope.js';
import { Concepts } from './concepts/concepts.js';
import { Domains } from './domains/domains.js';
import { OMOPHubError } from './errors.js';
import { Fhir } from './fhir/fhir.js';
import { Hierarchy } from './hierarchy/hierarchy.js';
import type { Response as OMOPHubResponse } from './interfaces.js';
import { Mappings } from './mappings/mappings.js';
import { Relationships } from './relationships/relationships.js';
import { Search } from './search/search.js';
import { __version__ } from './version.js';
import { Vocabularies } from './vocabularies/vocabularies.js';

const DEFAULT_BASE_URL = 'https://api.omophub.com/v1';
const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_USER_AGENT = `OMOPHub-SDK-Node/${__version__}`;

export interface OMOPHubOptions {
  /** Base URL of the OMOPHub API. Defaults to env `OMOPHUB_API_URL` or the production URL. */
  baseUrl?: string;
  /** Per-request timeout in milliseconds. Default 30000. Set to 0 to disable. */
  timeoutMs?: number;
  /**
   * Retry attempts on retryable failures (429, 502, 503, 504, and transient
   * network errors) — see `isRetryableStatus`. Default 3. Set to 0 to disable.
   */
  maxRetries?: number;
  /** Pin a vocabulary version via the `X-Vocab-Version` header on every request. */
  vocabVersion?: string;
  /** Override the SDK user-agent string. */
  userAgent?: string;
  /** Inject a custom fetch implementation (proxy, instrumentation). Defaults to `globalThis.fetch`. */
  fetch?: typeof fetch;
}

/**
 * Entry point for the OMOPHub SDK.
 *
 * ```ts
 * import { OMOPHub } from '@omophub/omophub-node';
 *
 * const client = new OMOPHub(process.env.OMOPHUB_API_KEY);
 * const { data, error } = await client.vocabularies.list({ pageSize: 5 });
 * if (error) throw new Error(error.message);
 * console.log(data.data.map((v) => v.vocabulary_id));
 * ```
 */
export class OMOPHub {
  readonly baseUrl: string;
  readonly timeoutMs: number;
  readonly maxRetries: number;
  readonly userAgent: string;
  readonly vocabVersion: string | undefined;
  readonly #apiKey: string;
  readonly #headers: Headers;
  readonly #fetch: typeof fetch;

  readonly concepts: Concepts;
  readonly domains: Domains;
  readonly fhir: Fhir;
  readonly hierarchy: Hierarchy;
  readonly mappings: Mappings;
  readonly relationships: Relationships;
  readonly search: Search;
  readonly vocabularies: Vocabularies;

  constructor(apiKey?: string, options: OMOPHubOptions = {}) {
    const resolvedKey = apiKey ?? envOrUndefined('OMOPHUB_API_KEY');
    if (!resolvedKey) {
      throw new OMOPHubError(
        'Missing API key. Pass it to the constructor: new OMOPHub("oh_...") or set OMOPHUB_API_KEY.',
      );
    }
    this.#apiKey = resolvedKey;
    this.baseUrl = options.baseUrl ?? envOrUndefined('OMOPHUB_API_URL') ?? DEFAULT_BASE_URL;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
    this.userAgent = options.userAgent ?? DEFAULT_USER_AGENT;
    this.vocabVersion = options.vocabVersion;

    this.#headers = new Headers({
      Authorization: `Bearer ${this.#apiKey}`,
      'User-Agent': this.userAgent,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    });
    if (this.vocabVersion) this.#headers.set('X-Vocab-Version', this.vocabVersion);

    const fetchImpl = options.fetch ?? globalThis.fetch;
    this.#fetch = fetchImpl.bind(globalThis);

    this.concepts = new Concepts(this);
    this.domains = new Domains(this);
    this.fhir = new Fhir(this);
    this.hierarchy = new Hierarchy(this);
    this.mappings = new Mappings(this);
    this.relationships = new Relationships(this);
    this.search = new Search(this);
    this.vocabularies = new Vocabularies(this);
  }

  async get<T>(path: string, options: GetOptions = {}): Promise<OMOPHubResponse<T>> {
    return this.#dispatch<T>(path, 'GET', undefined, options);
  }

  async post<T>(
    path: string,
    body?: unknown,
    options: PostOptions = {},
  ): Promise<OMOPHubResponse<T>> {
    const { idempotencyKey, ...rest } = options;
    let mergedHeadersInit: HeadersInit | undefined = rest.headers;
    if (idempotencyKey) {
      const headers = new Headers(rest.headers);
      headers.set('Idempotency-Key', idempotencyKey);
      mergedHeadersInit = headers;
    }
    return this.#dispatch<T>(path, 'POST', body, { ...rest, headers: mergedHeadersInit });
  }

  async patch<T>(
    path: string,
    body?: unknown,
    options: PatchOptions = {},
  ): Promise<OMOPHubResponse<T>> {
    return this.#dispatch<T>(path, 'PATCH', body, options);
  }

  async put<T>(
    path: string,
    body?: unknown,
    options: PutOptions = {},
  ): Promise<OMOPHubResponse<T>> {
    return this.#dispatch<T>(path, 'PUT', body, options);
  }

  async delete<T>(
    path: string,
    body?: unknown,
    options: DeleteOptions = {},
  ): Promise<OMOPHubResponse<T>> {
    return this.#dispatch<T>(path, 'DELETE', body, options);
  }

  async #dispatch<T>(
    path: string,
    method: string,
    body: unknown,
    options: PerCallOptions,
  ): Promise<OMOPHubResponse<T>> {
    const query = buildQuery(options.query);
    const url = `${this.baseUrl}${appendQuery(path, query)}`;
    const headers = mergeHeaders(this.#headers, options.headers);

    let attempt = 0;
    while (true) {
      const init: RequestInit = { method, headers };
      if (body !== undefined && method !== 'GET') {
        init.body = JSON.stringify(body);
      }

      const timeoutController = this.timeoutMs > 0 ? new AbortController() : null;
      const timer = timeoutController
        ? setTimeout(() => timeoutController.abort(), this.timeoutMs)
        : null;
      init.signal = composeSignals(timeoutController?.signal, options.signal);

      try {
        const response = await this.#fetch(url, init);
        if (timer) clearTimeout(timer);
        const responseHeaders = headersToRecord(response.headers);

        if (response.ok) {
          let parsed: unknown;
          try {
            parsed = await response.json();
          } catch {
            parsed = null;
          }
          const { data, meta } = unwrapEnvelope<T>(parsed);
          return { data, error: null, meta, headers: responseHeaders };
        }

        if (
          isRetryableStatus(response.status) &&
          attempt < this.maxRetries &&
          (isNoSideEffectStatus(response.status) || isRetryableRequest(method, headers))
        ) {
          const retryAfter = response.headers.get('retry-after');
          // Drain the body so undici releases the connection back to the pool
          // before we sleep and reuse the agent for the next attempt.
          await response.body?.cancel();
          await sleep(backoffMs(attempt, retryAfter));
          attempt++;
          continue;
        }

        const error = await parseErrorResponse(response);
        return { data: null, error, meta: null, headers: responseHeaders };
      } catch (err) {
        if (timer) clearTimeout(timer);
        if (isTimeoutAbort(err, timeoutController)) {
          return { data: null, error: timeoutError(), meta: null, headers: null };
        }
        if (isCallerAbort(err, options.signal)) {
          throw err;
        }
        if (attempt < this.maxRetries && isRetryableRequest(method, headers)) {
          await sleep(backoffMs(attempt, null));
          attempt++;
          continue;
        }
        return { data: null, error: connectionError(err), meta: null, headers: null };
      }
    }
  }
}

function composeSignals(
  timeoutSignal: AbortSignal | undefined,
  callerSignal: AbortSignal | undefined,
): AbortSignal | undefined {
  if (timeoutSignal && callerSignal) return AbortSignal.any([timeoutSignal, callerSignal]);
  return timeoutSignal ?? callerSignal;
}

function headersToRecord(headers: Headers): Record<string, string> {
  const out: Record<string, string> = {};
  headers.forEach((value, key) => {
    out[key] = value;
  });
  return out;
}

function isTimeoutAbort(err: unknown, controller: AbortController | null): boolean {
  if (!controller) return false;
  if (!(err instanceof Error)) return false;
  return err.name === 'AbortError' && controller.signal.aborted;
}

function isCallerAbort(err: unknown, callerSignal: AbortSignal | undefined): boolean {
  if (!callerSignal) return false;
  if (!(err instanceof Error)) return false;
  return err.name === 'AbortError' && callerSignal.aborted;
}

const IDEMPOTENT_METHODS = new Set(['GET', 'HEAD', 'OPTIONS', 'PUT', 'DELETE']);

/**
 * A request is safe to retry when its HTTP verb is idempotent (RFC 7231)
 * or when the caller has supplied an `Idempotency-Key` header — at which
 * point the server can deduplicate on its side. POST and PATCH without a
 * key are NOT retried by this gate, since retry could create duplicates.
 * (`isNoSideEffectStatus` bypasses this for statuses like 429 where the
 * server explicitly rejected without processing.)
 */
function isRetryableRequest(method: string, headers: Headers): boolean {
  if (IDEMPOTENT_METHODS.has(method)) return true;
  return headers.has('Idempotency-Key');
}
