/**
 * Search examples for the OMOPHub Node SDK.
 *
 * Demonstrates: basic search, filtered search, autocomplete, pagination
 * via async iterator, semantic search, similarity search, bulk lexical
 * search, and bulk semantic search.
 *
 * Run with:
 *   OMOPHUB_API_KEY=oh_... npx tsx examples/search-concepts.ts
 */
import { OMOPHub } from '../src/index.js';

async function basicSearch(client: OMOPHub): Promise<void> {
  console.log('=== Basic Search ===');
  // `search.basic` normalises three known wire shapes into a stable
  // `{ concepts, facets?, search_metadata? }` object.
  const { data, error } = await client.search.basic('heart attack');
  if (error) throw new Error(error.message);
  console.log(`Found ${data.concepts.length} concepts for 'heart attack'`);
  for (const c of data.concepts.slice(0, 3)) {
    console.log(`  ${c.concept_id}: ${c.concept_name} (${c.vocabulary_id})`);
  }
}

async function filteredSearch(client: OMOPHub): Promise<void> {
  console.log('\n=== Filtered Search ===');
  const { data, error } = await client.search.basic('myocardial infarction', {
    vocabularyIds: ['SNOMED', 'ICD10CM'],
    domainIds: ['Condition'],
    standardConcept: 'S', // only standard concepts
    pageSize: 10,
  });
  if (error) throw new Error(error.message);
  console.log(`Found ${data.concepts.length} standard condition concepts`);
  for (const c of data.concepts.slice(0, 5)) {
    console.log(`  [${c.vocabulary_id}] ${c.concept_name}`);
  }
}

async function bulkLexicalSearch(client: OMOPHub): Promise<void> {
  console.log('\n=== Bulk Lexical Search ===');
  // `bulkBasic` returns a **bare array** of per-search result items.
  const { data, error } = await client.search.bulkBasic(
    [
      { search_id: 'q1', query: 'diabetes mellitus' },
      { search_id: 'q2', query: 'hypertension' },
      { search_id: 'q3', query: 'aspirin' },
    ],
    { defaults: { vocabulary_ids: ['SNOMED'], page_size: 5 } },
  );
  if (error) throw new Error(error.message);
  for (const item of data) {
    console.log(`  ${item.search_id}: ${item.results.length} results (${item.status})`);
  }

  // Per-query overrides
  const r2 = await client.search.bulkBasic(
    [
      { search_id: 'conditions', query: 'diabetes', domain_ids: ['Condition'] },
      { search_id: 'drugs', query: 'metformin', domain_ids: ['Drug'] },
    ],
    { defaults: { vocabulary_ids: ['SNOMED', 'RxNorm'], page_size: 3 } },
  );
  if (r2.error) throw new Error(r2.error.message);
  console.log('\n  Per-query domain overrides:');
  for (const item of r2.data) {
    console.log(`    ${item.search_id}:`);
    for (const c of item.results.slice(0, 3)) {
      console.log(`      ${c.concept_name} (${c.vocabulary_id}/${c.domain_id})`);
    }
  }
}

async function bulkSemanticSearch(client: OMOPHub): Promise<void> {
  console.log('\n=== Bulk Semantic Search ===');
  // `bulkSemantic` returns a wrapper object — UNLIKE `bulkBasic`.
  const { data, error } = await client.search.bulkSemantic(
    [
      { search_id: 's1', query: 'heart failure treatment options' },
      { search_id: 's2', query: 'type 2 diabetes medication' },
      { search_id: 's3', query: 'elevated blood pressure' },
    ],
    { defaults: { threshold: 0.5, page_size: 5 } },
  );
  if (error) throw new Error(error.message);
  console.log(
    `  Completed ${data.completed_count}/${data.total_searches}` +
      (data.total_duration !== undefined ? ` in ${data.total_duration}ms` : ''),
  );
  for (const item of data.results) {
    console.log(`  ${item.search_id}: ${item.results.length} results (${item.status})`);
    if (item.results.length > 0) {
      const top = item.results[0];
      console.log(
        `    Top: ${top?.concept_name} (score: ${top?.similarity_score.toFixed(2)})`,
      );
    }
  }
}

