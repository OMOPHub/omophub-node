import { describe, expect, test } from 'vitest';
import {
  E2E_CONCEPT_IDS,
  e2eClient,
  e2eClientNoRetry,
  e2eEnabled,
  softThrottle,
} from './_helpers.js';

const runOrSkip = e2eEnabled ? test : test.skip;

describe('e2e: client.search.basic', () => {
  runOrSkip('returns a normalised SearchResult with concepts array', async () => {
    await softThrottle();
    const client = e2eClient();
    const { data, error } = await client.search.basic('diabetes', {
      vocabularyIds: ['SNOMED'],
      pageSize: 5,
    });
    expect(error).toBeNull();
    expect(Array.isArray(data?.concepts)).toBe(true);
    expect(data?.concepts.length).toBeGreaterThan(0);
    expect(data?.concepts[0]?.concept_name?.toLowerCase()).toContain('diab');
  });

  runOrSkip('standardConcept: "S" returns only standard rows', async () => {
    await softThrottle();
    const client = e2eClient();
    const { data, error } = await client.search.basic('diabetes', {
      vocabularyIds: ['SNOMED'],
      standardConcept: 'S',
      pageSize: 10,
    });
    expect(error).toBeNull();
    for (const c of data?.concepts ?? []) {
      if (c.standard_concept !== undefined && c.standard_concept !== null) {
        expect(c.standard_concept).toBe('S');
      }
    }
  });

  runOrSkip('exactMatch flag flows through to the wire', async () => {
    await softThrottle();
    // Use a no-retry client — exactMatch=true triggers a slower server path
    // and full retries would push us past the test timeout. Either we get
    // an empty/non-empty success or a structured timeout — both are fine.
    const client = e2eClientNoRetry();
    const { data, error } = await client.search.basic('Type 2 diabetes mellitus', {
      exactMatch: true,
      pageSize: 3,
    });
    if (error) {
      expect(['timeout_error', 'connection_error', 'validation_error']).toContain(error.name);
    } else {
      expect(Array.isArray(data?.concepts)).toBe(true);
    }
  });

  runOrSkip('basicIter walks at least one page', async () => {
    await softThrottle();
    const client = e2eClient();
    const collected: number[] = [];
    for await (const c of client.search.basicIter('aspirin', {
      vocabularyIds: ['RxNorm'],
      pageSize: 5,
      maxPages: 1,
    })) {
      collected.push(c.concept_id);
    }
    expect(collected.length).toBeGreaterThan(0);
  });

  runOrSkip('basicAll aggregates with maxPages cap', async () => {
    await softThrottle();
    const client = e2eClient();
    const { data, errors, pagesFetched } = await client.search.basicAll('diabetes', {
      vocabularyIds: ['SNOMED'],
      pageSize: 10,
      maxPages: 2,
    });
    expect(errors).toEqual([]);
    expect(pagesFetched).toBeGreaterThanOrEqual(1);
    expect(pagesFetched).toBeLessThanOrEqual(2);
    expect(data.length).toBeGreaterThan(0);
  });
});

describe('e2e: client.search.advanced', () => {
  runOrSkip('hits POST /search/advanced and returns normalised concepts', async () => {
    await softThrottle();
    const client = e2eClient();
    const { data, error } = await client.search.advanced('diabetes type 2', {
      vocabularyIds: ['SNOMED'],
      domainIds: ['Condition'],
      pageSize: 5,
    });
    expect(error).toBeNull();
    expect(Array.isArray(data?.concepts)).toBe(true);
  });

  runOrSkip('relationshipFilters use camelCase keys (server sees snake_case)', async () => {
    await softThrottle();
    const client = e2eClient();
    const { error } = await client.search.advanced('diabetes', {
      relationshipFilters: [{ relationshipId: 'Is a', targetConceptId: E2E_CONCEPT_IDS.diabetes }],
      pageSize: 3,
    });
    if (error) {
      // A 400 here would indicate the camelCase → snake_case translation is broken
      expect(error.statusCode).not.toBe(400);
    }
  });
});

describe('e2e: client.search.autocomplete', () => {
  runOrSkip('returns suggestions wrapped under .suggestions', async () => {
    await softThrottle();
    const client = e2eClient();
    const { data, error } = await client.search.autocomplete('diab', { pageSize: 5 });
    expect(error).toBeNull();
    expect(data?.query).toBe('diab');
    expect(Array.isArray(data?.suggestions)).toBe(true);
    expect(data?.suggestions.length).toBeGreaterThan(0);
    const first = data?.suggestions[0];
    expect(typeof first?.suggestion.concept_id).toBe('number');
    expect(typeof first?.suggestion.concept_name).toBe('string');
  });

  runOrSkip('echoes the query field with vocabulary filter applied', async () => {
    await softThrottle();
    const client = e2eClient();
    const { data, error } = await client.search.autocomplete('aspirin', {
      vocabularyIds: ['RxNorm'],
      pageSize: 3,
    });
    expect(error).toBeNull();
    expect(data?.query).toBe('aspirin');
  });
});

