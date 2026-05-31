import { describe, expect, test } from 'vitest';
import {
  E2E_CONCEPT_IDS,
  e2eClient,
  e2eClientNoRetry,
  e2eEnabled,
  softThrottle,
} from './_helpers.js';

const runOrSkip = e2eEnabled ? test : test.skip;

describe('e2e: client.concepts.get', () => {
  runOrSkip('returns the Type 2 diabetes mellitus row by ID', async () => {
    await softThrottle();
    const client = e2eClient();
    const { data, error } = await client.concepts.get(E2E_CONCEPT_IDS.diabetes);
    expect(error).toBeNull();
    expect(data?.concept_id).toBe(E2E_CONCEPT_IDS.diabetes);
    expect(data?.vocabulary_id).toBe('SNOMED');
    expect(data?.domain_id).toBe('Condition');
    expect(data?.standard_concept).toBe('S');
    expect(typeof data?.valid_start_date).toBe('string');
    expect(typeof data?.valid_end_date).toBe('string');
  });

  runOrSkip('includeSynonyms returns synonyms array', async () => {
    await softThrottle();
    const client = e2eClient();
    const { data, error } = await client.concepts.get(E2E_CONCEPT_IDS.diabetes, {
      includeSynonyms: true,
    });
    expect(error).toBeNull();
    expect(Array.isArray(data?.synonyms)).toBe(true);
  });

  runOrSkip('includeRelationships returns a { parents, children } object', async () => {
    await softThrottle();
    const client = e2eClient();
    const { data, error } = await client.concepts.get(E2E_CONCEPT_IDS.diabetes, {
      includeRelationships: true,
    });
    expect(error).toBeNull();
    expect(data?.relationships).toBeTruthy();
    expect(typeof data?.relationships).toBe('object');
    expect(Array.isArray(data?.relationships?.parents)).toBe(true);
    expect(Array.isArray(data?.relationships?.children)).toBe(true);
  });

  runOrSkip('all four known fixture concepts resolve and stay typed', async () => {
    await softThrottle();
    const client = e2eClient();
    for (const conceptId of Object.values(E2E_CONCEPT_IDS)) {
      const { data, error } = await client.concepts.get(conceptId);
      await softThrottle();
      expect(error).toBeNull();
      expect(data?.concept_id).toBe(conceptId);
      expect(typeof data?.concept_name).toBe('string');
    }
  });

  runOrSkip('vocabRelease pin sends a `vocab_release` query param', async () => {
    // We can't easily verify the URL hit the live API; instead confirm
    // either a successful resolution OR a structured error (NOT a
    // network exception).
    await softThrottle();
    const client = e2eClient();
    const { data, error } = await client.concepts.get(E2E_CONCEPT_IDS.diabetes, {
      vocabRelease: '2025.1',
    });
    if (error) {
      expect(['not_found', 'validation_error', 'application_error']).toContain(error.name);
      return;
    }
    expect(data?.concept_id).toBe(E2E_CONCEPT_IDS.diabetes);
    expect(typeof data?.concept_name).toBe('string');
    expect((data?.concept_name ?? '').toLowerCase()).toContain('diabetes');
  });
});

describe('e2e: client.concepts.getByCode', () => {
  runOrSkip('SNOMED 44054006 → Type 2 diabetes', async () => {
    await softThrottle();
    const client = e2eClient();
    const { data, error } = await client.concepts.getByCode('SNOMED', '44054006');
    expect(error).toBeNull();
    expect(data?.concept_id).toBe(E2E_CONCEPT_IDS.diabetes);
  });

  runOrSkip('round-trip consistency: get(id) and getByCode(vocab, code) match', async () => {
    await softThrottle();
    const client = e2eClient();
    const byId = await client.concepts.get(E2E_CONCEPT_IDS.diabetes);
    await softThrottle();
    const byCode = await client.concepts.getByCode(
      byId.data?.vocabulary_id ?? 'SNOMED',
      byId.data?.concept_code ?? '44054006',
    );
    expect(byId.error).toBeNull();
    expect(byCode.error).toBeNull();
    expect(byCode.data?.concept_id).toBe(byId.data?.concept_id);
    expect(byCode.data?.concept_name).toBe(byId.data?.concept_name);
  });

  runOrSkip(
    'includeRelationships flag flows through and returns { parents, children }',
    async () => {
      await softThrottle();
      // Slow server path: getByCode + includeRelationships can take >25s.
      // No-retry client to stay inside the 60s test timeout; tolerate
      // structured timeout as a valid outcome.
      const client = e2eClientNoRetry();
      const { data, error } = await client.concepts.getByCode('SNOMED', '44054006', {
        includeRelationships: true,
      });
      if (error) {
        expect(['timeout_error', 'connection_error']).toContain(error.name);
        return;
      }
      expect(data?.relationships).toBeTruthy();
      expect(typeof data?.relationships).toBe('object');
    },
  );
});

