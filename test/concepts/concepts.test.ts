import { describe, expect, test } from 'vitest';
import { OMOPHub } from '../../src/client.js';
import {
  DIABETES_CONCEPT_ID,
  mockApiErrorBody,
  mockConcept,
  mockPagination,
} from '../fixtures/index.js';
import { createMockFetch, enqueueError, enqueueSuccess, lastCall } from '../helpers/mock-fetch.js';

describe('client.concepts.get', () => {
  test('hits GET /concepts/{id}', async () => {
    const fetchMock = createMockFetch();
    enqueueSuccess(fetchMock, mockConcept());
    const client = new OMOPHub('oh_test', { fetch: fetchMock });
    const { data, error } = await client.concepts.get(DIABETES_CONCEPT_ID);
    expect(error).toBeNull();
    expect(data?.concept_id).toBe(DIABETES_CONCEPT_ID);
    expect(lastCall(fetchMock).url).toBe('https://api.omophub.com/v1/concepts/201826');
  });

  test('accepts concept_id = 0 (the unmapped sentinel; R-SDK bug fix)', async () => {
    const fetchMock = createMockFetch();
    enqueueSuccess(fetchMock, mockConcept({ concept_id: 0, concept_name: 'No matching concept' }));
    const client = new OMOPHub('oh_test', { fetch: fetchMock });
    const { error } = await client.concepts.get(0);
    expect(error).toBeNull();
    expect(lastCall(fetchMock).url).toBe('https://api.omophub.com/v1/concepts/0');
  });

  test('serialises include_* flags + vocab_release as snake-case query params', async () => {
    const fetchMock = createMockFetch();
    enqueueSuccess(fetchMock, mockConcept());
    const client = new OMOPHub('oh_test', { fetch: fetchMock });
    await client.concepts.get(DIABETES_CONCEPT_ID, {
      includeRelationships: true,
      includeSynonyms: true,
      includeHierarchy: false,
      vocabRelease: '2025.1',
    });
    const { url } = lastCall(fetchMock);
    expect(url).toContain('include_relationships=true');
    expect(url).toContain('include_synonyms=true');
    expect(url).toContain('include_hierarchy=false');
    expect(url).toContain('vocab_release=2025.1');
  });

  test('returns ErrorResponse on 404', async () => {
    const fetchMock = createMockFetch();
    enqueueError(fetchMock, 404, mockApiErrorBody('not_found', 'concept missing'));
    const client = new OMOPHub('oh_test', { fetch: fetchMock, maxRetries: 0 });
    const { data, error } = await client.concepts.get(9_999_999);
    expect(data).toBeNull();
    expect(error?.name).toBe('not_found');
  });
});

describe('client.concepts.getByCode', () => {
  test('hits GET /concepts/by-code/{vocab}/{code} with URL-encoding', async () => {
    const fetchMock = createMockFetch();
    enqueueSuccess(fetchMock, mockConcept());
    const client = new OMOPHub('oh_test', { fetch: fetchMock });
    await client.concepts.getByCode('SNOMED', '44054006');
    expect(lastCall(fetchMock).url).toBe(
      'https://api.omophub.com/v1/concepts/by-code/SNOMED/44054006',
    );
  });

  test('URL-encodes a concept_code that contains a slash', async () => {
    const fetchMock = createMockFetch();
    enqueueSuccess(fetchMock, mockConcept());
    const client = new OMOPHub('oh_test', { fetch: fetchMock });
    await client.concepts.getByCode('LOINC', '8480-6/8462-4');
    expect(lastCall(fetchMock).url).toBe(
      'https://api.omophub.com/v1/concepts/by-code/LOINC/8480-6%2F8462-4',
    );
  });
});

