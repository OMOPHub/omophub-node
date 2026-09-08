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
      relationshipFilters: [{ relationshipId: 'Is a', targetConceptId: 201826 }],
    });
    const { init } = lastCall(fetchMock);
    expect(init.method).toBe('POST');
    const body = JSON.parse(init.body as string);
    expect(body).toEqual({
      query: 'diabetes type 2',
      vocabulary_ids: ['SNOMED'],
      standard_concepts_only: true,
      relationship_filters: [{ relationship_id: 'Is a', target_concept_id: 201826 }],
    });
  });
});

describe('client.search.autocomplete', () => {
  test('hits GET /search/autocomplete with positional query', async () => {
    const fetchMock = createMockFetch();
    enqueueSuccess(fetchMock, {
      query: 'diab',
      suggestions: [
        {
          suggestion: 'Type 2 diabetes mellitus',
          type: 'concept_name',
          count: 1,
        },
      ],
      page_size: 5,
    });
    const client = new OMOPHub('oh_test', { fetch: fetchMock });
    const { data, error } = await client.search.autocomplete('diab', {
      vocabularyIds: ['SNOMED'],
      domainIds: ['Condition'],
      pageSize: 5,
    });
    expect(error).toBeNull();
    expect(data?.suggestions[0]).toEqual({
      suggestion: 'Type 2 diabetes mellitus',
      type: 'concept_name',
      count: 1,
    });
    const { url } = lastCall(fetchMock);
    expect(url).toContain('/search/autocomplete');
    expect(url).toContain('query=diab');
    expect(url).toContain('vocabulary_ids=SNOMED');
    expect(url).toContain('domain_ids=Condition');
    expect(url).toContain('page_size=5');
  });

  test('maps the deprecated domains option to domain_ids', async () => {
    const fetchMock = createMockFetch();
    enqueueSuccess(fetchMock, { query: 'diab', suggestions: [] });
    const client = new OMOPHub('oh_test', { fetch: fetchMock });

    await client.search.autocomplete('diab', { domains: ['Condition'] });

    const { url } = lastCall(fetchMock);
    expect(url).toContain('domain_ids=Condition');
    expect(url).not.toContain('domains=');
  });
});