describe('e2e: client.concepts.batch', () => {
  runOrSkip('returns concepts for multiple IDs', async () => {
    await softThrottle();
    const client = e2eClient();
    const { data, error } = await client.concepts.batch({
      conceptIds: [E2E_CONCEPT_IDS.diabetes, E2E_CONCEPT_IDS.hypertension],
    });
    expect(error).toBeNull();
    expect(Array.isArray(data?.concepts)).toBe(true);
    expect(data?.concepts.length).toBeGreaterThanOrEqual(2);
  });

  runOrSkip('single-id batch is a valid request (length=1, the minimum)', async () => {
    await softThrottle();
    const client = e2eClient();
    const { data, error } = await client.concepts.batch({
      conceptIds: [E2E_CONCEPT_IDS.diabetes],
    });
    expect(error).toBeNull();
    expect(data?.concepts.length).toBeGreaterThanOrEqual(1);
  });

  runOrSkip('all four known fixtures returned as a batch', async () => {
    await softThrottle();
    const client = e2eClient();
    const ids = Object.values(E2E_CONCEPT_IDS);
    const { data, error } = await client.concepts.batch({ conceptIds: ids });
    // Tolerate rate-limit errors when run as part of the full e2e
    // sweep — the suite stays within healthcare-tier quotas but spike
    // bursts can still occur.
    if (error?.name === 'rate_limit_exceeded') return;
    expect(error).toBeNull();
    const returnedIds = new Set((data?.concepts ?? []).map((c) => c.concept_id));
    for (const id of ids) {
      const inResults = returnedIds.has(id);
      const inFailures = data?.failed_concepts?.some((f) => f.concept_id === id) ?? false;
      expect(inResults || inFailures).toBe(true);
    }
  });

  runOrSkip('batch with one unknown ID either omits or reports it in failed_concepts', async () => {
    await softThrottle();
    const client = e2eClient();
    const { data, error } = await client.concepts.batch({
      conceptIds: [E2E_CONCEPT_IDS.diabetes, 999_999_999],
    });
    if (error?.name === 'rate_limit_exceeded') return;
    expect(error).toBeNull();
    const returnedIds = (data?.concepts ?? []).map((c) => c.concept_id);
    expect(returnedIds).toContain(E2E_CONCEPT_IDS.diabetes);
  });

  runOrSkip('synthetic validation: empty array does not hit network', async () => {
    const client = e2eClient();
    const { error } = await client.concepts.batch({ conceptIds: [] });
    expect(error?.name).toBe('validation_error');
    expect(error?.statusCode).toBeNull();
  });

  runOrSkip('synthetic validation: >100 ids does not hit network', async () => {
    const client = e2eClient();
    const tooMany = Array.from({ length: 101 }, (_, i) => 200_000 + i);
    const { error } = await client.concepts.batch({ conceptIds: tooMany });
    expect(error?.name).toBe('validation_error');
    expect(error?.statusCode).toBeNull();
  });
});

describe('e2e: client.concepts.suggest', () => {
  runOrSkip('returns concept-summary entries for a query prefix', async () => {
    await softThrottle();
    // Slow on first-cache-miss; no-retry client to stay inside test budget.
    const client = e2eClientNoRetry();
    const { data, error } = await client.concepts.suggest('diab', {
      pageSize: 5,
      vocabularyIds: ['SNOMED'],
    });
    if (error) {
      expect(['timeout_error', 'connection_error']).toContain(error.name);
      return;
    }
    expect(data).toBeTruthy();
  });
});

describe('e2e: client.concepts.related + cross-method consistency', () => {
  runOrSkip('related returns a bare array of related concepts', async () => {
    await softThrottle();
    const client = e2eClient();
    const { data, error } = await client.concepts.related(E2E_CONCEPT_IDS.diabetes, {
      pageSize: 5,
    });
    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
    if ((data?.length ?? 0) > 0) {
      const first = data?.[0];
      expect(typeof first?.concept_name).toBe('string');
      expect(typeof first?.relationship_id).toBe('string');
    }
  });

  runOrSkip(
    'concepts.relationships and relationships.get produce identical wire results',
    async () => {
      await softThrottle();
      const client = e2eClientNoRetry();
      const a = await client.concepts.relationships(E2E_CONCEPT_IDS.diabetes, {
        pageSize: 5,
        vocabularyIds: ['SNOMED'],
      });
      const transient = ['timeout_error', 'connection_error', 'rate_limit_exceeded'];
      if (a.error && transient.includes(a.error.name)) return;
      await softThrottle();
      const b = await client.relationships.get(E2E_CONCEPT_IDS.diabetes, {
        pageSize: 5,
        vocabularyIds: ['SNOMED'],
      });
      if (b.error && transient.includes(b.error.name)) return;
      expect(a.error).toBeNull();
      expect(b.error).toBeNull();
      expect(a.data?.relationships.length).toBe(b.data?.relationships.length);
    },
  );
});

describe('e2e: client.concepts.recommended', () => {
  runOrSkip('returns recommendations keyed by source concept ID (as string)', async () => {
    await softThrottle();
    const client = e2eClient();
    const { data, error } = await client.concepts.recommended({
      conceptIds: [E2E_CONCEPT_IDS.diabetes],
      pageSize: 10,
    });
    expect(error).toBeNull();
    expect(data).toBeTruthy();
    expect(typeof data).toBe('object');
    // Keyed by source concept ID as a string
    const key = String(E2E_CONCEPT_IDS.diabetes);
    const entries = data?.[key];
    expect(Array.isArray(entries)).toBe(true);
    if (entries && entries.length > 0) {
      expect(typeof entries[0]?.concept_name).toBe('string');
    }
  });
});