describe('client.concepts.batch', () => {
  test('hits POST /concepts/batch with snake-cased body', async () => {
    const fetchMock = createMockFetch();
    enqueueSuccess(fetchMock, { concepts: [mockConcept()] });
    const client = new OMOPHub('oh_test', { fetch: fetchMock });
    await client.concepts.batch({
      conceptIds: [201826, 1112807],
      includeRelationships: true,
      vocabularyFilter: ['SNOMED', 'RxNorm'],
      standardOnly: false,
    });
    const { init } = lastCall(fetchMock);
    expect(init.method).toBe('POST');
    const body = JSON.parse(init.body as string);
    expect(body).toEqual({
      concept_ids: [201826, 1112807],
      include_relationships: true,
      vocabulary_filter: ['SNOMED', 'RxNorm'],
      standard_only: false,
    });
  });

  test('rejects empty conceptIds synthetically without hitting the network', async () => {
    const fetchMock = createMockFetch();
    const client = new OMOPHub('oh_test', { fetch: fetchMock });
    const { data, error } = await client.concepts.batch({ conceptIds: [] });
    expect(data).toBeNull();
    expect(error?.name).toBe('validation_error');
    expect(error?.message).toMatch(/1–100/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test('rejects >100 conceptIds synthetically', async () => {
    const fetchMock = createMockFetch();
    const client = new OMOPHub('oh_test', { fetch: fetchMock });
    const tooMany = Array.from({ length: 101 }, (_, i) => i + 1);
    const { error } = await client.concepts.batch({ conceptIds: tooMany });
    expect(error?.name).toBe('validation_error');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test('returns validation_error (not TypeError) when JS caller omits conceptIds', async () => {
    const fetchMock = createMockFetch();
    const client = new OMOPHub('oh_test', { fetch: fetchMock });
    // Simulates a JS caller / `as any` user passing a malformed payload.
    const { data, error } = await client.concepts.batch(
      {} as unknown as Parameters<typeof client.concepts.batch>[0],
    );
    expect(data).toBeNull();
    expect(error?.name).toBe('validation_error');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test('returns validation_error when conceptIds is not an array', async () => {
    const fetchMock = createMockFetch();
    const client = new OMOPHub('oh_test', { fetch: fetchMock });
    const { error } = await client.concepts.batch({
      conceptIds: 'not-an-array' as unknown as number[],
    });
    expect(error?.name).toBe('validation_error');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test('forwards idempotencyKey to the Idempotency-Key header', async () => {
    const fetchMock = createMockFetch();
    enqueueSuccess(fetchMock, { concepts: [] });
    const client = new OMOPHub('oh_test', { fetch: fetchMock });
    await client.concepts.batch({
      conceptIds: [1],
      idempotencyKey: 'idem_batch_1',
    });
    expect(new Headers(lastCall(fetchMock).init.headers).get('idempotency-key')).toBe(
      'idem_batch_1',
    );
  });
});

describe('client.concepts.suggest', () => {
  test('hits GET /concepts/suggest with paginated query', async () => {
    const fetchMock = createMockFetch();
    enqueueSuccess(fetchMock, {
      data: [{ suggestion: 'diabetes', concept_id: 201826 }],
      meta: { pagination: mockPagination() },
    });
    const client = new OMOPHub('oh_test', { fetch: fetchMock });
    await client.concepts.suggest('diab', {
      pageSize: 5,
      vocabularyIds: ['SNOMED'],
    });
    const { url } = lastCall(fetchMock);
    expect(url).toContain('/concepts/suggest');
    expect(url).toContain('query=diab');
    expect(url).toContain('page_size=5');
    expect(url).toContain('vocabulary_ids=SNOMED');
  });
});

describe('client.concepts.related', () => {
  test('hits GET /concepts/{id}/related', async () => {
    const fetchMock = createMockFetch();
    enqueueSuccess(fetchMock, { related_concepts: [] });
    const client = new OMOPHub('oh_test', { fetch: fetchMock });
    await client.concepts.related(201826, {
      relationshipTypes: ['Maps to', 'Is a'],
      minScore: 0.5,
      pageSize: 20,
    });
    const { url } = lastCall(fetchMock);
    expect(url).toContain('/concepts/201826/related');
    expect(url).toContain('relationship_types=Maps+to%2CIs+a');
    expect(url).toContain('min_score=0.5');
  });
});

describe('client.concepts.relationships', () => {
  test('hits GET /concepts/{id}/relationships (shared endpoint with relationships.get)', async () => {
    const fetchMock = createMockFetch();
    enqueueSuccess(fetchMock, { relationships: [] });
    const client = new OMOPHub('oh_test', { fetch: fetchMock });
    await client.concepts.relationships(201826, {
      relationshipIds: ['Maps to'],
      standardOnly: true,
      includeReverse: true,
    });
    const { url } = lastCall(fetchMock);
    expect(url).toContain('/concepts/201826/relationships');
    expect(url).toContain('relationship_ids=Maps+to');
    expect(url).toContain('standard_only=true');
    expect(url).toContain('include_reverse=true');
  });
});

describe('client.concepts.recommended', () => {
  test('hits POST /concepts/recommended with body + page query params', async () => {
    const fetchMock = createMockFetch();
    enqueueSuccess(fetchMock, { recommendations: [] });
    const client = new OMOPHub('oh_test', { fetch: fetchMock });
    await client.concepts.recommended({
      conceptIds: [201826],
      relationshipTypes: ['Is a'],
      standardOnly: true,
      page: 1,
      pageSize: 100,
    });
    const { url, init } = lastCall(fetchMock);
    expect(init.method).toBe('POST');
    expect(url).toContain('page=1');
    expect(url).toContain('page_size=100');
    const body = JSON.parse(init.body as string);
    expect(body.concept_ids).toEqual([201826]);
    expect(body.relationship_types).toEqual(['Is a']);
    expect(body.standard_only).toBe(true);
  });

  test('rejects >100 conceptIds, >20 relationshipTypes, >50 vocab/domain ids synthetically', async () => {
    const fetchMock = createMockFetch();
    const client = new OMOPHub('oh_test', { fetch: fetchMock });

    expect((await client.concepts.recommended({ conceptIds: [] })).error?.name).toBe(
      'validation_error',
    );

    // JS-caller path: conceptIds missing entirely.
    expect(
      (
        await client.concepts.recommended(
          {} as unknown as Parameters<typeof client.concepts.recommended>[0],
        )
      ).error?.name,
    ).toBe('validation_error');

    expect(
      (
        await client.concepts.recommended({
          conceptIds: [1],
          relationshipTypes: Array.from({ length: 21 }, (_, i) => `r${i}`),
        })
      ).error?.message,
    ).toMatch(/relationshipTypes.*20/);

    expect(
      (
        await client.concepts.recommended({
          conceptIds: [1],
          vocabularyIds: Array.from({ length: 51 }, (_, i) => `v${i}`),
        })
      ).error?.message,
    ).toMatch(/vocabularyIds.*50/);

    expect(
      (
        await client.concepts.recommended({
          conceptIds: [1],
          domainIds: Array.from({ length: 51 }, (_, i) => `d${i}`),
        })
      ).error?.message,
    ).toMatch(/domainIds.*50/);

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
