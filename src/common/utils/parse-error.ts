import type { ErrorResponse, OMOPHUB_ERROR_CODE_KEY } from '../../interfaces.js';
import { parseRetryAfter } from './backoff.js';

const STATUS_TO_CODE: Record<number, OMOPHUB_ERROR_CODE_KEY> = {
  400: 'validation_error',
  401: 'invalid_api_key',
  403: 'restricted_api_key',
  404: 'not_found',
  405: 'method_not_allowed',
  409: 'conflict',
  429: 'rate_limit_exceeded',
};

const KNOWN_CODES = new Set<string>([
  'missing_api_key',
  'invalid_api_key',
  'restricted_api_key',
  'validation_error',
  'missing_required_field',
  'invalid_argument',
  'not_found',
  'method_not_allowed',
  'conflict',
  'rate_limit_exceeded',
  'tier_limit_exceeded',
  'internal_server_error',
  'service_unavailable',
  'connection_error',
  'timeout_error',
  'application_error',
]);

/**
 * Converts a non-OK fetch Response into an ErrorResponse. Parses the JSON
 * body if present, maps HTTP status to a stable error code, and pulls
 * request-id + retry-after from headers.
 */
export async function parseErrorResponse(response: Response): Promise<ErrorResponse> {
  const status = response.status;
  let parsed: unknown = null;
  try {
    parsed = await response.json();
  } catch {
    parsed = null;
  }

  const message = extractMessage(parsed) ?? `HTTP ${status}`;
  const name = pickErrorCode(status, parsed);
  const requestId =
    response.headers.get('x-request-id') ?? response.headers.get('X-Request-Id') ?? undefined;

  const error: ErrorResponse = {
    name,
    message,
    statusCode: status,
  };
  if (requestId) error.requestId = requestId;

  if (status === 429) {
    const retryAfterHeader = response.headers.get('retry-after');
    if (retryAfterHeader) {
      const seconds = parseRetryAfter(retryAfterHeader);
      if (seconds !== null) error.retryAfter = seconds;
    }
  }

  const details = extractDetails(parsed);
  if (details) error.details = details;

  return error;
}

export function connectionError(err: unknown): ErrorResponse {
  return {
    name: 'connection_error',
    message: err instanceof Error ? err.message : 'Network error',
    statusCode: null,
  };
}

export function timeoutError(): ErrorResponse {
  return {
    name: 'timeout_error',
    message: 'Request timed out.',
    statusCode: null,
  };
}

function extractMessage(body: unknown): string | null {
  if (!body || typeof body !== 'object') return null;
  const b = body as Record<string, unknown>;
  if (typeof b.message === 'string') return b.message;
  if (b.error && typeof b.error === 'object') {
    const inner = b.error as Record<string, unknown>;
    if (typeof inner.message === 'string') return inner.message;
  }
  if (typeof b.error === 'string') return b.error;
  return null;
}

function extractDetails(body: unknown): Record<string, unknown> | undefined {
  if (!body || typeof body !== 'object') return undefined;
  const b = body as Record<string, unknown>;
  if (b.error && typeof b.error === 'object') {
    const inner = b.error as Record<string, unknown>;
    if (inner.details && typeof inner.details === 'object') {
      return inner.details as Record<string, unknown>;
    }
  }
  return undefined;
}

function pickErrorCode(status: number, body: unknown): OMOPHUB_ERROR_CODE_KEY {
  const mapped = STATUS_TO_CODE[status];
  if (mapped) return mapped;

  if (status >= 500 && status < 600) {
    return status === 503 ? 'service_unavailable' : 'internal_server_error';
  }

  if (body && typeof body === 'object') {
    const b = body as Record<string, unknown>;
    const inner =
      b.error && typeof b.error === 'object' ? (b.error as Record<string, unknown>) : null;
    const candidate = inner?.code ?? inner?.name;
    if (typeof candidate === 'string' && KNOWN_CODES.has(candidate)) {
      return candidate as OMOPHUB_ERROR_CODE_KEY;
    }
  }
  return 'application_error';
}
