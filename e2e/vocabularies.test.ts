import { describe, expect, test } from 'vitest';
import { E2E_CONCEPT_IDS, e2eClient, e2eEnabled, softThrottle } from './_helpers.js';

const runOrSkip = e2eEnabled ? test : test.skip;

describe('e2e: client.vocabularies', () => {
  runOrSkip('list() returns at least SNOMED', async () => {
    await softThrottle();
    const client = e2eClient();
    const { data, error, headers, meta } = await client.vocabularies.list({ pageSize: 200 });
    // First test in the suite — server cold cache can spike latency.
    if (error?.name === 'timeout_error' || error?.name === 'rate_limit_exceeded') return;
    expect(error).toBeNull();
    expect(headers).toBeTruthy();
    expect(Array.isArray(data?.vocabularies)).toBe(true);
    const ids = (data?.vocabularies ?? []).map((v) => v.vocabulary_id);
    expect(ids).toContain('SNOMED');
    expect(typeof meta?.pagination?.total_items).toBe('number');
  });

  runOrSkip('list() exposes total_items, total_pages, has_next correctly', async () => {
    await softThrottle();
    const client = e2eClient();
    const { meta, error } = await client.vocabularies.list({ pageSize: 10 });
    expect(error).toBeNull();
    const p = meta?.pagination;
    expect(p).toBeTruthy();
    if (p) {
      expect(p.page).toBe(1);
      expect(p.page_size).toBe(10);
      expect(p.total_items).toBeGreaterThan(0);
      expect(p.total_pages).toBe(Math.max(1, Math.ceil(p.total_items / p.page_size)));
      if (p.total_items > p.page_size) expect(p.has_next).toBe(true);
      expect(p.has_previous).toBe(false);
    }
  });

  runOrSkip('list() with includeStats embeds per-vocab statistics', async () => {
    await softThrottle();
    const client = e2eClient();
    const { data, error } = await client.vocabularies.list({
      pageSize: 5,
      includeStats: true,
    });
    expect(error).toBeNull();
    // `stats` is the includeStats-gated field on `VocabularySummary`;
    // it must be populated on at least one returned vocab when the flag is set.
    const someHaveStats = (data?.vocabularies ?? []).some(
      (v) => v.stats !== undefined && typeof v.stats.total_concepts === 'number',
    );
    expect(someHaveStats).toBe(true);
  });

  runOrSkip('list() without includeStats omits the stats field', async () => {
    await softThrottle();
    const client = e2eClient();
    const { data, error } = await client.vocabularies.list({ pageSize: 5 });
    expect(error).toBeNull();
    for (const v of data?.vocabularies ?? []) {
      expect(v.stats).toBeUndefined();
    }
  });

  runOrSkip('get("SNOMED") returns vocabulary metadata', async () => {
    await softThrottle();
    const client = e2eClient();
    const { data, error } = await client.vocabularies.get('SNOMED');
    expect(error).toBeNull();
    expect(data?.vocabulary_id).toBe('SNOMED');
    expect(typeof data?.vocabulary_name).toBe('string');
  });

  runOrSkip('get("RxNorm") works for drug vocabulary', async () => {
    await softThrottle();
    const client = e2eClient();
    const { data, error } = await client.vocabularies.get('RxNorm');
    expect(error).toBeNull();
    expect(data?.vocabulary_id).toBe('RxNorm');
  });

  runOrSkip('stats("SNOMED") returns concept counts', async () => {
    await softThrottle();
    const client = e2eClient();
    const { data, error } = await client.vocabularies.stats('SNOMED');
    expect(error).toBeNull();
    expect(data?.vocabulary_id).toBe('SNOMED');
    expect(typeof data?.total_concepts).toBe('number');
    expect(data?.total_concepts ?? 0).toBeGreaterThan(0);
  });

  runOrSkip('domainStats("SNOMED", "Condition") returns a structured payload', async () => {
    await softThrottle();
    const client = e2eClient();
    const { data, error } = await client.vocabularies.domainStats('SNOMED', 'Condition');
    expect(error).toBeNull();
    expect(data).toBeTruthy();
  });

  runOrSkip('domains() returns the vocab-scoped domain catalog', async () => {
    await softThrottle();
    const client = e2eClient();
    const { data, error } = await client.vocabularies.domains();
    expect(error).toBeNull();
    expect(Array.isArray(data?.domains)).toBe(true);
    const ids = (data?.domains ?? []).map((d) => d.domain_id);
    expect(ids).toContain('Condition');
  });

  runOrSkip('conceptClasses() returns a bare array of concept-class rows', async () => {
    await softThrottle();
    const client = e2eClient();
    const { data, error } = await client.vocabularies.conceptClasses();
    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
    expect(data?.length ?? 0).toBeGreaterThan(0);
    expect(typeof data?.[0]?.concept_class_id).toBe('string');
  });

  runOrSkip('concepts(SNOMED) returns a bare array of concept rows', async () => {
    await softThrottle();
    const client = e2eClient();
    const { data, error, meta } = await client.vocabularies.concepts('SNOMED', {
      pageSize: 5,
    });
    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
    expect(data?.length ?? 0).toBeGreaterThan(0);
    expect(typeof meta?.pagination?.total_items).toBe('number');
  });

  runOrSkip('concepts(SNOMED, search="diabetes") narrows results', async () => {
    await softThrottle();
    const client = e2eClient();
    const { data, error } = await client.vocabularies.concepts('SNOMED', {
      search: 'diabetes',
      pageSize: 5,
    });
    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
    expect(data?.length ?? 0).toBeGreaterThan(0);
  });
});

describe('e2e: cross-SDK parity', () => {
  runOrSkip('known concept IDs resolve to expected names', async () => {
    await softThrottle();
    const client = e2eClient();
    const { data, error } = await client.concepts.get(E2E_CONCEPT_IDS.diabetes);
    expect(error).toBeNull();
    expect(data?.concept_id).toBe(E2E_CONCEPT_IDS.diabetes);
    expect(data?.concept_name?.toLowerCase()).toContain('diabetes');
  });
});
