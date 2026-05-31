/**
 * Map concepts between vocabularies using the OMOPHub Node SDK.
 *
 * Run with:
 *   OMOPHUB_API_KEY=oh_... npx tsx examples/map-between-vocabularies.ts
 */
import { OMOPHub } from '../src/index.js';

async function getMappings(): Promise<void> {
  console.log('=== Concept Mappings ===');
  const client = new OMOPHub();

  // Type 2 diabetes mellitus (SNOMED)
  const conceptId = 201826;
  const { data, error } = await client.mappings.get(conceptId, {
    targetVocabulary: 'ICD10CM',
  });
  if (error) {
    console.log(`API error: ${error.message}`);
    return;
  }

  console.log(`Mappings for concept ${conceptId} → ICD10CM:`);
  console.log(`  Total mappings: ${data.summary?.total_mappings ?? data.mappings.length}`);

  for (const m of data.mappings.slice(0, 10)) {
    console.log(`\n  [${m.target_vocabulary_id}] ${m.target_concept_code}`);
    console.log(`    Name: ${m.target_concept_name}`);
    console.log(`    Type: ${m.mapping_type}`);
  }
}

async function mapConcepts(): Promise<void> {
  console.log('\n=== Batch Concept Mapping ===');
  const client = new OMOPHub();

  // Map SNOMED concepts to ICD-10-CM
  const { data, error } = await client.mappings.map({
    targetVocabulary: 'ICD10CM',
    sourceConcepts: [201826, 4329847], // Type 2 diabetes, Myocardial infarction
  });
  if (error) {
    console.log(`API error: ${error.message}`);
    return;
  }

  console.log(`Mapped ${data.mappings.length} concepts to ICD-10-CM`);
  if (data.summary) {
    console.log(
      `  ${data.summary.mapped_concepts ?? '?'}/${data.summary.total_source_concepts ?? '?'} source concepts mapped`,
    );
  }

  for (const m of data.mappings) {
    console.log(`\n  ${m.source_concept_name}`);
    console.log(`    → [${m.target_concept_code}] ${m.target_concept_name}`);
  }
}

async function mapByNativeCode(): Promise<void> {
  console.log('\n=== Map by Native Vocabulary Codes ===');
  const client = new OMOPHub();

  // Map ICD-10-CM codes directly (no need to resolve to OMOP IDs first)
  const { data, error } = await client.mappings.map({
    targetVocabulary: 'SNOMED',
    sourceCodes: [
      { vocabulary_id: 'ICD10CM', concept_code: 'E11.9' }, // Type 2 diabetes w/o complications
      { vocabulary_id: 'ICD10CM', concept_code: 'I10' }, // Essential hypertension
    ],
  });
  if (error) {
    console.log(`API error: ${error.message}`);
    return;
  }

  for (const m of data.mappings) {
    console.log(`  ${m.source_vocabulary_id} ${m.source_concept_code}`);
    console.log(`    → ${m.target_concept_name} (${m.target_vocabulary_id})`);
  }
}

async function lookupByCode(): Promise<void> {
  console.log('\n=== Code Lookup and Mapping ===');
  const client = new OMOPHub();

  // Look up ICD-10-CM code E11 (Type 2 diabetes mellitus)
  const { data: concept, error: lookupErr } = await client.concepts.getByCode('ICD10CM', 'E11');
  if (lookupErr) {
    console.log(`Lookup failed: ${lookupErr.message}`);
    return;
  }

  console.log(`Found: ${concept.concept_name}`);
  console.log(`  Vocabulary: ${concept.vocabulary_id}`);
  console.log(`  Standard: ${concept.standard_concept ?? 'N/A'}`);

  // If it's not a standard concept, find its mappings
  if (concept.standard_concept !== 'S') {
    const { data: mappings, error: mapErr } = await client.mappings.get(concept.concept_id);
    if (mapErr) {
      console.log(`  Mappings failed: ${mapErr.message}`);
      return;
    }
    console.log('\n  Mappings to other vocabularies:');
    for (const m of mappings.mappings.slice(0, 5)) {
      const vocab = m.target_vocabulary_id ?? '?';
      console.log(`    → ${m.target_concept_name} (${vocab})`);
    }
  }
}

async function main(): Promise<void> {
  await getMappings();
  await mapConcepts();
  await mapByNativeCode();
  await lookupByCode();
}

main().catch((err: unknown) => {
  console.error('Failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
