import { describe, expect, test } from 'vitest';
import { OMOPHub } from '../../src/client.js';
import { DIABETES_CONCEPT_ID, mockApiErrorBody } from '../fixtures/index.js';
import { createMockFetch, enqueueError, enqueueSuccess, lastCall } from '../helpers/mock-fetch.js';

describe('client.hierarchy.get', () => {
  test('hits GET /concepts/{id}/hierarchy', async () => {
    const fetchMock = createMockFetch();
    enqueueSuccess(fetchMock, { concepts: [] });
    const client = new OMOPHub('oh_test', { fetch: fetchMock });
    await client.hierarchy.get(DIABETES_CONCEPT_ID);
    expect(lastCall(fetchMock).url).toBe('https://api.omophub.com/v1/concepts/201826/hierarchy');
  });

  test('snake-cases format, vocabularyIds, maxLevels, relationshipTypes, includeInvalid', async () => {
    const fetchMock = createMockFetch();
    enqueueSuccess(fetchMock, { nodes: [], edges: [] });
    const client = new OMOPHub('oh_test', { fetch: fetchMock });
    await client.hierarchy.get(DIABETES_CONCEPT_ID, {
      format: 'graph',
      vocabularyIds: ['SNOMED', 'ICD10CM'],
      maxLevels: 5,
      relationshipTypes: ['Is a'],
      includeInvalid: false,
    });
    const { url } = lastCall(fetchMock);
    expect(url).toContain('format=graph');
    expect(url).toContain('vocabulary_ids=SNOMED%2CICD10CM');
    expect(url).toContain('max_levels=5');
    expect(url).toContain('relationship_types=Is+a');
    expect(url).toContain('include_invalid=false');
  });
});

describe('client.hierarchy.ancestors', () => {
  test('hits GET /concepts/{id}/ancestors with pagination + flags', async () => {
    const fetchMock = createMockFetch();
    enqueueSuccess(fetchMock, { ancestors: [] });
    const client = new OMOPHub('oh_test', { fetch: fetchMock });
    await client.hierarchy.ancestors(DIABETES_CONCEPT_ID, {
      vocabularyIds: ['SNOMED'],
      maxLevels: 10,
      includePaths: true,
      includeDistance: true,
      page: 2,
      pageSize: 50,
    });
    const { url } = lastCall(fetchMock);
    expect(url).toContain('/concepts/201826/ancestors');
    expect(url).toContain('vocabulary_ids=SNOMED');
    expect(url).toContain('max_levels=10');
    expect(url).toContain('include_paths=true');
    expect(url).toContain('include_distance=true');
    expect(url).toContain('page=2');
    expect(url).toContain('page_size=50');
  });
});

describe('client.hierarchy.descendants', () => {
  test('hits GET /concepts/{id}/descendants', async () => {
    const fetchMock = createMockFetch();
    enqueueSuccess(fetchMock, { descendants: [] });
    const client = new OMOPHub('oh_test', { fetch: fetchMock });
    await client.hierarchy.descendants(DIABETES_CONCEPT_ID, {
      maxLevels: 3,
      domainIds: ['Condition'],
      includeDistance: false,
    });
    const { url } = lastCall(fetchMock);
    expect(url).toContain('/concepts/201826/descendants');
    expect(url).toContain('max_levels=3');
    expect(url).toContain('domain_ids=Condition');
    expect(url).toContain('include_distance=false');
  });

  test('returns ErrorResponse on 404', async () => {
    const fetchMock = createMockFetch();
    enqueueError(fetchMock, 404, mockApiErrorBody('not_found', 'concept missing'));
    const client = new OMOPHub('oh_test', { fetch: fetchMock, maxRetries: 0 });
    const { data, error } = await client.hierarchy.descendants(9_999_999);
    expect(data).toBeNull();
    expect(error?.name).toBe('not_found');
  });
});