describe('client.search.semantic', () => {
  test('hits GET /search/semantic with snake-cased query', async () => {
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
    expect(url).toContain('/search/semantic');
    expect(url).toContain('query=high+blood+sugar');
    expect(url).toContain('vocabulary_ids=SNOMED');
    expect(url).toContain('standard_concept=S');
    expect(url).toContain('threshold=0.85');
  });

  test('normalises a bare-array response into { results: [...] }', async () => {
    const fetchMock = createMockFetch();
    enqueueSuccess(fetchMock, [
      {
        concept_id: 1,
        concept_name: 'A',
        vocabulary_id: 'X',
        concept_code: 'a',
        similarity_score: 0.9,
      },
    ]);
    const client = new OMOPHub('oh_test', { fetch: fetchMock });
    const { data, error } = await client.search.semantic('q');
    expect(error).toBeNull();
    expect(data?.results).toHaveLength(1);
    expect(data?.results[0]?.concept_id).toBe(1);
  });

  test('normalises legacy { data: [...] } shape into { results: [...] }', async () => {
    const fetchMock = createMockFetch();
    enqueueSuccess(fetchMock, {
      data: [
        {
          concept_id: 2,
          concept_name: 'B',
          vocabulary_id: 'X',
          concept_code: 'b',
          similarity_score: 0.7,
        },
      ],
    });
    const client = new OMOPHub('oh_test', { fetch: fetchMock });
    const { data } = await client.search.semantic('q');
    expect(data?.results).toHaveLength(1);
    expect(data?.results[0]?.concept_id).toBe(2);
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

describe('semantic iterator page size', () => {
  function semanticPage(fetchMock: ReturnType<typeof createMockFetch>) {
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
      meta: { pagination: mockPagination({ page: 1, page_size: 1, has_next: false }) },
    });
  }

  test('clamps pageSize to the endpoint ceiling of 100', async () => {
    // /v1/search/semantic validates page_size at max 100 and REJECTS rather
    // than clamping, so an oversized request 400s on every page and the walk
    // returns nothing at all.
    const fetchMock = createMockFetch();
    semanticPage(fetchMock);
    const client = new OMOPHub('oh_test', { fetch: fetchMock });

    await client.search.semanticAll('diabetes', { pageSize: 200 });

    expect(new URL(lastCall(fetchMock).url).searchParams.get('page_size')).toBe('100');
  });

  test('leaves a page size under the ceiling alone', async () => {
    const fetchMock = createMockFetch();
    semanticPage(fetchMock);
    const client = new OMOPHub('oh_test', { fetch: fetchMock });

    await client.search.semanticAll('diabetes', { pageSize: 25 });

    expect(new URL(lastCall(fetchMock).url).searchParams.get('page_size')).toBe('25');
  });

  test('basicAll is not clamped — that endpoint reports real pagination', async () => {
    // Basic search returns a truthful meta.pagination, so a server-side clamp
    // just yields smaller pages; the walk still terminates correctly and there
    // is nothing to protect against.
    const fetchMock = createMockFetch();
    enqueueRawBody(fetchMock, {
      success: true,
      data: { concepts: [{ concept_id: 1, concept_name: 'A' }] },
      meta: { pagination: mockPagination({ page: 1, page_size: 1, has_next: false }) },
    });
    const client = new OMOPHub('oh_test', { fetch: fetchMock });

    await client.search.basicAll('diabetes', { pageSize: 500 });

    expect(new URL(lastCall(fetchMock).url).searchParams.get('page_size')).toBe('500');
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

  test('forwards every documented similarity option in snake_case', async () => {
    const fetchMock = createMockFetch();
    enqueueSuccess(fetchMock, {
      similar_concepts: [],
      search_metadata: {
        original_query: '201826',
        algorithm_used: 'lexical',
        similarity_threshold: 0,
        total_candidates: 0,
        results_returned: 0,
        processing_time_ms: 1,
        totals_are_lower_bound: false,
      },
    });
    const client = new OMOPHub('oh_test', { fetch: fetchMock });
    await client.search.similar({
      conceptId: 201826,
      algorithm: 'lexical',
      // 0 is a legitimate threshold, distinct from omitting it.
      similarityThreshold: 0,
      page: 3,
      pageSize: 10,
      vocabularyIds: ['SNOMED'],
      domainIds: ['Condition'],
      conceptClassIds: ['Clinical Finding'],
      standardConcept: 'N',
      includeInvalid: true,
      includeScores: false,
      includeExplanations: true,
      excludeSelf: false,
    });
    const body = JSON.parse(lastCall(fetchMock).init.body as string);
    expect(body).toEqual({
      concept_id: 201826,
      algorithm: 'lexical',
      similarity_threshold: 0,
      page: 3,
      page_size: 10,
      vocabulary_ids: ['SNOMED'],
      domain_ids: ['Condition'],
      concept_class_ids: ['Clinical Finding'],
      standard_concept: 'N',
      include_invalid: true,
      include_scores: false,
      include_explanations: true,
      exclude_self: false,
    });
  });

  test('types a scoreless concept, as include_scores=false returns', async () => {
    const fetchMock = createMockFetch();
    enqueueSuccess(fetchMock, {
      similar_concepts: [
        {
          concept_id: 313217,
          concept_name: 'Type 1 diabetes mellitus',
          vocabulary_id: 'SNOMED',
          concept_code: '46635009',
        },
      ],
      search_metadata: {
        original_query: '201826',
        algorithm_used: 'semantic',
        similarity_threshold: 0.7,
        total_candidates: 1,
        results_returned: 1,
        processing_time_ms: 1,
      },
    });
    const client = new OMOPHub('oh_test', { fetch: fetchMock });
    const response = await client.search.similar({
      conceptId: 201826,
      includeScores: false,
    });
    // `similarity_score` used to be typed as required, which made the
    // documented `include_scores: false` response a type error.
    expect(response.data?.similar_concepts[0]?.similarity_score).toBeUndefined();
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

  test('treats null/empty/NaN XOR values as not-provided (JS-caller hardening)', async () => {
    const fetchMock = createMockFetch();
    const client = new OMOPHub('oh_test', { fetch: fetchMock });

    expect(
      (
        await client.search.similar({
          conceptId: null,
        } as unknown as Parameters<typeof client.search.similar>[0])
      ).error?.name,
    ).toBe('missing_required_field');

    expect(
      (
        await client.search.similar({
          query: '',
        } as unknown as Parameters<typeof client.search.similar>[0])
      ).error?.name,
    ).toBe('missing_required_field');

    expect(
      (
        await client.search.similar({
          conceptId: Number.NaN,
        } as unknown as Parameters<typeof client.search.similar>[0])
      ).error?.name,
    ).toBe('missing_required_field');

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
