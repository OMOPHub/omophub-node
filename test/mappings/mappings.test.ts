import { describe, expect, test } from 'vitest';
import { OMOPHub } from '../../src/client.js';
import { DIABETES_CONCEPT_ID, mockApiErrorBody, mockPagination } from '../fixtures/index.js';
import {
  createMockFetch,
  enqueueError,
  enqueueRawBody,
  enqueueSuccess,
  lastCall,
} from '../helpers/mock-fetch.js';

/** One page of mappings with real envelope-level pagination meta. */
function enqueueMappingsPage(
  fetchMock: ReturnType<typeof createMockFetch>,
  targetConceptIds: number[],
  pagination: Partial<ReturnType<typeof mockPagination>>,
) {
  enqueueRawBody(fetchMock, {
    success: true,
    data: {
      mappings: targetConceptIds.map((id) => ({
        source_concept_id: DIABETES_CONCEPT_ID,
        source_concept_name: 'Type 2 diabetes mellitus',
        target_concept_id: id,
        target_concept_name: `target ${id}`,
        relationship_id: 'Maps to',
      })),
    },
    meta: { request_id: 'req_test', pagination: mockPagination(pagination) },
  });
}

describe('client.mappings.get', () => {
  test('hits GET /concepts/{id}/mappings', async () => {
    const fetchMock = createMockFetch();
    enqueueSuccess(fetchMock, { mappings: [] });
    const client = new OMOPHub('oh_test', { fetch: fetchMock });
    await client.mappings.get(DIABETES_CONCEPT_ID, {
      targetVocabulary: 'ICD10CM',
      includeInvalid: false,
      vocabRelease: '2025.1',
    });
    const { url } = lastCall(fetchMock);
    expect(url).toContain('/concepts/201826/mappings');
    expect(url).toContain('target_vocabulary=ICD10CM');
    expect(url).toContain('include_invalid=false');
    expect(url).toContain('vocab_release=2025.1');
  });

  test('comma-joins relationshipIds, and omits it when unset', async () => {
    // Value-as-Concept is unreachable without this: the server defaults to
    // `Maps to` alone, so a composite concept returns only half its
    // decomposition unless `Maps to value` is asked for too.
    const fetchMock = createMockFetch();
    enqueueSuccess(fetchMock, { mappings: [] });
    const client = new OMOPHub('oh_test', { fetch: fetchMock });

    await client.mappings.get(4_167_462);
    expect(lastCall(fetchMock).url).not.toContain('relationship_ids');

    enqueueSuccess(fetchMock, { mappings: [] });
    await client.mappings.get(4_167_462, {
      relationshipIds: ['Maps to', 'Maps to value'],
    });
    const { url } = lastCall(fetchMock);
    expect(new URL(url).searchParams.get('relationship_ids')).toBe('Maps to,Maps to value');
  });

  test('getAll forwards relationshipIds to every page', async () => {
    const fetchMock = createMockFetch();
    enqueueMappingsPage(fetchMock, [1], { page: 1, total_pages: 2, has_next: true });
    enqueueMappingsPage(fetchMock, [2], { page: 2, total_pages: 2, has_next: false });
    const client = new OMOPHub('oh_test', { fetch: fetchMock });

    await client.mappings.getAll(4_167_462, {
      relationshipIds: ['Maps to', 'Maps to value'],
    });

    for (const call of fetchMock.mock.calls) {
      const url = new URL(String(call[0]));
      expect(url.searchParams.get('relationship_ids')).toBe('Maps to,Maps to value');
    }
  });

  test('returns ErrorResponse on 404', async () => {
    const fetchMock = createMockFetch();
    enqueueError(fetchMock, 404, mockApiErrorBody('not_found', 'no mappings'));
    const client = new OMOPHub('oh_test', { fetch: fetchMock, maxRetries: 0 });
    const { error } = await client.mappings.get(9_999_999);
    expect(error?.name).toBe('not_found');
  });
});

