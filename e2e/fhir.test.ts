import { describe, expect, test } from 'vitest';
import { omophubFhirUrl } from '../src/index.js';
import { E2E_CONCEPT_IDS, e2eClient, e2eEnabled, softThrottle } from './_helpers.js';

const runOrSkip = e2eEnabled ? test : test.skip;

describe('e2e: client.fhir.resolve', () => {
  runOrSkip('SNOMED 44054006 → Type 2 diabetes (direct mapping)', async () => {
    await softThrottle();
    const client = e2eClient();
    const { data, error } = await client.fhir.resolve({
      system: 'http://snomed.info/sct',
      code: '44054006',
      resourceType: 'Condition',
    });
    expect(error).toBeNull();
    expect(data?.resolution.standard_concept.concept_id).toBe(E2E_CONCEPT_IDS.diabetes);
    expect(data?.resolution.target_table).toBe('condition_occurrence');
    expect(typeof data?.resolution.mapping_type).toBe('string');
  });

  runOrSkip('ICD10CM E11.9 → SNOMED (maps-to traversal)', async () => {
    await softThrottle();
    const client = e2eClient();
    const { data, error } = await client.fhir.resolve({
      system: 'http://hl7.org/fhir/sid/icd-10-cm',
      code: 'E11.9',
    });
    expect(error).toBeNull();
    expect(data?.resolution.source_concept.vocabulary_id).toBe('ICD10CM');
    expect(data?.resolution.standard_concept.vocabulary_id).toBe('SNOMED');
  });

  runOrSkip('nested coding-object form is equivalent to flat form', async () => {
    await softThrottle();
    const client = e2eClient();
    const flat = await client.fhir.resolve({
      system: 'http://snomed.info/sct',
      code: '44054006',
    });
    await softThrottle();
    const nested = await client.fhir.resolve({
      coding: { system: 'http://snomed.info/sct', code: '44054006' },
    });
    expect(flat.error).toBeNull();
    expect(nested.error).toBeNull();
    expect(nested.data?.resolution.standard_concept.concept_id).toBe(
      flat.data?.resolution.standard_concept.concept_id,
    );
  });

  runOrSkip('vocabularyId shortcut bypasses URI lookup', async () => {
    await softThrottle();
    const client = e2eClient();
    const { data, error } = await client.fhir.resolve({
      vocabularyId: 'ICD10CM',
      code: 'E11.9',
    });
    expect(error).toBeNull();
    expect(data?.resolution.source_concept.vocabulary_id).toBe('ICD10CM');
  });

  runOrSkip('includeRecommendations populates the recommendations array', async () => {
    await softThrottle();
    const client = e2eClient();
    const { data, error } = await client.fhir.resolve({
      system: 'http://snomed.info/sct',
      code: '44054006',
      includeRecommendations: true,
      recommendationsLimit: 3,
    });
    expect(error).toBeNull();
    expect(Array.isArray(data?.resolution.recommendations)).toBe(true);
  });

  runOrSkip('includeQuality populates mapping_quality (string bucket)', async () => {
    await softThrottle();
    const client = e2eClient();
    const { data, error } = await client.fhir.resolve({
      system: 'http://snomed.info/sct',
      code: '44054006',
      includeQuality: true,
    });
    expect(error).toBeNull();
    expect(typeof data?.resolution.mapping_quality).toBe('string');
    // Common buckets per the docs — server may add more
    expect(['high', 'medium', 'low', 'manual_review']).toContain(data?.resolution.mapping_quality);
  });

  runOrSkip('synthetic: empty code is rejected without network call', async () => {
    const client = e2eClient();
    const { error } = await client.fhir.resolve({ system: 'http://snomed.info/sct', code: '' });
    expect(error?.name).toBe('missing_required_field');
    expect(error?.statusCode).toBeNull();
  });

  runOrSkip('synthetic: coding without code is rejected without network call', async () => {
    const client = e2eClient();
    const { error } = await client.fhir.resolve({
      coding: { system: 'http://snomed.info/sct' },
    });
    expect(error?.name).toBe('missing_required_field');
    expect(error?.statusCode).toBeNull();
  });
});

