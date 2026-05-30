import type { HeadersInit } from '../interfaces/per-call-options.js';

/**
 * Returns a new Headers object with `extra` merged onto `base`. Keys in
 * `extra` overwrite keys in `base`. Neither input is mutated.
 */
export function mergeHeaders(base: Headers, extra: HeadersInit | undefined): Headers {
  if (!extra) return new Headers(base);
  const merged = new Headers(base);
  const incoming = new Headers(extra);
  incoming.forEach((value, key) => {
    merged.set(key, value);
  });
  return merged;
}