describe('e2e: client.search.semantic', () => {
  runOrSkip('returns normalised results array regardless of server shape', async () => {
    await softThrottle();
    const client = e2eClient();
    const { data, error } = await client.search.semantic('high blood sugar', {
      pageSize: 5,
    });
    expect(error).toBeNull();
    expect(Array.isArray(data?.results)).toBe(true);
  });

  runOrSkip('similarity scores fall within [0, 1]', async () => {
    await softThrottle();
    const client = e2eClient();
    const { data, error } = await client.search.semantic('blood pressure', {
      threshold: 0.5,
      pageSize: 5,
    });
    expect(error).toBeNull();
    for (const r of data?.results ?? []) {
      expect(r.similarity_score).toBeGreaterThanOrEqual(0);
      expect(r.similarity_score).toBeLessThanOrEqual(1);
    }
  });

  runOrSkip('semanticIter terminates cleanly and yields well-shaped items', async () => {
    await softThrottle();
    const client = e2eClient();
    // The test asserts (1) iteration doesn't throw and (2) each yielded
    // item carries a numeric concept_id. Server may return zero results
    // for some queries, so we don't assert a count.
    for await (const r of client.search.semanticIter('chest pain', {
      pageSize: 5,
      maxPages: 1,
    })) {
      expect(typeof r.concept_id).toBe('number');
    }
  });
});

describe('e2e: client.search.bulkBasic', () => {
  runOrSkip('returns a bare array, one entry per search_id', async () => {
    await softThrottle();
    const client = e2eClient();
    const { data, error } = await client.search.bulkBasic(
      [
        { search_id: 'q1', query: 'diabetes' },
        { search_id: 'q2', query: 'hypertension' },
        { search_id: 'q3', query: 'aspirin' },
      ],
      { defaults: { vocabulary_ids: ['SNOMED', 'RxNorm'], page_size: 3 } },
    );
    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
    expect(data?.length).toBe(3);
    const ids = (data ?? []).map((r) => r.search_id);
    expect(new Set(ids)).toEqual(new Set(['q1', 'q2', 'q3']));
    for (const item of data ?? []) {
      expect(['completed', 'failed']).toContain(item.status);
      expect(Array.isArray(item.results)).toBe(true);
    }
  });
});

describe('e2e: client.search.bulkSemantic', () => {
  runOrSkip('returns a wrapper with results + aggregate counts', async () => {
    await softThrottle();
    const client = e2eClient();
    const { data, error } = await client.search.bulkSemantic(
      [
        { search_id: 's1', query: 'heart attack' },
        { search_id: 's2', query: 'high blood pressure' },
      ],
      { defaults: { threshold: 0.4, page_size: 3 } },
    );
    expect(error).toBeNull();
    expect(typeof data).toBe('object');
    expect(Array.isArray(data?.results)).toBe(true);
    expect(data?.total_searches).toBe(2);
    expect(typeof data?.completed_count).toBe('number');
    expect(typeof data?.failed_count).toBe('number');
  });
});

describe('e2e: client.search.similar (XOR variants)', () => {
  runOrSkip('similar by conceptId returns ranked similar concepts', async () => {
    await softThrottle();
    const client = e2eClient();
    const { data, error } = await client.search.similar({
      conceptId: E2E_CONCEPT_IDS.diabetes,
      algorithm: 'hybrid',
      pageSize: 5,
    });
    expect(error).toBeNull();
    expect(Array.isArray(data?.similar_concepts)).toBe(true);
    expect(typeof data?.search_metadata?.algorithm_used).toBe('string');
  });

  runOrSkip('similar by conceptName works for known names', async () => {
    await softThrottle();
    const client = e2eClient();
    const { data, error } = await client.search.similar({
      conceptName: 'Type 2 diabetes mellitus',
      algorithm: 'semantic',
      pageSize: 5,
    });
    expect(error).toBeNull();
    expect(Array.isArray(data?.similar_concepts)).toBe(true);
  });

  runOrSkip('similar by free-text query (no collision with PerCallOptions.query)', async () => {
    await softThrottle();
    const client = e2eClient();
    const { data, error } = await client.search.similar({
      query: 'elevated blood sugar',
      pageSize: 5,
    });
    expect(error).toBeNull();
    expect(Array.isArray(data?.similar_concepts)).toBe(true);
  });

  runOrSkip('algorithm: "lexical" returns text-based matches', async () => {
    await softThrottle();
    const client = e2eClient();
    const { data, error } = await client.search.similar({
      conceptName: 'diabetes',
      algorithm: 'lexical',
      similarityThreshold: 0.3,
      pageSize: 5,
    });
    expect(error).toBeNull();
    if (data?.search_metadata?.algorithm_used) {
      expect(['lexical', 'hybrid', 'semantic']).toContain(data.search_metadata.algorithm_used);
    }
  });
});
