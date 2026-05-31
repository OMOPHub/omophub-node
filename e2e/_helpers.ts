import { OMOPHub } from '../src/index.js';

/**
 * Well-known concept IDs used across the e2e smoke suite. Same set the
 * Python and R SDK test suites use for cross-SDK parity.
 */
export const E2E_CONCEPT_IDS = {
  diabetes: 201826,
  aspirin: 1112807,
  hypertension: 316866,
  covid: 37311061,
} as const;

const API_KEY = process.env.OMOPHUB_API_KEY;

/**
 * Skip-or-run guard. If `OMOPHUB_API_KEY` isn't present in the
 * environment (CI without the secret, contributor without `.env`), the
 * suite no-ops with a clear message instead of failing.
 */
export const e2eEnabled = typeof API_KEY === 'string' && API_KEY.length > 0;

/**
 * Throws if you try to construct a client without the key — `e2eEnabled`
 * gates this so it should never fire inside an e2e test.
 */
export function e2eClient(): OMOPHub {
  if (!e2eEnabled) {
    throw new Error('e2eClient() called without OMOPHUB_API_KEY — guard with e2eEnabled.');
  }
  return new OMOPHub(API_KEY, {
    // Generous timeout: some live queries (semantic search, exactMatch)
    // can take 15–25 s before responding.
    timeoutMs: 45_000,
    maxRetries: 2,
  });
}

/**
 * Client variant for tests that EXPECT an error response (404, 400, etc.)
 * — disables retries so a known-bad call fails fast and stays inside the
 * 60 s test timeout. Used by `server-errors.test.ts` and similar.
 */
export function e2eClientNoRetry(): OMOPHub {
  if (!e2eEnabled) {
    throw new Error('e2eClientNoRetry() called without OMOPHUB_API_KEY.');
  }
  return new OMOPHub(API_KEY, {
    timeoutMs: 20_000,
    maxRetries: 0,
  });
}

/**
 * Brief per-suite throttle to avoid hot-spotting the API rate limiter
 * when the full e2e suite runs back-to-back. ~2 req/sec global ceiling.
 *
 * Two implementation notes:
 *
 * 1. **Cross-file state via `globalThis`** — vitest loads each test file
 *    in its own module context, so a plain `let lastRequestAt = 0` would
 *    reset at every file boundary, letting the first call in each of the
 *    11 e2e files fire with zero delay. We pin the timestamp on
 *    `globalThis` (a single shared object across module contexts) so the
 *    throttle is genuinely suite-wide.
 *
 * 2. **Reservation pattern** — each call advances `nextAllowedAt` to its
 *    target time *before* awaiting, so even concurrent calls (which the
 *    suite avoids today via `fileParallelism: false`, but might allow in
 *    the future) get queued slots ~500 ms apart rather than racing on a
 *    single shared timestamp.
 */
const THROTTLE_MS = 500;
const THROTTLE_KEY = Symbol.for('omophub-node:e2e:softThrottle:nextAllowedAt');
type ThrottleHost = { [THROTTLE_KEY]?: number };

export async function softThrottle(): Promise<void> {
  const host = globalThis as ThrottleHost;
  const now = Date.now();
  const targetTime = Math.max(now, (host[THROTTLE_KEY] ?? 0) + THROTTLE_MS);
  host[THROTTLE_KEY] = targetTime;
  const wait = targetTime - now;
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
}
