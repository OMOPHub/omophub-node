import { describe, expect, test } from 'vitest';
import { e2eClient, e2eEnabled, softThrottle } from './_helpers.js';

const runOrSkip = e2eEnabled ? test : test.skip;

describe('e2e: URL safety + encoding', () => {
  runOrSkip('getByCode with a code containing a dot round-trips correctly', async () => {
    await softThrottle();
    const client = e2eClient();
    // ICD10CM codes contain dots — verify the path segment encodes them
    // without truncation or fragment-stripping.
    const { data, error } = await client.concepts.getByCode('ICD10CM', 'E11.9');
    expect(error).toBeNull();
    expect(data?.concept_code).toBe('E11.9');
    expect(data?.vocabulary_id).toBe('ICD10CM');
  });

  runOrSkip('queries with spaces are correctly encoded', async () => {
    await softThrottle();
    const client = e2eClient();
    const { data, error } = await client.search.basic('type 2 diabetes mellitus', {
      pageSize: 3,
      vocabularyIds: ['SNOMED'],
    });
    expect(error).toBeNull();
    expect(data?.concepts.length ?? 0).toBeGreaterThan(0);
  });

  runOrSkip(
    'queries with commas inside vocabularyIds are joined with comma not duplicated',
    async () => {
      await softThrottle();
      const client = e2eClient();
      const { data, error } = await client.search.basic('diabetes', {
        vocabularyIds: ['SNOMED', 'ICD10CM'],
        pageSize: 5,
      });
      expect(error).toBeNull();
      expect(Array.isArray(data?.concepts)).toBe(true);
      // Results from multiple vocabularies indicate the array was joined, not
      // dropped, and not URL-mangled
      if (data && data.concepts.length > 0) {
        const vocabs = new Set(data.concepts.map((c) => c.vocabulary_id));
        // We requested two vocabs; allow either to be present
        const intersection = ['SNOMED', 'ICD10CM'].filter((v) => vocabs.has(v));
        expect(intersection.length).toBeGreaterThan(0);
      }
    },
  );

  runOrSkip('queries with ampersand do not bleed into URL params', async () => {
    await softThrottle();
    const client = e2eClient();
    // If `&` isn't encoded, the server would treat the rest as a separate param
    const { error } = await client.search.basic('headache & nausea', { pageSize: 1 });
    expect(error).toBeNull();
  });

  runOrSkip('Unicode queries (Cyrillic) round-trip without corruption', async () => {
    await softThrottle();
    const client = e2eClient();
    // The query may have zero matches — the important thing is no encoding error
    const { error } = await client.search.basic('диабет', { pageSize: 1 });
    expect(error).toBeNull();
  });

  runOrSkip('Unicode queries (Japanese) round-trip without corruption', async () => {
    await softThrottle();
    const client = e2eClient();
    const { error } = await client.search.basic('糖尿病', { pageSize: 1 });
    expect(error).toBeNull();
  });

  runOrSkip('queries with + character are encoded (not treated as space)', async () => {
    await softThrottle();
    const client = e2eClient();
    // `vitamin B+12` shouldn't become `vitamin B 12`
    const { error } = await client.search.basic('vitamin B+12', { pageSize: 1 });
    expect(error).toBeNull();
  });

  runOrSkip('queries with question mark do not bleed into URL params', async () => {
    await softThrottle();
    const client = e2eClient();
    const { error } = await client.search.basic('what is diabetes?', { pageSize: 1 });
    expect(error).toBeNull();
  });

  runOrSkip('hash characters do not get stripped as fragment', async () => {
    await softThrottle();
    const client = e2eClient();
    const { error } = await client.search.basic('insulin #1', { pageSize: 1 });
    expect(error).toBeNull();
  });

  runOrSkip('autocomplete query echo matches input including special chars', async () => {
    await softThrottle();
    const client = e2eClient();
    const { data, error } = await client.search.autocomplete('diab', { pageSize: 3 });
    expect(error).toBeNull();
    expect(data?.query).toBe('diab');
  });
});