describe('client.mappings against a server that omits meta.pagination', () => {
  /**
   * Answers every request with the same full page and no `meta.pagination`,
   * counting calls. Models a pre-2026-08-04 deployment, whose query was
   * `LIMIT 100` with no OFFSET: it ignores `page` entirely.
   *
   * Throws past `maxCalls` so a non-terminating walk fails the test instead
   * of hanging the suite.
   */
  function legacyServer(rowCount: number, maxCalls = 5) {
    let calls = 0;
    const fetchMock = createMockFetch();
    fetchMock.mockImplementation(async () => {
      calls++;
      if (calls > maxCalls) throw new Error(`did not terminate: ${calls} requests`);
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            mappings: Array.from({ length: rowCount }, (_, i) => ({
              source_concept_id: DIABETES_CONCEPT_ID,
              target_concept_id: 1000 + i,
              relationship_id: 'Maps to',
            })),
          },
          meta: { request_id: 'req_legacy' },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    });
    return { fetchMock, calls: () => calls };
  }

  test('getAll stops after one page instead of looping forever', async () => {
    // A full page used to imply "there is more", so page 2 re-fetched the
    // identical 100 rows and the walk never ended.
    const { fetchMock, calls } = legacyServer(100);
    const client = new OMOPHub('oh_test', { fetch: fetchMock });

    const result = await client.mappings.getAll(DIABETES_CONCEPT_ID);

    expect(calls()).toBe(1);
    expect(result.pagesFetched).toBe(1);
    expect(result.data).toHaveLength(100);
    // No duplicates — the old loop yielded the same rows on every pass.
    expect(new Set(result.data.map((m) => m.target_concept_id)).size).toBe(100);
  });

  test('getIter terminates instead of yielding the same rows forever', async () => {
    const { fetchMock, calls } = legacyServer(100);
    const client = new OMOPHub('oh_test', { fetch: fetchMock });

    const seen: number[] = [];
    for await (const m of client.mappings.getIter(DIABETES_CONCEPT_ID)) {
      seen.push(m.target_concept_id);
    }

    expect(calls()).toBe(1);
    expect(seen).toHaveLength(100);
  });

  test('a short page still terminates', async () => {
    const { fetchMock, calls } = legacyServer(7);
    const client = new OMOPHub('oh_test', { fetch: fetchMock });

    const result = await client.mappings.getAll(DIABETES_CONCEPT_ID);

    expect(calls()).toBe(1);
    expect(result.data).toHaveLength(7);
  });
});

describe('client.mappings iterator page size', () => {
  test('clamps a requested pageSize above the server ceiling to 200', async () => {
    // The server silently clamps to 200. Asking for 500 and receiving 200 would
    // otherwise read as a short page — i.e. the end — and truncate the walk.
    const fetchMock = createMockFetch();
    enqueueMappingsPage(fetchMock, [1], { page: 1, total_pages: 1, has_next: false });
    const client = new OMOPHub('oh_test', { fetch: fetchMock });

    await client.mappings.getAll(DIABETES_CONCEPT_ID, { pageSize: 500 });

    expect(new URL(lastCall(fetchMock).url).searchParams.get('page_size')).toBe('200');
  });

  test('leaves a page size under the ceiling alone', async () => {
    const fetchMock = createMockFetch();
    enqueueMappingsPage(fetchMock, [1], { page: 1, total_pages: 1, has_next: false });
    const client = new OMOPHub('oh_test', { fetch: fetchMock });

    await client.mappings.getAll(DIABETES_CONCEPT_ID, { pageSize: 50 });

    expect(new URL(lastCall(fetchMock).url).searchParams.get('page_size')).toBe('50');
  });
});

