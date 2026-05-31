import { describe, expect, test } from 'vitest';
import { OMOPHub } from '../../src/client.js';
import { createMockFetch, enqueueSuccess, lastCall } from '../helpers/mock-fetch.js';

const SNOMED_SYSTEM = 'http://snomed.info/sct';
const DIABETES_CODE = '44054006';

const mockResolution = {
  input: { system: SNOMED_SYSTEM, code: DIABETES_CODE },
  resolution: {
    source_concept: {
      concept_id: 1,
      concept_name: '',
      vocabulary_id: 'SNOMED',
      concept_code: DIABETES_CODE,
    },
    standard_concept: {
      concept_id: 201826,
      concept_name: 'Type 2 diabetes mellitus',
      vocabulary_id: 'SNOMED',
      concept_code: DIABETES_CODE,
    },
    mapping_type: 'direct',
    target_table: 'condition_occurrence',
  },
};

describe('client.fhir.resolve', () => {
  test('hits POST /fhir/resolve with flat-form coding fields', async () => {
    const fetchMock = createMockFetch();
    enqueueSuccess(fetchMock, mockResolution);
    const client = new OMOPHub('oh_test', { fetch: fetchMock });
    await client.fhir.resolve({
      system: SNOMED_SYSTEM,
      code: DIABETES_CODE,
      resourceType: 'Condition',
      includeRecommendations: true,
      recommendationsLimit: 3,
    });
    const { init, url } = lastCall(fetchMock);
    expect(init.method).toBe('POST');
    expect(url).toBe('https://api.omophub.com/v1/fhir/resolve');
    const body = JSON.parse(init.body as string);
    expect(body).toEqual({
      system: SNOMED_SYSTEM,
      code: DIABETES_CODE,
      resource_type: 'Condition',
      include_recommendations: true,
      recommendations_limit: 3,
    });
  });

  test('accepts nested coding-object form', async () => {
    const fetchMock = createMockFetch();
    enqueueSuccess(fetchMock, mockResolution);
    const client = new OMOPHub('oh_test', { fetch: fetchMock });
    await client.fhir.resolve({
      coding: {
        system: SNOMED_SYSTEM,
        code: DIABETES_CODE,
        display: 'Type 2 diabetes',
        userSelected: true,
      },
      resourceType: 'Condition',
    });
    const body = JSON.parse(lastCall(fetchMock).init.body as string);
    expect(body).toEqual({
      system: SNOMED_SYSTEM,
      code: DIABETES_CODE,
      display: 'Type 2 diabetes',
      user_selected: true,
      resource_type: 'Condition',
    });
  });

  test('flat fields override coding-object fields when both supplied', async () => {
    const fetchMock = createMockFetch();
    enqueueSuccess(fetchMock, mockResolution);
    const client = new OMOPHub('oh_test', { fetch: fetchMock });
    // Provide flat values for every overlapping field — flat must win
    // across the board, not just the field the caller "happens to also pass".
    await client.fhir.resolve({
      coding: {
        system: 'old-system',
        code: 'old-code',
        display: 'old-display',
        vocabularyId: 'OLD_VOCAB',
      },
      system: SNOMED_SYSTEM,
      code: DIABETES_CODE,
      display: 'Type 2 diabetes (flat)',
      vocabularyId: 'SNOMED',
    });
    const body = JSON.parse(lastCall(fetchMock).init.body as string);
    expect(body.system).toBe(SNOMED_SYSTEM);
    expect(body.code).toBe(DIABETES_CODE);
    expect(body.display).toBe('Type 2 diabetes (flat)');
    expect(body.vocabulary_id).toBe('SNOMED');
  });

  test('flat fields inherit from coding only when the flat value is absent', async () => {
    const fetchMock = createMockFetch();
    enqueueSuccess(fetchMock, mockResolution);
    const client = new OMOPHub('oh_test', { fetch: fetchMock });
    await client.fhir.resolve({
      coding: {
        system: SNOMED_SYSTEM,
        code: 'coding-code',
        display: 'inherited-from-coding',
      },
      code: DIABETES_CODE, // only `code` provided flat
    });
    const body = JSON.parse(lastCall(fetchMock).init.body as string);
    expect(body.code).toBe(DIABETES_CODE); // flat wins
    expect(body.system).toBe(SNOMED_SYSTEM); // inherited from coding
    expect(body.display).toBe('inherited-from-coding'); // inherited from coding
  });

  test('rejects synthetically when neither flat code nor coding.code is provided', async () => {
    const fetchMock = createMockFetch();
    const client = new OMOPHub('oh_test', { fetch: fetchMock });
    const { error } = await client.fhir.resolve({ system: 'foo' });
    expect(error?.name).toBe('missing_required_field');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test('rejects coding-object without a code', async () => {
    const fetchMock = createMockFetch();
    const client = new OMOPHub('oh_test', { fetch: fetchMock });
    const { error } = await client.fhir.resolve({ coding: { system: 'foo' } });
    expect(error?.name).toBe('missing_required_field');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test('rejects when coding is mistakenly passed as an array (JS-caller hardening)', async () => {
    const fetchMock = createMockFetch();
    const client = new OMOPHub('oh_test', { fetch: fetchMock });
    // A caller passing `coding: [...]` (mistaking for FHIR `CodeableConcept.coding`)
    // would otherwise slip past the object check since `typeof [] === 'object'`.
    const { error } = await client.fhir.resolve({
      coding: [{ system: SNOMED_SYSTEM, code: DIABETES_CODE }] as unknown as Parameters<
        typeof client.fhir.resolve
      >[0]['coding'],
    });
    expect(error?.name).toBe('missing_required_field');
    expect(error?.statusCode).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test('rejects empty string code (JS-caller hardening)', async () => {
    const fetchMock = createMockFetch();
    const client = new OMOPHub('oh_test', { fetch: fetchMock });
    const { error } = await client.fhir.resolve({ code: '' });
    expect(error?.name).toBe('missing_required_field');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test('accepts top-level `display` alone for semantic fallback', async () => {
    const fetchMock = createMockFetch();
    enqueueSuccess(fetchMock, mockResolution);
    const client = new OMOPHub('oh_test', { fetch: fetchMock });
    const { error } = await client.fhir.resolve({ display: 'blood glucose' });
    expect(error).toBeNull();
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  test('accepts nested `coding.display` alone for semantic fallback', async () => {
    const fetchMock = createMockFetch();
    enqueueSuccess(fetchMock, mockResolution);
    const client = new OMOPHub('oh_test', { fetch: fetchMock });
    const { error } = await client.fhir.resolve({ coding: { display: 'blood glucose' } });
    expect(error).toBeNull();
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  test('passes onUnmapped through as snake_case', async () => {
    const fetchMock = createMockFetch();
    enqueueSuccess(fetchMock, mockResolution);
    const client = new OMOPHub('oh_test', { fetch: fetchMock });
    await client.fhir.resolve({
      code: DIABETES_CODE,
      onUnmapped: 'sentinel',
    });
    const body = JSON.parse(lastCall(fetchMock).init.body as string);
    expect(body.on_unmapped).toBe('sentinel');
  });
});

describe('client.fhir.resolveBatch', () => {
  test('hits POST /fhir/resolve/batch with 1-100 codings', async () => {
    const fetchMock = createMockFetch();
    enqueueSuccess(fetchMock, { results: [], summary: { total: 2, resolved: 2, failed: 0 } });
    const client = new OMOPHub('oh_test', { fetch: fetchMock });
    await client.fhir.resolveBatch(
      [
        { system: SNOMED_SYSTEM, code: DIABETES_CODE },
        { system: 'http://hl7.org/fhir/sid/icd-10-cm', code: 'E11.9' },
      ],
      { resourceType: 'Condition', includeQuality: true },
    );
    const { url, init } = lastCall(fetchMock);
    expect(init.method).toBe('POST');
    expect(url).toBe('https://api.omophub.com/v1/fhir/resolve/batch');
    const body = JSON.parse(init.body as string);
    expect(body.codings).toHaveLength(2);
    expect(body.resource_type).toBe('Condition');
    expect(body.include_quality).toBe(true);
  });

  test('rejects empty array synthetically', async () => {
    const fetchMock = createMockFetch();
    const client = new OMOPHub('oh_test', { fetch: fetchMock });
    const { error } = await client.fhir.resolveBatch([]);
    expect(error?.name).toBe('validation_error');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test('rejects >100 codings synthetically', async () => {
    const fetchMock = createMockFetch();
    const client = new OMOPHub('oh_test', { fetch: fetchMock });
    const tooMany = Array.from({ length: 101 }, (_, i) => ({
      system: SNOMED_SYSTEM,
      code: `${i}`,
    }));
    const { error } = await client.fhir.resolveBatch(tooMany);
    expect(error?.name).toBe('validation_error');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('client.fhir.resolveCodeableConcept', () => {
  test('hits POST /fhir/resolve/codeable-concept with 1-20 codings', async () => {
    const fetchMock = createMockFetch();
    enqueueSuccess(fetchMock, { input: {}, alternatives: [], unresolved: [] });
    const client = new OMOPHub('oh_test', { fetch: fetchMock });
    await client.fhir.resolveCodeableConcept(
      [
        { system: SNOMED_SYSTEM, code: DIABETES_CODE },
        { system: 'http://hl7.org/fhir/sid/icd-10-cm', code: 'E11.9', userSelected: true },
      ],
      { text: 'Type 2 diabetes', resourceType: 'Condition' },
    );
    const { url, init } = lastCall(fetchMock);
    expect(url).toBe('https://api.omophub.com/v1/fhir/resolve/codeable-concept');
    const body = JSON.parse(init.body as string);
    expect(body.coding).toHaveLength(2);
    expect(body.coding[1].user_selected).toBe(true);
    expect(body.text).toBe('Type 2 diabetes');
    expect(body.resource_type).toBe('Condition');
  });

  test('rejects >20 codings synthetically (lower cap than resolveBatch)', async () => {
    const fetchMock = createMockFetch();
    const client = new OMOPHub('oh_test', { fetch: fetchMock });
    const tooMany = Array.from({ length: 21 }, (_, i) => ({
      system: SNOMED_SYSTEM,
      code: `${i}`,
    }));
    const { error } = await client.fhir.resolveCodeableConcept(tooMany);
    expect(error?.name).toBe('validation_error');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test('rejects empty array synthetically', async () => {
    const fetchMock = createMockFetch();
    const client = new OMOPHub('oh_test', { fetch: fetchMock });
    const { error } = await client.fhir.resolveCodeableConcept([]);
    expect(error?.name).toBe('validation_error');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
