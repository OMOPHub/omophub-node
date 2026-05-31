import { describe, expect, test } from 'vitest';
import { OMOPHub } from '../../src/client.js';
import { DIABETES_CONCEPT_ID, mockApiErrorBody } from '../fixtures/index.js';
import { createMockFetch, enqueueError, enqueueSuccess, lastCall } from '../helpers/mock-fetch.js';

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

  test('returns ErrorResponse on 404', async () => {
    const fetchMock = createMockFetch();
    enqueueError(fetchMock, 404, mockApiErrorBody('not_found', 'no mappings'));
    const client = new OMOPHub('oh_test', { fetch: fetchMock, maxRetries: 0 });
    const { error } = await client.mappings.get(9_999_999);
    expect(error?.name).toBe('not_found');
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
