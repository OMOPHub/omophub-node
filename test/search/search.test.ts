import { describe, expect, test } from 'vitest';
import { OMOPHub } from '../../src/client.js';
import { OMOPHubIteratorError } from '../../src/errors.js';
import {
  DIABETES_CONCEPT_ID,
  mockApiErrorBody,
  mockConcept,
  mockPagination,
} from '../fixtures/index.js';
import {
  createMockFetch,
  enqueueError,
  enqueueRawBody,
  enqueueSuccess,
  lastCall,
} from '../helpers/mock-fetch.js';

describe('client.search.basic', () => {
  test('hits GET /search/concepts with snake-cased filters', async () => {
    const fetchMock = createMockFetch();
    enqueueSuccess(fetchMock, { concepts: [mockConcept()] });

    const client = new OMOPHub('oh_test', { fetch: fetchMock });
    const { data, error } = await client.search.basic('diabetes', {
      vocabularyIds: ['SNOMED', 'ICD10CM'],
      domainIds: ['Condition'],
      standardConcept: 'S',
      pageSize: 50,
      sortBy: 'relevance',
    });

    expect(error).toBeNull();
    expect(data?.concepts).toEqual([mockConcept()]);
    const { url } = lastCall(fetchMock);
    expect(url).toContain('/search/concepts');
    expect(url).toContain('query=diabetes');
    expect(url).toContain('vocabulary_ids=SNOMED%2CICD10CM');
    expect(url).toContain('domain_ids=Condition');
    expect(url).toContain('standard_concept=S');
    expect(url).toContain('page_size=50');
    expect(url).toContain('sort_by=relevance');
  });

  test('normalises legacy { data: [...] } shape into { concepts }', async () => {
    const fetchMock = createMockFetch();
    enqueueSuccess(fetchMock, { data: [mockConcept()] });

    const client = new OMOPHub('oh_test', { fetch: fetchMock });
    const { data } = await client.search.basic('diabetes');
    expect(data?.concepts).toEqual([mockConcept()]);
  });

  test('normalises bare-array response into { concepts }', async () => {
    const fetchMock = createMockFetch();
    enqueueSuccess(fetchMock, [mockConcept()]);

    const client = new OMOPHub('oh_test', { fetch: fetchMock });
    const { data } = await client.search.basic('diabetes');
    expect(data?.concepts).toEqual([mockConcept()]);
  });

  test('positional `query` wins over options.query.query', async () => {
    const fetchMock = createMockFetch();
    enqueueSuccess(fetchMock, { concepts: [] });
    const client = new OMOPHub('oh_test', { fetch: fetchMock });
    await client.search.basic('aspirin', {
      query: { query: 'override-attempt', trace: 'on' },
    });
    const { url } = lastCall(fetchMock);
    expect(url).toContain('query=aspirin');
    expect(url).not.toContain('query=override-attempt');
    expect(url).toContain('trace=on');
  });

  test('returns ErrorResponse on 404', async () => {
    const fetchMock = createMockFetch();
    enqueueError(fetchMock, 404, mockApiErrorBody('not_found', 'no results'));
    const client = new OMOPHub('oh_test', { fetch: fetchMock, maxRetries: 0 });
    const { data, error } = await client.search.basic('zzz-not-found');
    expect(data).toBeNull();
    expect(error?.name).toBe('not_found');
  });
});

