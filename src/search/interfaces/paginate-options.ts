/**
 * Per-call knobs for the `*Iter` and `*All` paginating variants.
 * - `pageSize`: items requested per page (defaults to 100 for the iter helpers).
 * - `maxPages`: hard stop on pages fetched, regardless of `has_next`.
 */
export interface PaginateOptions {
  pageSize?: number;
  maxPages?: number;
}
