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
 * - Honours `Retry-After` header (seconds or HTTP-date) — clamped to
 *   `[100ms, 60s]`. A value of 0 becomes 100ms (no spam-retry) and a
 *   value over 60s is capped at 60s (the server's signal isn't ignored).
 * - When no Retry-After is present, full-jitter exponential backoff:
 *   `min(500 * 2^attempt, 8000) * (1 - 0.25 * random())`.
 */
export function backoffMs(attempt: number, retryAfter: string | null): number {
  if (retryAfter) {
    const seconds = parseRetryAfter(retryAfter);
    if (seconds !== null) {
      const cappedMs = Math.min(seconds, MAX_RETRY_AFTER_SEC) * 1000;
      return Math.max(cappedMs, MIN_RETRY_AFTER_MS);
    }
  }
  const exp = Math.min(INITIAL_DELAY_MS * 2 ** attempt, MAX_DELAY_MS);
  return exp * (1 - 0.25 * Math.random());
}

// Per RFC 9110 §5.6.7. `Date.parse` itself accepts a much broader grammar
// (ISO strings, trailing-junk strict-looking dates, natural language in
// some engines), so we full-string match before trusting it.
const IMF_FIXDATE_RE =
  /^(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun), \d{2} (?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d{4} \d{2}:\d{2}:\d{2} GMT$/;
const RFC850_DATE_RE =
  /^(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday), \d{2}-(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)-\d{2} \d{2}:\d{2}:\d{2} GMT$/;
const ASCTIME_DATE_RE =
  /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun) (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) ( \d|\d{2}) (\d{2}:\d{2}:\d{2}) (\d{4})$/;

/**
 * Parses a `Retry-After` header value (delta-seconds or HTTP-date) into
 * a number of seconds. Returns `null` for unparseable input. Exported so
 * `parse-error.ts` can populate `ErrorResponse.retryAfter` consistently.
 *
 * Strict per RFC 9110 §10.2.3 / §5.6.7:
 * - `delta-seconds` is `1*DIGIT` — no signs, decimals, exponents, or
 *   whitespace. `Number('')` quietly returns 0; `Number('1.5')` returns
 *   1.5; both would otherwise be honoured as retry delays.
 * - `HTTP-date` is exactly one of `IMF-fixdate` (preferred),
 *   `rfc850-date`, or `asctime-date`. Each is matched against a full
 *   regex before handing off to `Date.parse`. `asctime-date` has no
 *   timezone field; `Date.parse` interprets the wall-clock as local
 *   time (the original C `asctime()` convention), but RFC 9110 expects
 *   UTC, so we normalise the matched components into an IMF-fixdate
 *   ending in `GMT` before parsing.
 */
export function parseRetryAfter(header: string): number | null {
  if (/^\d+$/.test(header)) {
    return Number(header);
  }
  let toParse: string | null = null;
  if (IMF_FIXDATE_RE.test(header) || RFC850_DATE_RE.test(header)) {
    toParse = header;
  } else {
    const m = ASCTIME_DATE_RE.exec(header);
    if (m) {
      const [, dayName, month, day, time, year] = m;
      // Group 3 is `( 2DIGIT / ( SP 1DIGIT ))` — single-digit days arrive
      // as " 6" (space-prefixed); IMF-fixdate requires zero-padding.
      const dd = (day ?? '').trim().padStart(2, '0');
      toParse = `${dayName}, ${dd} ${month} ${year} ${time} GMT`;
    }
  }
  if (toParse !== null) {
    const date = Date.parse(toParse);
    if (Number.isFinite(date)) {
      const diffMs = date - Date.now();
      return diffMs > 0 ? Math.ceil(diffMs / 1000) : 0;
    }
  }
  return null;
}
