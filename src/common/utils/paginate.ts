import { OMOPHubIteratorError } from '../../errors.js';
import type { ErrorResponse, Response as OMOPHubResponse } from '../../interfaces.js';
import type { PaginatedData } from '../interfaces/pagination.js';

/**
 * A page-fetching closure. Resource methods adapt their own typed
 * options into this generic shape so `paginate` / `paginateAll` stay
 * resource-agnostic.
 *
 * The returned envelope may be a `PaginatedData<T>` (preferred — gives us
 * `has_next`) OR a bare `T[]` (legacy / non-paginated endpoints — stop
 * after one page).
 */
export type PageFetcher<T> = (
  page: number,
  pageSize: number,
) => Promise<OMOPHubResponse<PaginatedData<T> | T[]>>;

export interface PaginateAllResult<T> {
  data: T[];
  errors: ErrorResponse[];
  pagesFetched: number;
}

/**
 * Async generator that yields each item across pages.
 *
 * Throws `OMOPHubIteratorError` (wrapping the page's `ErrorResponse`)
 * the first time a page fetch fails — async generators can't gracefully
 * yield a discriminated `{ data, error }` union, so they throw and the
 * eager `paginateAll` variant accumulates errors as values for callers
 * who prefer that style.
 */
export async function* paginate<T>(
  fetchPage: PageFetcher<T>,
  options: { startPage?: number; pageSize?: number; maxPages?: number } = {},
): AsyncGenerator<T> {
  const startPage = options.startPage ?? 1;
  const pageSize = options.pageSize ?? 100;
  const maxPages = options.maxPages ?? Number.POSITIVE_INFINITY;

  let page = startPage;
  let pagesYielded = 0;
  while (pagesYielded < maxPages) {
    const response = await fetchPage(page, pageSize);
    if (response.error) {
      throw new OMOPHubIteratorError(
        response.error.message,
        response.error.statusCode,
        response.error.name,
      );
    }
    const items = extractItems(response.data);
    if (items.length === 0) return;
    for (const item of items) yield item;
    pagesYielded++;

    if (!hasNextPage(response)) return;
    page++;
  }
}

/**
 * Eagerly walks every page, collecting items into an array. Errors are
 * accumulated rather than thrown — caller decides what to do with a
 * partial result.
 */
export async function paginateAll<T>(
  fetchPage: PageFetcher<T>,
  options: { startPage?: number; pageSize?: number; maxPages?: number } = {},
): Promise<PaginateAllResult<T>> {
  const startPage = options.startPage ?? 1;
  const pageSize = options.pageSize ?? 100;
  const maxPages = options.maxPages ?? Number.POSITIVE_INFINITY;

  const collected: T[] = [];
  const errors: ErrorResponse[] = [];
  let pagesFetched = 0;
  let page = startPage;

  while (pagesFetched < maxPages) {
    const response = await fetchPage(page, pageSize);
    pagesFetched++;
    if (response.error) {
      errors.push(response.error);
      return { data: collected, errors, pagesFetched };
    }
    const items = extractItems(response.data);
    collected.push(...items);
    if (items.length === 0 || !hasNextPage(response)) {
      return { data: collected, errors, pagesFetched };
    }
    page++;
  }
  return { data: collected, errors, pagesFetched };
}

function extractItems<T>(data: PaginatedData<T> | T[] | null): T[] {
  if (data === null) return [];
  if (Array.isArray(data)) return data;
  return data.data;
}

function hasNextPage<T>(response: OMOPHubResponse<PaginatedData<T> | T[]>): boolean {
  // Canonical location per SDK convention — `meta.pagination` always lives
  // on the outer envelope. Resource methods that pre-wrap their data into
  // a `PaginatedData` shape are handled by the fallback below.
  const outerHasNext = response.meta?.pagination?.has_next;
  if (outerHasNext === true) return true;
  if (outerHasNext === false) return false;
  // Fallback: data-internal pagination (legacy / pre-wrapped callers).
  const data = response.data;
  if (!data || Array.isArray(data)) return false;
  return data.meta.pagination.has_next === true;
}