describe('client.search.basicIter', () => {
  test('yields concepts across multiple pages', async () => {
    const fetchMock = createMockFetch();
    enqueueRawBody(fetchMock, {
      success: true,
      data: {
        concepts: [mockConcept({ concept_id: 1 }), mockConcept({ concept_id: 2 })],
      },
      meta: { pagination: mockPagination({ page: 1, page_size: 2, has_next: true }) },
    });
    enqueueRawBody(fetchMock, {
      success: true,
      data: {
        concepts: [mockConcept({ concept_id: 3 })],
      },
      meta: { pagination: mockPagination({ page: 2, page_size: 2, has_next: false }) },
    });

    const client = new OMOPHub('oh_test', { fetch: fetchMock });
    const out: number[] = [];
    for await (const c of client.search.basicIter('diabetes', { pageSize: 2 })) {
      out.push(c.concept_id);
    }
    expect(out).toEqual([1, 2, 3]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  test('throws OMOPHubIteratorError when a page fails', async () => {
    const fetchMock = createMockFetch();
    enqueueRawBody(fetchMock, {
      success: true,
      data: { concepts: [mockConcept()] },
      meta: { pagination: mockPagination({ has_next: true }) },
    });
    enqueueError(fetchMock, 503);

    const client = new OMOPHub('oh_test', { fetch: fetchMock, maxRetries: 0 });
    const out: number[] = [];
    let caught: unknown;
    try {
      for await (const c of client.search.basicIter('diabetes', { pageSize: 1 })) {
        out.push(c.concept_id);
      }
    } catch (e) {
      caught = e;
    }
    expect(out).toEqual([DIABETES_CONCEPT_ID]);
    expect(caught).toBeInstanceOf(OMOPHubIteratorError);
    expect((caught as OMOPHubIteratorError).code).toBe('service_unavailable');
  });
});

describe('client.search.basicAll', () => {
  test('collects across pages into a flat data array', async () => {
    const fetchMock = createMockFetch();
    enqueueRawBody(fetchMock, {
      success: true,
      data: { concepts: [mockConcept({ concept_id: 1 })] },
      meta: { pagination: mockPagination({ page: 1, page_size: 1, has_next: true }) },
    });
    enqueueRawBody(fetchMock, {
      success: true,
      data: { concepts: [mockConcept({ concept_id: 2 })] },
      meta: { pagination: mockPagination({ page: 2, page_size: 1, has_next: false }) },
    });

    const client = new OMOPHub('oh_test', { fetch: fetchMock });
    const { data, errors, pagesFetched } = await client.search.basicAll('diabetes', {
      pageSize: 1,
    });
    expect(data.map((c) => c.concept_id)).toEqual([1, 2]);
    expect(errors).toEqual([]);
    expect(pagesFetched).toBe(2);
  });

  test('respects maxPages', async () => {
    const fetchMock = createMockFetch();
    enqueueRawBody(fetchMock, {
      success: true,
      data: { concepts: [mockConcept({ concept_id: 1 })] },
      meta: { pagination: mockPagination({ page: 1, page_size: 1, has_next: true }) },
    });

    const client = new OMOPHub('oh_test', { fetch: fetchMock });
    const { pagesFetched } = await client.search.basicAll('diabetes', {
      pageSize: 1,
      maxPages: 1,
    });
    expect(pagesFetched).toBe(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe('client.search.advanced', () => {
  test('hits POST /search/advanced with snake-cased body', async () => {
    const fetchMock = createMockFetch();
    enqueueSuccess(fetchMock, { concepts: [mockConcept()] });
    const client = new OMOPHub('oh_test', { fetch: fetchMock });
    await client.search.advanced('diabetes type 2', {
      vocabularyIds: ['SNOMED'],
      standardConceptsOnly: true,
      relationshipFilters: [{ relationship_id: 'Is a' }],
    });
    const { init } = lastCall(fetchMock);
    expect(init.method).toBe('POST');
    const body = JSON.parse(init.body as string);
    expect(body).toEqual({
      query: 'diabetes type 2',
      vocabulary_ids: ['SNOMED'],
      standard_concepts_only: true,
      relationship_filters: [{ relationship_id: 'Is a' }],
    });
  });
});

describe('client.search.autocomplete', () => {
  test('hits GET /search/suggest with positional query', async () => {
    const fetchMock = createMockFetch();
    enqueueSuccess(fetchMock, [{ suggestion: 'diabetes', concept_id: 201826 }]);
    const client = new OMOPHub('oh_test', { fetch: fetchMock });
    const { data, error } = await client.search.autocomplete('diab', {
      vocabularyIds: ['SNOMED'],
      pageSize: 5,
    });
    expect(error).toBeNull();
    expect(data).toEqual([{ suggestion: 'diabetes', concept_id: 201826 }]);
    const { url } = lastCall(fetchMock);
    expect(url).toContain('/search/suggest');
    expect(url).toContain('query=diab');
    expect(url).toContain('vocabulary_ids=SNOMED');
    expect(url).toContain('page_size=5');
  });
});

describe('client.search.semantic', () => {
  test('hits GET /concepts/semantic-search with snake-cased query', async () => {
    const fetchMock = createMockFetch();
    enqueueSuccess(fetchMock, { results: [], search_metadata: {} });
    const client = new OMOPHub('oh_test', { fetch: fetchMock });
    await client.search.semantic('high blood sugar', {
      vocabularyIds: ['SNOMED'],
      standardConcept: 'S',
      threshold: 0.85,
      pageSize: 20,
    });
    const { url } = lastCall(fetchMock);
    expect(url).toContain('/concepts/semantic-search');
    expect(url).toContain('query=high+blood+sugar');
    expect(url).toContain('vocabulary_ids=SNOMED');
    expect(url).toContain('standard_concept=S');
    expect(url).toContain('threshold=0.85');
  });
});

describe('client.search.semanticIter', () => {
  test('yields semantic results across pages, unwrapping the { results: [...] } shape', async () => {
    const fetchMock = createMockFetch();
    enqueueRawBody(fetchMock, {
      success: true,
      data: {
        results: [
          {
            concept_id: 1,
            concept_name: 'A',
            vocabulary_id: 'X',
            concept_code: 'a',
            similarity_score: 0.9,
          },
        ],
      },
      meta: { pagination: mockPagination({ page: 1, page_size: 1, has_next: true }) },
    });
    enqueueRawBody(fetchMock, {
      success: true,
      data: {
        results: [
          {
            concept_id: 2,
            concept_name: 'B',
            vocabulary_id: 'X',
            concept_code: 'b',
            similarity_score: 0.8,
          },
        ],
      },
      meta: { pagination: mockPagination({ page: 2, page_size: 1, has_next: false }) },
    });

    const client = new OMOPHub('oh_test', { fetch: fetchMock });
    const out: number[] = [];
    for await (const r of client.search.semanticIter('blood sugar', { pageSize: 1 })) {
      out.push(r.concept_id);
    }
    expect(out).toEqual([1, 2]);
  });
});

describe('client.search.bulkBasic', () => {
  test('hits POST /search/bulk with snake-cased body', async () => {
    const fetchMock = createMockFetch();
    enqueueSuccess(fetchMock, {
      results: [],
      total_searches: 2,
      completed_searches: 2,
      failed_searches: 0,
    });
    const client = new OMOPHub('oh_test', { fetch: fetchMock });
    await client.search.bulkBasic(
      [
        { search_id: 'q1', query: 'diabetes' },
        { search_id: 'q2', query: 'hypertension' },
      ],
      { defaults: { vocabulary_ids: ['SNOMED'], page_size: 5 } },
    );
    const { init } = lastCall(fetchMock);
    expect(init.method).toBe('POST');
    const body = JSON.parse(init.body as string);
    expect(body.searches).toHaveLength(2);
    expect(body.searches[0]).toEqual({ search_id: 'q1', query: 'diabetes' });
    expect(body.defaults).toEqual({ vocabulary_ids: ['SNOMED'], page_size: 5 });
  });

  test('rejects >50 searches synthetically', async () => {
    const fetchMock = createMockFetch();
    const client = new OMOPHub('oh_test', { fetch: fetchMock });
    const tooMany = Array.from({ length: 51 }, (_, i) => ({
      search_id: `q${i}`,
      query: `${i}`,
    }));
    const { error } = await client.search.bulkBasic(tooMany);
    expect(error?.name).toBe('validation_error');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test('rejects empty searches synthetically', async () => {
    const fetchMock = createMockFetch();
    const client = new OMOPHub('oh_test', { fetch: fetchMock });
    const { error } = await client.search.bulkBasic([]);
    expect(error?.name).toBe('validation_error');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('client.search.bulkSemantic', () => {
  test('hits POST /search/semantic-bulk with snake-cased body', async () => {
    const fetchMock = createMockFetch();
    enqueueSuccess(fetchMock, {
      results: [],
      total_searches: 1,
      completed_count: 1,
      failed_count: 0,
    });
    const client = new OMOPHub('oh_test', { fetch: fetchMock });
    await client.search.bulkSemantic([{ search_id: 'sq1', query: 'blood sugar', threshold: 0.8 }]);
    const { init } = lastCall(fetchMock);
    expect(init.method).toBe('POST');
    const body = JSON.parse(init.body as string);
    expect(body.searches[0].threshold).toBe(0.8);
  });

  test('rejects >25 searches synthetically (lower cap than bulkBasic)', async () => {
    const fetchMock = createMockFetch();
    const client = new OMOPHub('oh_test', { fetch: fetchMock });
    const tooMany = Array.from({ length: 26 }, (_, i) => ({
      search_id: `q${i}`,
      query: `${i}`,
    }));
    const { error } = await client.search.bulkSemantic(tooMany);
    expect(error?.name).toBe('validation_error');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('client.search.similar', () => {
  test('hits POST /search/similar with conceptId variant', async () => {
    const fetchMock = createMockFetch();
    enqueueSuccess(fetchMock, {
      similar_concepts: [],
      search_metadata: {
        original_query: '201826',
        algorithm_used: 'hybrid',
        similarity_threshold: 0.7,
        total_candidates: 0,
        results_returned: 0,
        processing_time_ms: 1,
      },
    });
    const client = new OMOPHub('oh_test', { fetch: fetchMock });
    await client.search.similar({ conceptId: 201826, algorithm: 'hybrid' });
    const { init } = lastCall(fetchMock);
    expect(init.method).toBe('POST');
    const body = JSON.parse(init.body as string);
    expect(body).toEqual({ concept_id: 201826, algorithm: 'hybrid' });
  });

  test('accepts conceptName variant', async () => {
    const fetchMock = createMockFetch();
    enqueueSuccess(fetchMock, {
      similar_concepts: [],
      search_metadata: {
        original_query: 'diabetes',
        algorithm_used: 'semantic',
        similarity_threshold: 0.7,
        total_candidates: 0,
        results_returned: 0,
        processing_time_ms: 1,
      },
    });
    const client = new OMOPHub('oh_test', { fetch: fetchMock });
    await client.search.similar({ conceptName: 'diabetes', algorithm: 'semantic' });
    const body = JSON.parse(lastCall(fetchMock).init.body as string);
    expect(body.concept_name).toBe('diabetes');
  });

  test('accepts query variant', async () => {
    const fetchMock = createMockFetch();
    enqueueSuccess(fetchMock, {
      similar_concepts: [],
      search_metadata: {
        original_query: 'high blood sugar',
        algorithm_used: 'hybrid',
        similarity_threshold: 0.7,
        total_candidates: 0,
        results_returned: 0,
        processing_time_ms: 1,
      },
    });
    const client = new OMOPHub('oh_test', { fetch: fetchMock });
    await client.search.similar({ query: 'high blood sugar' });
    const body = JSON.parse(lastCall(fetchMock).init.body as string);
    expect(body.query).toBe('high blood sugar');
  });

  test('rejects zero-of XOR options synthetically', async () => {
    const fetchMock = createMockFetch();
    const client = new OMOPHub('oh_test', { fetch: fetchMock });
    // Cast through unknown — TS would normally reject this at compile time.
    const { error } = await client.search.similar(
      {} as unknown as Parameters<typeof client.search.similar>[0],
    );
    expect(error?.name).toBe('missing_required_field');
    expect(error?.message).toMatch(/exactly one/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test('rejects multiple-of XOR options synthetically', async () => {
    const fetchMock = createMockFetch();
    const client = new OMOPHub('oh_test', { fetch: fetchMock });
    const { error } = await client.search.similar({
      conceptId: 1,
      conceptName: 'x',
    } as unknown as Parameters<typeof client.search.similar>[0]);
    expect(error?.name).toBe('missing_required_field');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
