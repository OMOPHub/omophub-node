import { describe, expect, test } from 'vitest';
import { OMOPHub } from '../../src/client.js';
import { mockApiErrorBody, mockDomain, mockPagination } from '../fixtures/index.js';
import { createMockFetch, enqueueError, enqueueSuccess, lastCall } from '../helpers/mock-fetch.js';

describe('client.domains.list', () => {
  test('hits GET /domains', async () => {
    const fetchMock = createMockFetch();
    enqueueSuccess(fetchMock, [mockDomain()]);
    const client = new OMOPHub('oh_test', { fetch: fetchMock });
    const { data, error } = await client.domains.list();
    expect(error).toBeNull();
    expect(lastCall(fetchMock).url).toBe('https://api.omophub.com/v1/domains');
    expect(data).toEqual([mockDomain()]);
  });

  test('appends include_stats when requested', async () => {
    const fetchMock = createMockFetch();
    enqueueSuccess(fetchMock, [mockDomain()]);
    const client = new OMOPHub('oh_test', { fetch: fetchMock });
    await client.domains.list({ includeStats: true });
    expect(lastCall(fetchMock).url).toBe('https://api.omophub.com/v1/domains?include_stats=true');
  });
});

describe('client.domains.concepts', () => {
  test('hits GET /domains/{id}/concepts with snake-cased filters', async () => {
    const fetchMock = createMockFetch();
    enqueueSuccess(fetchMock, { data: [], meta: { pagination: mockPagination() } });
    const client = new OMOPHub('oh_test', { fetch: fetchMock });
    await client.domains.concepts('Condition', {
      vocabularyIds: ['SNOMED', 'ICD10CM'],
      standardOnly: true,
      includeInvalid: false,
      page: 2,
      pageSize: 50,
    });
    const { url } = lastCall(fetchMock);
    expect(url).toContain('/domains/Condition/concepts');
    expect(url).toContain('vocabulary_ids=SNOMED%2CICD10CM');
    expect(url).toContain('standard_only=true');
    expect(url).toContain('include_invalid=false');
    expect(url).toContain('page=2');
    expect(url).toContain('page_size=50');
  });

  test('URL-encodes the domain ID', async () => {
    const fetchMock = createMockFetch();
    enqueueSuccess(fetchMock, { data: [], meta: { pagination: mockPagination() } });
    const client = new OMOPHub('oh_test', { fetch: fetchMock });
    await client.domains.concepts('Drug Exposure');
    expect(lastCall(fetchMock).url).toBe(
      'https://api.omophub.com/v1/domains/Drug%20Exposure/concepts',
    );
  });

  test('returns ErrorResponse on 404 for unknown domain', async () => {
    const fetchMock = createMockFetch();
    enqueueError(fetchMock, 404, mockApiErrorBody('not_found', 'unknown domain'));
    const client = new OMOPHub('oh_test', { fetch: fetchMock, maxRetries: 0 });
    const { data, error } = await client.domains.concepts('Nope');
    expect(data).toBeNull();
    expect(error?.name).toBe('not_found');
  });
});
