/**
 * Navigate concept hierarchies using the OMOPHub Node SDK.
 *
 * Demonstrates: ancestors, descendants, and relationship grouping.
 *
 * Run with:
 *   OMOPHUB_API_KEY=oh_... npx tsx examples/navigate-hierarchy.ts
 */
import { OMOPHub } from '../src/index.js';

async function getAncestors(client: OMOPHub): Promise<void> {
  console.log('=== Concept Ancestors ===');
  // Type 2 diabetes mellitus (SNOMED)
  const conceptId = 201826;

  const { data, error } = await client.hierarchy.ancestors(conceptId, {
    maxLevels: 5,
    includeDistance: true,
  });
  if (error) throw new Error(error.message);

  console.log(`Ancestors of concept ${conceptId}:`);
  for (const a of data.ancestors.slice(0, 10)) {
    const level = a.min_levels_of_separation ?? a.level ?? '?';
    console.log(`  Level ${level}: ${a.concept_name}`);
  }
}

async function getDescendants(client: OMOPHub): Promise<void> {
  console.log('\n=== Concept Descendants ===');
  // Diabetes mellitus (SNOMED — broader concept)
  const conceptId = 201820;

  const { data, error } = await client.hierarchy.descendants(conceptId, {
    maxLevels: 2,
    includeInvalid: false,
  });
  if (error) throw new Error(error.message);

  console.log(`Descendants of concept ${conceptId}:`);
  for (const d of data.descendants.slice(0, 10)) {
    const level = d.min_levels_of_separation ?? d.level ?? '?';
    console.log(`  Level ${level}: ${d.concept_name}`);
  }
}

async function exploreRelationships(client: OMOPHub): Promise<void> {
  console.log('\n=== Concept Relationships ===');
  // Aspirin
  const conceptId = 1112807;

  const { data, error, meta } = await client.relationships.get(conceptId, {
    pageSize: 100,
  });
  if (error) throw new Error(error.message);

  console.log(`Relationships for concept ${conceptId}:`);
  console.log(`  Total: ${meta?.pagination?.total_items ?? data.relationships.length}`);

  // Group by relationship type
  const byType = new Map<string, typeof data.relationships>();
  for (const r of data.relationships) {
    const list = byType.get(r.relationship_id) ?? [];
    list.push(r);
    byType.set(r.relationship_id, list);
  }

  let shown = 0;
  for (const [relType, rels] of byType) {
    if (shown >= 5) break;
    console.log(`\n  ${relType}:`);
    for (const r of rels.slice(0, 3)) {
      // The wire embeds the related concept under `concept_2` (the queried
      // concept itself is `concept_1`).
      console.log(`    → ${r.concept_2?.concept_name ?? '?'}`);
    }
    shown++;
  }
}

/**
 * Bonus: get the full hierarchy graph in one call (flat or graph format).
 */
async function getFullHierarchy(client: OMOPHub): Promise<void> {
  console.log('\n=== Full Hierarchy (graph format) ===');
  const { data, error } = await client.hierarchy.get(201826, {
    format: 'graph',
    maxLevels: 2,
    vocabularyIds: ['SNOMED'],
  });
  if (error) {
    // Server may validate maxLevels strictly; tolerate non-network errors.
    console.log(`  Hierarchy returned ${error.name}: ${error.message}`);
    return;
  }
  console.log(`  Nodes: ${data.nodes?.length ?? 0}, Edges: ${data.edges?.length ?? 0}`);
  if (data.summary) {
    console.log(`  Max depth: ${data.summary.max_hierarchy_depth}`);
    console.log(`  Unique vocabularies: ${data.summary.unique_vocabularies}`);
  }
}

async function main(): Promise<void> {
  // Construct inside main() so OMOPHubError on missing API key is caught
  // by the .catch() handler below instead of crashing at module load.
  const client = new OMOPHub();
  await getAncestors(client);
  await getDescendants(client);
  await exploreRelationships(client);
  await getFullHierarchy(client);
}

main().catch((err: unknown) => {
  console.error('Failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