async function autocompleteExample(client: OMOPHub): Promise<void> {
  console.log('\n=== Autocomplete ===');
  // Returns `{ query, suggestions: [{ suggestion: Concept, match_score?, match_type? }] }`.
  const { data, error } = await client.search.autocomplete('hypert', { pageSize: 5 });
  if (error) throw new Error(error.message);
  console.log(`Suggestions for '${data.query}':`);
  for (const s of data.suggestions.slice(0, 5)) {
    console.log(`  [${s.suggestion.vocabulary_id}] ${s.suggestion.concept_name}`);
  }
}

async function paginationExample(client: OMOPHub): Promise<void> {
  console.log('\n=== Pagination (async iterator) ===');
  // `basicIter` walks every page; throws OMOPHubIteratorError on failure.
  let count = 0;
  for await (const concept of client.search.basicIter('aspirin', { pageSize: 10 })) {
    if (count < 3) console.log(`  ${concept.concept_name}`);
    count++;
    if (count >= 25) break; // demo cap
  }
  if (count > 3) {
    console.log(`  ... ${count - 3} more shown (demo capped at ${count})`);
  }
}

async function semanticSearch(client: OMOPHub): Promise<void> {
  console.log('\n=== Semantic Search ===');
  // Natural-language search — understands clinical intent.
  const a = await client.search.semantic('high blood sugar levels');
  if (a.error) throw new Error(a.error.message);
  for (const r of a.data.results.slice(0, 3)) {
    console.log(`  ${r.concept_name} (similarity: ${r.similarity_score.toFixed(2)})`);
  }

  // Filtered semantic search with minimum threshold
  const b = await client.search.semantic('heart attack', {
    vocabularyIds: ['SNOMED'],
    domainIds: ['Condition'],
    threshold: 0.5,
  });
  if (b.error) throw new Error(b.error.message);
  console.log(`  Found ${b.data.results.length} SNOMED conditions for 'heart attack'`);
}

async function semanticPagination(client: OMOPHub): Promise<void> {
  console.log('\n=== Semantic Pagination ===');
  let count = 0;
  for await (const result of client.search.semanticIter('chronic kidney disease', {
    pageSize: 20,
  })) {
    if (count < 3) console.log(`  ${result.concept_id}: ${result.concept_name}`);
    count++;
    if (count >= 50) break;
  }
  if (count > 3) {
    console.log(`  ... ${count - 3} more (demo capped at ${count})`);
  }
}

async function similaritySearch(client: OMOPHub): Promise<void> {
  console.log('\n=== Similarity Search ===');
  // XOR: provide exactly one of `conceptId`, `conceptName`, or `query`.
  // The discriminated union enforces this at compile time.
  const a = await client.search.similar({
    conceptId: 201826, // Type 2 diabetes mellitus
    algorithm: 'hybrid',
  });
  if (a.error) throw new Error(a.error.message);
  console.log("Concepts similar to 'Type 2 diabetes mellitus':");
  for (const r of a.data.similar_concepts.slice(0, 5)) {
    const score = typeof r.similarity_score === 'number' ? r.similarity_score.toFixed(2) : '?';
    console.log(`  ${r.concept_name} (score: ${score})`);
  }

  // Free-text query variant (`similar` uses a two-arg signature so its
  // `query` field doesn't collide with `PerCallOptions.query`).
  const b = await client.search.similar({
    query: 'medications for high blood pressure',
    algorithm: 'semantic',
    similarityThreshold: 0.6,
    vocabularyIds: ['RxNorm'],
    includeScores: true,
  });
  if (b.error) throw new Error(b.error.message);
  console.log(`\n  Found ${b.data.similar_concepts.length} similar RxNorm concepts`);
}

async function main(): Promise<void> {
  // Construct inside main() so OMOPHubError on missing API key is caught
  // by the .catch() handler below instead of crashing at module load.
  const client = new OMOPHub();
  await basicSearch(client);
  await filteredSearch(client);
  await autocompleteExample(client);
  await paginationExample(client);
  await semanticSearch(client);
  await semanticPagination(client);
  await similaritySearch(client);
  await bulkLexicalSearch(client);
  await bulkSemanticSearch(client);
}

main().catch((err: unknown) => {
  console.error('Failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
