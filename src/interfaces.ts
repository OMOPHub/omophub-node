import type { PaginationMeta } from './common/interfaces/pagination.js';

/**
 * Canonical SDK error codes. Stable across releases — safe to switch on.
 */
export type OMOPHUB_ERROR_CODE_KEY =
  // Auth
  | 'missing_api_key'
  | 'invalid_api_key'
  | 'restricted_api_key'
  // Request shape
  | 'validation_error'
  | 'missing_required_field'
  | 'invalid_argument'
  // Resource
  | 'not_found'
  | 'method_not_allowed'
  | 'conflict'
  // Quota
  | 'rate_limit_exceeded'
  | 'tier_limit_exceeded'
  // Server
  | 'internal_server_error'
  | 'service_unavailable'
  // Transport
  | 'connection_error'
  | 'timeout_error'
  // Catch-all
  | 'application_error';

export interface ErrorResponse {
  name: OMOPHUB_ERROR_CODE_KEY;
  message: string;
  statusCode: number | null;
  requestId?: string;
  retryAfter?: number;
  details?: Record<string, unknown>;
}

export interface ResponseMeta {
  request_id?: string;
  timestamp?: string;
  vocab_release?: string;
  pagination?: PaginationMeta;
}

/**
 * Discriminated-union return type for every SDK method.
 *
 * On success: `{ data: T, error: null, meta, headers }` — `data` is the
 *   unwrapped payload from the API envelope, `meta` carries pagination /
 *   request_id / vocab_release when present.
 *
 * On error: `{ data: null, error: ErrorResponse, meta: null, headers }` —
 *   `headers` is preserved when the error came from the wire, null when
 *   the error was synthesised client-side.
 *
 * Narrow with `if (error) ...` — TypeScript will type `data` as `T` in the
 * `else` branch.
 */
export type Response<T> = (
  | { data: T; error: null; meta: ResponseMeta | null }
  | { data: null; error: ErrorResponse; meta: null }
) & { headers: Record<string, string> | null };
