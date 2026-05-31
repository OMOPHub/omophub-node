import { describe, expect, test, vi } from 'vitest';
import { paginate, paginateAll } from '../../../src/common/utils/paginate.js';
import { OMOPHubIteratorError } from '../../../src/errors.js';
import type { Response as OMOPHubResponse } from '../../../src/interfaces.js';

function successPage<T>(items: T[], hasNext: boolean, page = 1, pageSize = 100) {
  return Promise.resolve({
    data: {
      data: items,
      meta: {
        pagination: {
          page,
          page_size: pageSize,
          total_items: hasNext ? page * pageSize + 1 : items.length,
          total_pages: hasNext ? page + 1 : page,
          has_next: hasNext,
          has_previous: page > 1,
        },
      },
    },
    error: null,
    meta: null,
    headers: {},
  } satisfies OMOPHubResponse<{
    data: T[];
    meta: { pagination: import('../../../src/common/interfaces/pagination.js').PaginationMeta };
  }>);
}

function errorPage(name: string, message: string, status: number | null = 500) {
  return Promise.resolve({
    data: null,
    error: { name: name as never, message, statusCode: status },
    meta: null,
    headers: {},
  } as OMOPHubResponse<never>);
}

describe('paginate (async generator)', () => {
  test('yields items across multiple pages until has_next === false', async () => {
    const fetchPage = vi
      .fn()
      .mockImplementationOnce((_p, s) => successPage([1, 2], true, 1, s))
      .mockImplementationOnce((_p, s) => successPage([3, 4], false, 2, s));

    const out: number[] = [];
    for await (const item of paginate<number>(fetchPage, { pageSize: 2 })) {
      out.push(item);
    }
    expect(out).toEqual([1, 2, 3, 4]);
    expect(fetchPage).toHaveBeenCalledTimes(2);
  });

  test('respects maxPages', async () => {
    const fetchPage = vi
      .fn()
      .mockImplementationOnce((_p, s) => successPage([1], true, 1, s))
      .mockImplementationOnce((_p, s) => successPage([2], true, 2, s))
      .mockImplementationOnce((_p, s) => successPage([3], true, 3, s));
    const out: number[] = [];
    for await (const item of paginate<number>(fetchPage, { pageSize: 1, maxPages: 2 })) {
      out.push(item);
    }
    expect(out).toEqual([1, 2]);
    expect(fetchPage).toHaveBeenCalledTimes(2);
  });

  test('throws OMOPHubIteratorError on page failure', async () => {
    const fetchPage = vi
      .fn()
      .mockImplementationOnce((_p, s) => successPage([1, 2], true, 1, s))
      .mockImplementationOnce(() => errorPage('service_unavailable', 'down', 503));

    const gen = paginate<number>(fetchPage, { pageSize: 2 });
    const collected: number[] = [];
    let caught: unknown;
    try {
      for await (const item of gen) collected.push(item);
    } catch (e) {
      caught = e;
    }
    expect(collected).toEqual([1, 2]);
    expect(caught).toBeInstanceOf(OMOPHubIteratorError);
    expect((caught as OMOPHubIteratorError).code).toBe('service_unavailable');
    expect((caught as OMOPHubIteratorError).statusCode).toBe(503);
  });

  test('stops on empty page even when has_next is true', async () => {
    const fetchPage = vi.fn().mockImplementationOnce((_p, s) => successPage([], true, 1, s));
    const out: number[] = [];
    for await (const item of paginate<number>(fetchPage, { pageSize: 2 })) out.push(item);
    expect(out).toEqual([]);
    expect(fetchPage).toHaveBeenCalledTimes(1);
  });
});

describe('paginateAll (eager collect)', () => {
  test('accumulates items across pages and returns errors as values', async () => {
    const fetchPage = vi
      .fn()
      .mockImplementationOnce((_p, s) => successPage(['a', 'b'], true, 1, s))
      .mockImplementationOnce(() => errorPage('rate_limit_exceeded', 'slow down', 429));

    const result = await paginateAll<string>(fetchPage, { pageSize: 2 });
    expect(result.data).toEqual(['a', 'b']);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]?.name).toBe('rate_limit_exceeded');
    expect(result.pagesFetched).toBe(2);
  });

  test('walks every page when no errors', async () => {
    const fetchPage = vi
      .fn()
      .mockImplementationOnce((_p, s) => successPage(['a'], true, 1, s))
      .mockImplementationOnce((_p, s) => successPage(['b'], false, 2, s));
    const result = await paginateAll<string>(fetchPage, { pageSize: 1 });
    expect(result.data).toEqual(['a', 'b']);
    expect(result.errors).toEqual([]);
    expect(result.pagesFetched).toBe(2);
  });
});

describe('hasNextPage — outer envelope pagination', () => {
  // Some endpoints return a bare `T[]` as `response.data` and carry
  // pagination on the outer `response.meta.pagination` (the canonical
  // location per SDK convention). The pagination helper must honour that
  // — earlier behaviour hard-coded arrays as non-paginated.
  function bareArrayPage<T>(items: T[], hasNext: boolean, page = 1, pageSize = 100) {
    return Promise.resolve({
      data: items,
      error: null,
      meta: {
        pagination: {
          page,
          page_size: pageSize,
          total_items: hasNext ? page * pageSize + 1 : items.length,
          total_pages: hasNext ? page + 1 : page,
          has_next: hasNext,
          has_previous: page > 1,
        },
      },
      headers: {},
    } as unknown as OMOPHubResponse<T[]>);
  }

  test('paginate walks pages when data is bare array + outer meta says has_next', async () => {
    const fetchPage = vi
      .fn()
      .mockImplementationOnce((_p, s) => bareArrayPage([1, 2], true, 1, s))
      .mockImplementationOnce((_p, s) => bareArrayPage([3, 4], false, 2, s));
    const collected: number[] = [];
    for await (const n of paginate<number>(fetchPage, { pageSize: 2 })) collected.push(n);
    expect(collected).toEqual([1, 2, 3, 4]);
    expect(fetchPage).toHaveBeenCalledTimes(2);
  });

  test('paginateAll walks pages when data is bare array + outer meta says has_next', async () => {
    const fetchPage = vi
      .fn()
      .mockImplementationOnce((_p, s) => bareArrayPage(['a', 'b'], true, 1, s))
      .mockImplementationOnce((_p, s) => bareArrayPage(['c'], false, 2, s));
    const result = await paginateAll<string>(fetchPage, { pageSize: 2 });
    expect(result.data).toEqual(['a', 'b', 'c']);
    expect(result.pagesFetched).toBe(2);
  });
});
