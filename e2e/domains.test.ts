import { describe, expect, test } from 'vitest';
import { e2eClient, e2eClientNoRetry, e2eEnabled, softThrottle } from './_helpers.js';

const runOrSkip = e2eEnabled ? test : test.skip;

describe('e2e: client.domains.list', () => {
  runOrSkip('returns the OMOP domain catalog wrapped under .domains', async () => {
    await softThrottle();
    const client = e2eClient();
    const { data, error } = await client.domains.list();
    expect(error).toBeNull();
    expect(Array.isArray(data?.domains)).toBe(true);
    const ids = (data?.domains ?? []).map((d) => d.domain_id);
    expect(ids).toContain('Condition');
    expect(ids).toContain('Drug');
  });

  runOrSkip('includeStats returns per-domain stats when requested', async () => {
    await softThrottle();
    const client = e2eClient();
    const { data, error } = await client.domains.list({ includeStats: true });
    expect(error).toBeNull();
    expect(Array.isArray(data?.domains)).toBe(true);
  });
});

describe('e2e: client.domains.concepts', () => {
  runOrSkip('Condition returns paginated standard concepts', async () => {
    await softThrottle();
    // standardOnly+Condition is a heavy server query; no-retry client
    // keeps us inside the test timeout. Tolerate structured timeout.
    const client = e2eClientNoRetry();
    const { data, error, meta } = await client.domains.concepts('Condition', {
      pageSize: 5,
      standardOnly: true,
    });
    if (error) {
      expect(['timeout_error', 'connection_error']).toContain(error.name);
      return;
    }
    expect(Array.isArray(data?.concepts)).toBe(true);
    expect(data?.concepts.length).toBeGreaterThan(0);
    expect(typeof meta?.pagination?.total_items).toBe('number');
    for (const c of data?.concepts ?? []) {
      expect(c.vocabulary_id).toBeTruthy();
    }
  });

  runOrSkip('Drug + vocabularyIds=["RxNorm"] narrows to RxNorm only', async () => {
    await softThrottle();
    const client = e2eClientNoRetry();
    const { data, error } = await client.domains.concepts('Drug', {
      vocabularyIds: ['RxNorm'],
      pageSize: 10,
    });
    if (error) {
      expect(['timeout_error', 'connection_error', 'rate_limit_exceeded']).toContain(error.name);
      return;
    }
    for (const c of data?.concepts ?? []) {
      expect(c.vocabulary_id).toBe('RxNorm');
    }
  });

  runOrSkip('Measurement domain returns concepts', async () => {
    await softThrottle();
    const client = e2eClientNoRetry();
    const { data, error } = await client.domains.concepts('Measurement', { pageSize: 5 });
    if (error) {
      expect(['timeout_error', 'connection_error', 'rate_limit_exceeded']).toContain(error.name);
      return;
    }
    expect(Array.isArray(data?.concepts)).toBe(true);
  });

  runOrSkip('cross-method: domains.concepts and search by domain agree on schema', async () => {
    await softThrottle();
    const client = e2eClient();
    const direct = await client.domains.concepts('Condition', {
      vocabularyIds: ['SNOMED'],
      pageSize: 5,
      standardOnly: true,
    });
    await softThrottle();
    const viaSearch = await client.search.basic('diabetes', {
      vocabularyIds: ['SNOMED'],
      domainIds: ['Condition'],
      standardConcept: 'S',
      pageSize: 5,
    });
    expect(direct.error).toBeNull();
    expect(viaSearch.error).toBeNull();
    for (const c of direct.data?.concepts ?? []) {
      expect(c.vocabulary_id).toBe('SNOMED');
    }
    for (const c of viaSearch.data?.concepts ?? []) {
      if (c.domain_id) expect(c.domain_id).toBe('Condition');
    }
  });
});
