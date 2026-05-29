import { describe, expect, test } from 'vitest';
import { OMOPHub } from '../../src/client.js';
import { mockApiErrorBody, mockPagination, mockVocabulary } from '../fixtures/index.js';
import {
  createMockFetch,
  enqueueError,
  enqueueRawBody,
  enqueueSuccess,
  lastCall,
} from '../helpers/mock-fetch.js';

describe('client.vocabularies.list', () => {
  test('hits GET /vocabularies with no params by default', async () => {
    const fetchMock = createMockFetch();
    enqueueSuccess(fetchMock, { data: [mockVocabulary()], meta: { pagination: mockPagination() } });

    const client = new OMOPHub('oh_test', { fetch: fetchMock });
    const { data, error } = await client.vocabularies.list();

    expect(error).toBeNull();
    expect(data?.data).toEqual([mockVocabulary()]);
    expect(lastCall(fetchMock).url).toBe('https://api.omophub.com/v1/vocabularies');
  });

  test('serialises options as snake_case query params', async () => {
    const fetchMock = createMockFetch();
    enqueueSuccess(fetchMock, { data: [], meta: { pagination: mockPagination() } });

    const client = new OMOPHub('oh_test', { fetch: fetchMock });
    await client.vocabularies.list({
      page: 2,
      pageSize: 50,
      includeStats: true,
      includeInactive: false,
      sortBy: 'name',
      sortOrder: 'desc',
    });

    const { url } = lastCall(fetchMock);
    expect(url).toContain('page=2');
    expect(url).toContain('page_size=50');
    expect(url).toContain('include_stats=true');
    expect(url).toContain('include_inactive=false');
    expect(url).toContain('sort_by=name');
    expect(url).toContain('sort_order=desc');
  });

  test('exposes pagination metadata under data.meta.pagination', async () => {
    const fetchMock = createMockFetch();
    const pagination = mockPagination({
      page: 3,
      page_size: 10,
      total_items: 42,
      total_pages: 5,
      has_next: true,
      has_previous: true,
    });
    enqueueRawBody(fetchMock, {
      success: true,
      data: { data: [mockVocabulary()], meta: { pagination } },
      meta: { request_id: 'req_paginated' },
    });

    const client = new OMOPHub('oh_test', { fetch: fetchMock });
    const { data, meta } = await client.vocabularies.list({ page: 3, pageSize: 10 });

    expect(data?.meta.pagination).toEqual(pagination);
    expect(meta?.request_id).toBe('req_paginated');
  });

  test('returns ErrorResponse on 401', async () => {
    const fetchMock = createMockFetch();
    enqueueError(fetchMock, 401, mockApiErrorBody('invalid_api_key', 'bad key'));

    const client = new OMOPHub('oh_test', { fetch: fetchMock, maxRetries: 0 });
    const { data, error } = await client.vocabularies.list();

    expect(data).toBeNull();
    expect(error?.name).toBe('invalid_api_key');
    expect(error?.statusCode).toBe(401);
  });

  test('per-call query overrides spread onto the request', async () => {
    const fetchMock = createMockFetch();
    enqueueSuccess(fetchMock, { data: [], meta: { pagination: mockPagination() } });

    const client = new OMOPHub('oh_test', { fetch: fetchMock });
    await client.vocabularies.list(
      { pageSize: 10 },
      { query: { vocab_release: '2025.1', trace: true } },
    );

    const { url } = lastCall(fetchMock);
    expect(url).toContain('page_size=10');
    expect(url).toContain('vocab_release=2025.1');
    expect(url).toContain('trace=true');
  });
});
