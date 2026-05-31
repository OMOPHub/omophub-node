import { OMOPHubError } from '../errors.js';

const ENV_VAR = 'OMOPHUB_API_KEY';

/**
 * Returns the API key from `process.env.OMOPHUB_API_KEY`, or `undefined`
 * if unset or running outside a Node-like runtime (Cloudflare Workers,
 * Vercel Edge, browsers without polyfills).
 */
export function getApiKey(): string | undefined {
  if (typeof process === 'undefined' || !process.env) return undefined;
  return process.env[ENV_VAR];
}

/**
 * Stores the API key in `process.env.OMOPHUB_API_KEY`. Throws
 * `OMOPHubError` in runtimes without a writable `process.env` — that's
 * an SDK misuse signal, not a network error, so it deliberately throws
 * rather than returning the discriminated error shape.
 */
export function setApiKey(key: string): void {
  if (typeof process === 'undefined' || !process.env) {
    throw new OMOPHubError('setApiKey requires a Node-like runtime with a writable process.env.');
  }
  // Reject empty / whitespace-only keys so `setApiKey` stays consistent
  // with `hasApiKey` (which returns false for empty strings).
  if (typeof key !== 'string' || key.trim().length === 0) {
    throw new OMOPHubError('setApiKey requires a non-empty key string.');
  }
  process.env[ENV_VAR] = key;
}

/**
 * Returns `true` iff `OMOPHUB_API_KEY` is set and non-empty.
 */
export function hasApiKey(): boolean {
  const k = getApiKey();
  return typeof k === 'string' && k.length > 0;
}
