export type QueryValue = string | number | boolean | string[] | number[] | null | undefined;

/**
 * Local stand-in for the DOM `HeadersInit`. Structurally compatible with
 * the global Headers constructor (provided by `@types/node` via
 * `undici-types`). Kept narrow on purpose — we surface it on
 * `PerCallOptions.headers` so consumers don't need DOM lib types.
 */
export type HeadersInit = Headers | Record<string, string> | [string, string][];

/**
 * Common options accepted by every SDK method as its trailing argument.
 * Lets callers override per-request headers, add query-string params, or
 * pass an AbortSignal without touching the client.
 */
export interface PerCallOptions {
  /** Per-call header overrides. Merged onto the client's default headers. */
  headers?: HeadersInit;
  /** Extra query-string parameters. Keys are camelCase → snake_case at the wire boundary. */
  query?: Record<string, QueryValue>;
  /** AbortSignal to cancel the request. Composed with the client's internal timeout signal. */
  signal?: AbortSignal;
}
