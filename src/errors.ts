import type { OMOPHUB_ERROR_CODE_KEY } from './interfaces.js';

/**
 * Thrown only on SDK misuse (e.g. missing API key at construction time).
 * Network failures and API errors return through the discriminated
 * `Response<T>` shape — they are never thrown.
 */
export class OMOPHubError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OMOPHubError';
  }
}

/**
 * Thrown from async iterators when a page fetch fails. Async generators
 * cannot gracefully yield a discriminated `{ data, error }` union, so
 * iterators throw and `*All` variants accumulate.
 */
export class OMOPHubIteratorError extends Error {
  readonly statusCode: number | null;
  readonly code: OMOPHUB_ERROR_CODE_KEY;

  constructor(message: string, statusCode: number | null, code: OMOPHUB_ERROR_CODE_KEY) {
    super(message);
    this.name = 'OMOPHubIteratorError';
    this.statusCode = statusCode;
    this.code = code;
  }
}
