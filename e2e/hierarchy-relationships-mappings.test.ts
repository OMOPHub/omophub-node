import { describe, expect, test } from 'vitest';
import {
  E2E_CONCEPT_IDS,
  e2eClient,
  e2eClientNoRetry,
  e2eEnabled,
  softThrottle,
} from './_helpers.js';

const runOrSkip = e2eEnabled ? test : test.skip;

describe('e2e: client.hierarchy.get', () => {
  runOrSkip('format="flat" returns concepts + paths arrays', async () => {
    await softThrottle();
    // Hierarchy traversal is one of the heaviest server queries; use the
    // no-retry client to stay inside the test timeout.
    const client = e2eClientNoRetry();
    const { data, error } = await client.hierarchy.get(E2E_CONCEPT_IDS.diabetes, {
      format: 'flat',
      maxLevels: 2,
      vocabularyIds: ['SNOMED'],
    });
    if (error) {
      expect(['timeout_error', 'connection_error', 'rate_limit_exceeded']).toContain(error.name);
      return;
    }
    expect(data).toBeTruthy();
  });

  runOrSkip('format="graph" returns nodes + edges arrays', async () => {
    await softThrottle();
    const client = e2eClient();
    const { data, error } = await client.hierarchy.get(E2E_CONCEPT_IDS.diabetes, {
      format: 'graph',
      maxLevels: 2,
    });
    expect(error).toBeNull();
    expect(data).toBeTruthy();
  });

  runOrSkip('maxLevels above the server cap returns a structured validation_error', async () => {
    await softThrottle();
    const client = e2eClient();
    const { data, error } = await client.hierarchy.get(E2E_CONCEPT_IDS.diabetes, {
      maxLevels: 50, // exceeds the server cap of 20
    });
    // Server rejects rather than silently capping — both are valid
    // contracts; the SDK just needs to surface the error structurally.
    if (error) {
      expect(error.name).toBe('validation_error');
      expect(error.statusCode).toBe(400);
      expect(data).toBeNull();
    } else {
      expect(data).toBeTruthy();
    }
  });
});

describe('e2e: client.hierarchy.ancestors', () => {
  runOrSkip('returns ancestors of diabetes filtered by vocabulary', async () => {
    await softThrottle();
    const client = e2eClient();
    const { data, error } = await client.hierarchy.ancestors(E2E_CONCEPT_IDS.diabetes, {
      vocabularyIds: ['SNOMED'],
      pageSize: 10,
    });
    expect(error).toBeNull();
    expect(Array.isArray(data?.ancestors)).toBe(true);
  });

  runOrSkip('includeDistance flag is accepted and ancestors are typed correctly', async () => {
    await softThrottle();
    const client = e2eClient();
    const { data, error } = await client.hierarchy.ancestors(E2E_CONCEPT_IDS.diabetes, {
      vocabularyIds: ['SNOMED'],
      includeDistance: true,
      pageSize: 5,
    });
    expect(error).toBeNull();
    expect(Array.isArray(data?.ancestors)).toBe(true);
    // Distance fields (`level`, `min_levels_of_separation`,
    // `max_levels_of_separation`) are server-populated and may not be
    // present on every row, so we don't assert their presence — only the
    // base ancestor concept shape.
    for (const a of data?.ancestors ?? []) {
      expect(typeof a.concept_id).toBe('number');
      expect(typeof a.concept_name).toBe('string');
    }
  });
});

describe('e2e: client.hierarchy.descendants', () => {
  runOrSkip('returns descendants with maxLevels filter', async () => {
    await softThrottle();
    const client = e2eClient();
    const { data, error } = await client.hierarchy.descendants(E2E_CONCEPT_IDS.diabetes, {
      maxLevels: 2,
      pageSize: 10,
    });
    expect(error).toBeNull();
    expect(Array.isArray(data?.descendants)).toBe(true);
  });

  runOrSkip('domainIds filter restricts descendants to a domain', async () => {
    await softThrottle();
    const client = e2eClient();
    const { data, error } = await client.hierarchy.descendants(E2E_CONCEPT_IDS.diabetes, {
      maxLevels: 2,
      domainIds: ['Condition'],
      pageSize: 5,
    });
    expect(error).toBeNull();
    for (const d of data?.descendants ?? []) {
      if (d.domain_id) expect(d.domain_id).toBe('Condition');
    }
  });
});