describe('e2e: client.fhir.resolveBatch', () => {
  runOrSkip('2-coding batch reports total/resolved/failed', async () => {
    await softThrottle();
    const client = e2eClient();
    const { data, error } = await client.fhir.resolveBatch(
      [
        { system: 'http://snomed.info/sct', code: '44054006' },
        { system: 'http://hl7.org/fhir/sid/icd-10-cm', code: 'E11.9' },
      ],
      { resourceType: 'Condition' },
    );
    expect(error).toBeNull();
    expect(data?.summary.total).toBe(2);
    expect(typeof data?.summary.resolved).toBe('number');
    expect(typeof data?.summary.failed).toBe('number');
    expect((data?.summary.resolved ?? 0) + (data?.summary.failed ?? 0)).toBe(2);
  });

  runOrSkip('single-coding batch (minimum) is valid', async () => {
    await softThrottle();
    const client = e2eClient();
    const { data, error } = await client.fhir.resolveBatch([
      { system: 'http://snomed.info/sct', code: '44054006' },
    ]);
    expect(error).toBeNull();
    expect(data?.summary.total).toBe(1);
  });

  runOrSkip('synthetic: empty array is rejected without network call', async () => {
    const client = e2eClient();
    const { error } = await client.fhir.resolveBatch([]);
    expect(error?.name).toBe('validation_error');
    expect(error?.statusCode).toBeNull();
  });

  runOrSkip('synthetic: 101 codings is rejected without network call', async () => {
    const client = e2eClient();
    const tooMany = Array.from({ length: 101 }, () => ({
      system: 'http://snomed.info/sct',
      code: '44054006',
    }));
    const { error } = await client.fhir.resolveBatch(tooMany);
    expect(error?.name).toBe('validation_error');
    expect(error?.statusCode).toBeNull();
  });
});

describe('e2e: client.fhir.resolveCodeableConcept', () => {
  runOrSkip('picks the best match across multiple codings', async () => {
    await softThrottle();
    const client = e2eClient();
    const { data, error } = await client.fhir.resolveCodeableConcept(
      [
        { system: 'http://snomed.info/sct', code: '44054006' },
        { system: 'http://hl7.org/fhir/sid/icd-10-cm', code: 'E11.9' },
      ],
      { resourceType: 'Condition' },
    );
    expect(error).toBeNull();
    expect(data?.best_match).toBeTruthy();
    expect(Array.isArray(data?.alternatives)).toBe(true);
    expect(Array.isArray(data?.unresolved)).toBe(true);
  });

  runOrSkip('synthetic: >20 codings is rejected without network call', async () => {
    const client = e2eClient();
    const tooMany = Array.from({ length: 21 }, () => ({
      system: 'http://snomed.info/sct',
      code: '44054006',
    }));
    const { error } = await client.fhir.resolveCodeableConcept(tooMany);
    expect(error?.name).toBe('validation_error');
    expect(error?.statusCode).toBeNull();
  });
});

describe('e2e: standalone helpers', () => {
  test('omophubFhirUrl returns the documented base for each FHIR version', () => {
    expect(omophubFhirUrl()).toBe('https://fhir.omophub.com/fhir/r4');
    expect(omophubFhirUrl('r4')).toBe('https://fhir.omophub.com/fhir/r4');
    expect(omophubFhirUrl('r4b')).toBe('https://fhir.omophub.com/fhir/r4b');
    expect(omophubFhirUrl('r5')).toBe('https://fhir.omophub.com/fhir/r5');
    expect(omophubFhirUrl('r6')).toBe('https://fhir.omophub.com/fhir/r6');
  });
});
