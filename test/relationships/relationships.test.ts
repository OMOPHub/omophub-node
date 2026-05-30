import { describe, expect, test } from 'vitest';
import { OMOPHub } from '../../src/client.js';
import { DIABETES_CONCEPT_ID } from '../fixtures/index.js';
import { createMockFetch, enqueueSuccess, lastCall } from '../helpers/mock-fetch.js';

describe('client.relationships.get', () => {
  test('hits GET /concepts/{id}/relationships', async () => {
    const fetchMock = createMockFetch();
    enqueueSuccess(fetchMock, { relationships: [] });
    const client = new OMOPHub('oh_test', { fetch: fetchMock });
    await client.relationships.get(DIABETES_CONCEPT_ID, {
      relationshipIds: ['Maps to', 'Is a'],
      standardOnly: true,
      includeReverse: false,
      page: 1,
      pageSize: 100,
      vocabRelease: '2025.1',
    });
    const { url } = lastCall(fetchMock);
    expect(url).toContain('/concepts/201826/relationships');
    expect(url).toContain('relationship_ids=Maps+to%2CIs+a');
    expect(url).toContain('standard_only=true');
    expect(url).toContain('include_reverse=false');
    expect(url).toContain('page=1');
    expect(url).toContain('page_size=100');
    expect(url).toContain('vocab_release=2025.1');
  });

  test('produces identical URL to concepts.relationships() for shared params', async () => {
    const a = createMockFetch();
    const b = createMockFetch();
    enqueueSuccess(a, { relationships: [] });
    enqueueSuccess(b, { relationships: [] });
    const sharedOpts = {
      relationshipIds: ['Maps to'],
      vocabularyIds: ['SNOMED'],
      includeReverse: true,
    };

    const clientA = new OMOPHub('oh_test', { fetch: a });
    const clientB = new OMOPHub('oh_test', { fetch: b });
    await clientA.relationships.get(DIABETES_CONCEPT_ID, sharedOpts);
    await clientB.concepts.relationships(DIABETES_CONCEPT_ID, sharedOpts);

    expect(lastCall(a).url).toBe(lastCall(b).url);
  });
});

describe('client.relationships.types', () => {
  test('hits GET /relationships/types with pagination', async () => {
    const fetchMock = createMockFetch();
    enqueueSuccess(fetchMock, { relationship_types: [] });
    const client = new OMOPHub('oh_test', { fetch: fetchMock });
    await client.relationships.types({ page: 2, pageSize: 50 });
    const { url } = lastCall(fetchMock);
    expect(url).toBe('https://api.omophub.com/v1/relationships/types?page=2&page_size=50');
  });

  test('uses no query params by default', async () => {
    const fetchMock = createMockFetch();
    enqueueSuccess(fetchMock, { relationship_types: [] });
    const client = new OMOPHub('oh_test', { fetch: fetchMock });
    await client.relationships.types();
    expect(lastCall(fetchMock).url).toBe('https://api.omophub.com/v1/relationships/types');
  });
});
