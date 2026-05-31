import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { backoffMs, isRetryableStatus } from '../../../src/common/utils/backoff.js';

describe('isRetryableStatus', () => {
  test('retries 429 and 5xx-ish statuses', () => {
    expect(isRetryableStatus(429)).toBe(true);
    expect(isRetryableStatus(502)).toBe(true);
    expect(isRetryableStatus(503)).toBe(true);
    expect(isRetryableStatus(504)).toBe(true);
  });

  test('does not retry 4xx (except 429) or 2xx', () => {
    expect(isRetryableStatus(200)).toBe(false);
    expect(isRetryableStatus(400)).toBe(false);
    expect(isRetryableStatus(401)).toBe(false);
    expect(isRetryableStatus(404)).toBe(false);
    expect(isRetryableStatus(500)).toBe(false);
  });
});

describe('backoffMs', () => {
  beforeEach(() => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('honours Retry-After in seconds when within 60s cap', () => {
    expect(backoffMs(0, '2')).toBe(2000);
    expect(backoffMs(5, '30')).toBe(30_000);
  });

  test('caps Retry-After above 60s at 60s rather than dropping it', () => {
    expect(backoffMs(0, '120')).toBe(60_000);
    expect(backoffMs(0, '600')).toBe(60_000);
  });

  test('floors Retry-After of 0 at the 100ms minimum to avoid spam-retry', () => {
    expect(backoffMs(0, '0')).toBe(100);
  });

  test('exponential backoff doubles per attempt, capped at 8s', () => {
    expect(backoffMs(0, null)).toBe(500);
    expect(backoffMs(1, null)).toBe(1000);
    expect(backoffMs(2, null)).toBe(2000);
    expect(backoffMs(3, null)).toBe(4000);
    expect(backoffMs(4, null)).toBe(8000);
    expect(backoffMs(5, null)).toBe(8000);
    expect(backoffMs(10, null)).toBe(8000);
  });

  test('jitter scales down by up to 25%', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1);
    expect(backoffMs(0, null)).toBeCloseTo(500 * 0.75, 5);
  });

  test('falls back to exponential for unparseable Retry-After', () => {
    expect(backoffMs(0, 'garbage')).toBe(500);
  });

  test('handles HTTP-date Retry-After values', () => {
    const fiveSecondsFromNow = new Date(Date.now() + 5_000).toUTCString();
    const result = backoffMs(0, fiveSecondsFromNow);
    expect(result).toBeGreaterThanOrEqual(4_000);
    expect(result).toBeLessThanOrEqual(6_000);
  });

  test('rejects malformed delta-seconds (whitespace, decimals, signs, empty)', () => {
    // Each falls back to exponential — the canonical "value not parseable"
    // signal. Without strict parsing, `Number('')` would silently return 0
    // and we'd retry instantly with no backoff.
    expect(backoffMs(0, '')).toBe(500);
    expect(backoffMs(0, '  5  ')).toBe(500);
    expect(backoffMs(0, '1.5')).toBe(500);
    expect(backoffMs(0, '+5')).toBe(500);
    expect(backoffMs(0, '5e3')).toBe(500);
    expect(backoffMs(0, '-5')).toBe(500);
  });

  test('rejects non-HTTP-date strings that Date.parse would otherwise accept', () => {
    // `Date.parse('2024-01-01')` succeeds but ISO dates are not valid
    // Retry-After values per RFC 9110 (which requires IMF-fixdate /
    // rfc850-date / asctime-date). Same for various permissive inputs.
    expect(backoffMs(0, '2024-01-01')).toBe(500);
    expect(backoffMs(0, '2024-01-01T00:00:00Z')).toBe(500);
    expect(backoffMs(0, 'tomorrow')).toBe(500);
    expect(backoffMs(0, '1 hour')).toBe(500);
  });

  test('rejects malformed dates that merely start with an HTTP-date weekday prefix', () => {
    // V8's `Date.parse` will accept a strict-looking date with trailing
    // junk and return a finite timestamp. The full-string regex match
    // rejects these.
    expect(backoffMs(0, 'Sunday is a holiday')).toBe(500);
    expect(backoffMs(0, 'Mon Nov 6 12:00:00 1994 garbage')).toBe(500);
    expect(backoffMs(0, 'Sun, 06 Nov 1994 08:49:37 GMT extra')).toBe(500);
    expect(backoffMs(0, 'Sun, 06 Nov 1994 08:49:37 PST')).toBe(500); // wrong zone
    expect(backoffMs(0, 'Sun, 6 Nov 1994 08:49:37 GMT')).toBe(500); // 1-digit day
  });

  test('accepts canonical rfc850-date and asctime-date HTTP-date formats', () => {
    // Construct the same instant as the IMF-fixdate test, in each of the
    // two obsolete forms RFC 9110 still requires us to honour.
    const future = new Date(Date.now() + 5_000);
    const yy = String(future.getUTCFullYear() % 100).padStart(2, '0');
    const yyyy = String(future.getUTCFullYear());
    const monthAbbr = future.toUTCString().slice(8, 11);
    const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][future.getUTCDay()];
    const fullDayName = [
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
    ][future.getUTCDay()];
    const dd = String(future.getUTCDate()).padStart(2, '0');
    const HH = String(future.getUTCHours()).padStart(2, '0');
    const MM = String(future.getUTCMinutes()).padStart(2, '0');
    const SS = String(future.getUTCSeconds()).padStart(2, '0');

    const rfc850 = `${fullDayName}, ${dd}-${monthAbbr}-${yy} ${HH}:${MM}:${SS} GMT`;
    const asctime = `${dayName} ${monthAbbr} ${dd} ${HH}:${MM}:${SS} ${yyyy}`;

    expect(backoffMs(0, rfc850)).toBeGreaterThanOrEqual(4_000);
    expect(backoffMs(0, rfc850)).toBeLessThanOrEqual(6_000);
    expect(backoffMs(0, asctime)).toBeGreaterThanOrEqual(4_000);
    expect(backoffMs(0, asctime)).toBeLessThanOrEqual(6_000);
  });
});
