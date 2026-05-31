export interface PaginationOptions {
  /** 1-based page number. Default 1. */
  page?: number;
  /** Items per page. Max 1000. Default varies per endpoint (10–100). */
  pageSize?: number;
}

/**
 * Pagination metadata returned by paginated endpoints. Field names are
 * snake_case to match the wire format — no translation applied.
 */
export interface PaginationMeta {
  page: number;
  page_size: number;
  total_items: number;
  total_pages: number;
  has_next: boolean;
  has_previous: boolean;
}

/**
 * Response shape for paginated endpoints. The data array sits at `data`;
 * pagination metadata is nested under `meta.pagination`.
 */
export interface PaginatedData<T> {
  data: T[];
  meta: { pagination: PaginationMeta };
}
