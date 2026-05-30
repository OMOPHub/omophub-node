import type { ErrorResponse, OMOPHUB_ERROR_CODE_KEY, Response } from '../../interfaces.js';

/**
 * Builds a `Response<T>` whose error came from the SDK itself rather than
 * the wire — used by resources to short-circuit before issuing a request
 * (size caps, XOR validation, etc.). The shape matches what a real API
 * error would look like so callers have one error path regardless of source.
 *
 * `statusCode` is null because no HTTP exchange occurred, and `headers` is
 * null for the same reason — distinguishing wire errors (have headers) from
 * synthetic ones (don't) without forcing callers to care.
 */
export function syntheticError<T>(
  name: OMOPHUB_ERROR_CODE_KEY,
  message: string,
  details?: Record<string, unknown>,
): Response<T> {
  const error: ErrorResponse = { name, message, statusCode: null };
  if (details) error.details = details;
  return { data: null, error, meta: null, headers: null };
}
