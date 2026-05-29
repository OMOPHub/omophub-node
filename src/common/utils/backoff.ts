const INITIAL_DELAY_MS = 500;
const MAX_DELAY_MS = 8_000;
const MAX_RETRY_AFTER_SEC = 60;
const MIN_RETRY_AFTER_MS = 100;

const RETRYABLE_STATUSES = new Set([429, 502, 503, 504]);

export function isRetryableStatus(status: number): boolean {
  return RETRYABLE_STATUSES.has(status);
}

/**
 * Computes the delay before the next retry attempt.
 *
 * - Honours `Retry-After` header (seconds or HTTP-date) up to a 60s cap,
 *   floored to a 100ms minimum so a `Retry-After: 0` doesn't translate to
 *   an immediate-spam retry.
 * - Otherwise full-jitter exponential backoff:
 *   `min(500 * 2^attempt, 8000) * (1 - 0.25 * random())`
 *
 * Mirrors the OMOPHub Python SDK's `_calculate_retry_delay`.
 */
export function backoffMs(attempt: number, retryAfter: string | null): number {
  if (retryAfter) {
    const seconds = parseRetryAfter(retryAfter);
    if (seconds !== null && seconds <= MAX_RETRY_AFTER_SEC) {
      return Math.max(seconds * 1000, MIN_RETRY_AFTER_MS);
    }
  }
  const exp = Math.min(INITIAL_DELAY_MS * 2 ** attempt, MAX_DELAY_MS);
  return exp * (1 - 0.25 * Math.random());
}

/**
 * Parses a `Retry-After` header value (delta-seconds or HTTP-date) into
 * a number of seconds. Returns `null` for unparseable input. Exported so
 * `parse-error.ts` can populate `ErrorResponse.retryAfter` consistently.
 */
export function parseRetryAfter(header: string): number | null {
  const seconds = Number(header);
  if (Number.isFinite(seconds) && seconds >= 0) return seconds;
  const date = Date.parse(header);
  if (Number.isFinite(date)) {
    const diffMs = date - Date.now();
    return diffMs > 0 ? Math.ceil(diffMs / 1000) : 0;
  }
  return null;
}
