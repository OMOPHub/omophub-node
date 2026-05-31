/**
 * Basic usage example for the OMOPHub Node SDK.
 *
 * Run with:
 *   OMOPHUB_API_KEY=oh_... npx tsx examples/basic-usage.ts
 */
import { OMOPHub } from '../src/index.js';

async function main(): Promise<void> {
  // Reads OMOPHUB_API_KEY from the environment. To pass it explicitly:
  //   const client = new OMOPHub('oh_your_api_key');
  const client = new OMOPHub();

  // Get a concept by ID
  const { data: concept, error } = await client.concepts.get(201826);
  if (error) throw new Error(error.message);
  console.log(`Concept: ${concept.concept_name}`);
  console.log(`  Vocabulary: ${concept.vocabulary_id}`);
  console.log(`  Code: ${concept.concept_code}`);
  console.log(`  Domain: ${concept.domain_id}`);
  console.log();

  // Search for concepts — `data.concepts` is always a `Concept[]` after the
  // SDK normalises the wire shape.
  const results = await client.search.basic('diabetes', {
    vocabularyIds: ['SNOMED'],
    pageSize: 5,
  });
  if (results.error) throw new Error(results.error.message);
  console.log("Search results for 'diabetes':");
  for (const c of results.data.concepts) {
    console.log(`  ${c.concept_id}: ${c.concept_name}`);
  }
  console.log();

  // List vocabularies — `data.vocabularies` is the array; pagination meta
  // sits on the outer `result.meta.pagination`.
  const vocabs = await client.vocabularies.list({ pageSize: 5 });
  if (vocabs.error) throw new Error(vocabs.error.message);
  console.log('Available vocabularies:');
  for (const v of vocabs.data.vocabularies) {
    console.log(`  ${v.vocabulary_id}: ${v.vocabulary_name}`);
  }
}

main().catch((err: unknown) => {
  console.error('Failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