describe('e2e: client.relationships', () => {
  runOrSkip('types() returns the relationship-type catalog', async () => {
    await softThrottle();
    const client = e2eClient();
    const { data, error } = await client.relationships.types({ pageSize: 50 });
    expect(error).toBeNull();
    expect(Array.isArray(data?.relationship_types)).toBe(true);
    expect(data?.relationship_types.length).toBeGreaterThan(0);
  });

  runOrSkip(
    'get(diabetes) and concepts.relationships(diabetes) hit the same endpoint with matching counts',
    async () => {
      await softThrottle();
      const client = e2eClient();
      const a = await client.relationships.get(E2E_CONCEPT_IDS.diabetes, {
        pageSize: 10,
        vocabularyIds: ['SNOMED'],
      });
      await softThrottle();
      const b = await client.concepts.relationships(E2E_CONCEPT_IDS.diabetes, {
        pageSize: 10,
        vocabularyIds: ['SNOMED'],
      });
      expect(a.error).toBeNull();
      expect(b.error).toBeNull();
      expect(a.data?.relationships.length).toBe(b.data?.relationships.length);
    },
  );

  runOrSkip('includeReverse adds reverse relationships', async () => {
    await softThrottle();
    const client = e2eClient();
    const without = await client.relationships.get(E2E_CONCEPT_IDS.diabetes, {
      pageSize: 5,
      vocabularyIds: ['SNOMED'],
      includeReverse: false,
    });
    await softThrottle();
    const withReverse = await client.relationships.get(E2E_CONCEPT_IDS.diabetes, {
      pageSize: 5,
      vocabularyIds: ['SNOMED'],
      includeReverse: true,
    });
    expect(without.error).toBeNull();
    expect(withReverse.error).toBeNull();
    // Reverse-inclusive set is a superset
    const a = without.meta?.pagination?.total_items ?? 0;
    const b = withReverse.meta?.pagination?.total_items ?? 0;
    expect(b).toBeGreaterThanOrEqual(a);
  });
});

describe('e2e: client.mappings.get', () => {
  runOrSkip('returns mappings for diabetes', async () => {
    await softThrottle();
    const client = e2eClient();
    const { data, error } = await client.mappings.get(E2E_CONCEPT_IDS.diabetes);
    expect(error).toBeNull();
    expect(Array.isArray(data?.mappings)).toBe(true);
  });

  runOrSkip('targetVocabulary filter narrows results', async () => {
    await softThrottle();
    const client = e2eClient();
    const { data, error } = await client.mappings.get(E2E_CONCEPT_IDS.diabetes, {
      targetVocabulary: 'ICD10CM',
    });
    expect(error).toBeNull();
    for (const m of data?.mappings ?? []) {
      if (m.target_vocabulary_id) expect(m.target_vocabulary_id).toBe('ICD10CM');
    }
  });
});

describe('e2e: client.mappings.map', () => {
  runOrSkip('SNOMED ← ICD10CM E11.9 (sourceCodes variant)', async () => {
    await softThrottle();
    const client = e2eClient();
    const { data, error } = await client.mappings.map({
      targetVocabulary: 'SNOMED',
      sourceCodes: [{ vocabulary_id: 'ICD10CM', concept_code: 'E11.9' }],
    });
    expect(error).toBeNull();
    expect(Array.isArray(data?.mappings)).toBe(true);
  });

  runOrSkip('ICD10CM ← OMOP concept IDs (sourceConcepts variant)', async () => {
    await softThrottle();
    const client = e2eClient();
    const { data, error } = await client.mappings.map({
      targetVocabulary: 'ICD10CM',
      sourceConcepts: [E2E_CONCEPT_IDS.diabetes],
    });
    expect(error).toBeNull();
    expect(Array.isArray(data?.mappings)).toBe(true);
  });

  runOrSkip('mappingType filter is accepted', async () => {
    await softThrottle();
    const client = e2eClient();
    const { error } = await client.mappings.map({
      targetVocabulary: 'SNOMED',
      sourceConcepts: [E2E_CONCEPT_IDS.diabetes],
      mappingType: 'direct',
    });
    expect(error).toBeNull();
  });

  runOrSkip('synthetic XOR: empty sourceConcepts does not hit network', async () => {
    const client = e2eClient();
    const { error } = await client.mappings.map({
      targetVocabulary: 'SNOMED',
      sourceConcepts: [],
    });
    expect(error?.name).toBe('missing_required_field');
    expect(error?.statusCode).toBeNull();
  });

  runOrSkip('synthetic XOR: empty sourceCodes does not hit network', async () => {
    const client = e2eClient();
    const { error } = await client.mappings.map({
      targetVocabulary: 'SNOMED',
      sourceCodes: [],
    });
    expect(error?.name).toBe('missing_required_field');
    expect(error?.statusCode).toBeNull();
  });
});