describe('client.mappings pagination', () => {
  test('get forwards page and pageSize as snake_case query params', async () => {
    const fetchMock = createMockFetch();
    enqueueSuccess(fetchMock, { mappings: [] });
    const client = new OMOPHub('oh_test', { fetch: fetchMock });
    await client.mappings.get(DIABETES_CONCEPT_ID, { page: 3, pageSize: 200 });
    const { url } = lastCall(fetchMock);
    expect(url).toContain('page=3');
    expect(url).toContain('page_size=200');
  });

  test('get exposes pagination metadata on the envelope', async () => {
    const fetchMock = createMockFetch();
    enqueueMappingsPage(fetchMock, [1], { total_items: 1500, total_pages: 15, has_next: true });
    const client = new OMOPHub('oh_test', { fetch: fetchMock });
    const { meta } = await client.mappings.get(DIABETES_CONCEPT_ID);
    expect(meta?.pagination?.total_items).toBe(1500);
    expect(meta?.pagination?.has_next).toBe(true);
  });

  test('getIter walks every page until has_next is false', async () => {
    const fetchMock = createMockFetch();
    enqueueMappingsPage(fetchMock, [1, 2], { page: 1, page_size: 2, has_next: true });
    enqueueMappingsPage(fetchMock, [3], { page: 2, page_size: 2, has_next: false });
    const client = new OMOPHub('oh_test', { fetch: fetchMock });

    const seen: number[] = [];
    for await (const mapping of client.mappings.getIter(DIABETES_CONCEPT_ID, { pageSize: 2 })) {
      seen.push(mapping.target_concept_id);
    }

    expect(seen).toEqual([1, 2, 3]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(lastCall(fetchMock).url).toContain('page=2');
  });

  test('getAll collects every page into one array', async () => {
    const fetchMock = createMockFetch();
    enqueueMappingsPage(fetchMock, [1, 2], { page: 1, page_size: 2, has_next: true });
    enqueueMappingsPage(fetchMock, [3], { page: 2, page_size: 2, has_next: false });
    const client = new OMOPHub('oh_test', { fetch: fetchMock });

    const { data, errors, pagesFetched } = await client.mappings.getAll(DIABETES_CONCEPT_ID, {
      pageSize: 2,
    });

    expect(data.map((m) => m.target_concept_id)).toEqual([1, 2, 3]);
    expect(errors).toEqual([]);
    expect(pagesFetched).toBe(2);
  });

  test('getIter stops after one page when the server omits pagination meta', async () => {
    const fetchMock = createMockFetch();
    enqueueSuccess(fetchMock, {
      mappings: [
        {
          source_concept_id: DIABETES_CONCEPT_ID,
          source_concept_name: 'Type 2 diabetes mellitus',
          target_concept_id: 1,
          target_concept_name: 'target 1',
          relationship_id: 'Maps to',
        },
      ],
    });
    const client = new OMOPHub('oh_test', { fetch: fetchMock });

    const seen: number[] = [];
    for await (const mapping of client.mappings.getIter(DIABETES_CONCEPT_ID, { pageSize: 100 })) {
      seen.push(mapping.target_concept_id);
    }

    expect(seen).toEqual([1]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test('getAll surfaces a failing page as an error rather than a short result', async () => {
    const fetchMock = createMockFetch();
    enqueueMappingsPage(fetchMock, [1], { page: 1, page_size: 1, has_next: true });
    enqueueError(fetchMock, 500, mockApiErrorBody('server_error', 'boom'));
    const client = new OMOPHub('oh_test', { fetch: fetchMock, maxRetries: 0 });

    const { data, errors } = await client.mappings.getAll(DIABETES_CONCEPT_ID, { pageSize: 1 });

    expect(data.map((m) => m.target_concept_id)).toEqual([1]);
    expect(errors).toHaveLength(1);
  });
});

describe('client.mappings.map', () => {
  test('POST /concepts/map with sourceConcepts variant', async () => {
    const fetchMock = createMockFetch();
    enqueueSuccess(fetchMock, { mappings: [], summary: { total_source_concepts: 2 } });
    const client = new OMOPHub('oh_test', { fetch: fetchMock });
    await client.mappings.map({
      targetVocabulary: 'SNOMED',
      sourceConcepts: [201826, 1112807],
      mappingType: 'direct',
      includeInvalid: false,
    });
    const { init, url } = lastCall(fetchMock);
    expect(init.method).toBe('POST');
    expect(url).toBe('https://api.omophub.com/v1/concepts/map');
    const body = JSON.parse(init.body as string);
    expect(body).toEqual({
      target_vocabulary: 'SNOMED',
      source_concepts: [201826, 1112807],
      mapping_type: 'direct',
      include_invalid: false,
    });
  });

  test('POST /concepts/map with sourceCodes variant', async () => {
    const fetchMock = createMockFetch();
    enqueueSuccess(fetchMock, { mappings: [] });
    const client = new OMOPHub('oh_test', { fetch: fetchMock });
    await client.mappings.map({
      targetVocabulary: 'SNOMED',
      sourceCodes: [
        { vocabulary_id: 'ICD10CM', concept_code: 'E11.9' },
        { vocabulary_id: 'ICD10CM', concept_code: 'I10' },
      ],
    });
    const body = JSON.parse(lastCall(fetchMock).init.body as string);
    expect(body.source_codes).toEqual([
      { vocabulary_id: 'ICD10CM', concept_code: 'E11.9' },
      { vocabulary_id: 'ICD10CM', concept_code: 'I10' },
    ]);
    expect(body.source_concepts).toBeUndefined();
  });

  test('vocabRelease is sent as a QUERY param (not in the JSON body)', async () => {
    const fetchMock = createMockFetch();
    enqueueSuccess(fetchMock, { mappings: [] });
    const client = new OMOPHub('oh_test', { fetch: fetchMock });
    await client.mappings.map({
      targetVocabulary: 'SNOMED',
      sourceConcepts: [201826],
      vocabRelease: '2025.1',
    });
    const { url, init } = lastCall(fetchMock);
    expect(url).toContain('vocab_release=2025.1');
    const body = JSON.parse(init.body as string);
    expect(body.vocab_release).toBeUndefined();
    expect(body.target_vocabulary).toBe('SNOMED');
  });

  test('rejects zero-of XOR options synthetically', async () => {
    const fetchMock = createMockFetch();
    const client = new OMOPHub('oh_test', { fetch: fetchMock });
    const { error } = await client.mappings.map({
      targetVocabulary: 'SNOMED',
    } as unknown as Parameters<typeof client.mappings.map>[0]);
    expect(error?.name).toBe('missing_required_field');
    expect(error?.message).toMatch(/exactly one/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test('rejects both-of XOR options synthetically', async () => {
    const fetchMock = createMockFetch();
    const client = new OMOPHub('oh_test', { fetch: fetchMock });
    const { error } = await client.mappings.map({
      targetVocabulary: 'SNOMED',
      sourceConcepts: [1],
      sourceCodes: [{ vocabulary_id: 'X', concept_code: 'Y' }],
    } as unknown as Parameters<typeof client.mappings.map>[0]);
    expect(error?.name).toBe('missing_required_field');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test('rejects empty sourceConcepts array synthetically', async () => {
    const fetchMock = createMockFetch();
    const client = new OMOPHub('oh_test', { fetch: fetchMock });
    const { error } = await client.mappings.map({
      targetVocabulary: 'SNOMED',
      sourceConcepts: [],
    });
    expect(error?.name).toBe('missing_required_field');
    expect(error?.message).toMatch(/at least one entry/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test('rejects empty sourceCodes array synthetically', async () => {
    const fetchMock = createMockFetch();
    const client = new OMOPHub('oh_test', { fetch: fetchMock });
    const { error } = await client.mappings.map({
      targetVocabulary: 'SNOMED',
      sourceCodes: [],
    });
    expect(error?.name).toBe('missing_required_field');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test('forwards idempotencyKey to the Idempotency-Key header', async () => {
    const fetchMock = createMockFetch();
    enqueueSuccess(fetchMock, { mappings: [] });
    const client = new OMOPHub('oh_test', { fetch: fetchMock });
    await client.mappings.map({
      targetVocabulary: 'SNOMED',
      sourceConcepts: [201826],
      idempotencyKey: 'idem_map_42',
    });
    expect(new Headers(lastCall(fetchMock).init.headers).get('idempotency-key')).toBe(
      'idem_map_42',
    );
  });
});
