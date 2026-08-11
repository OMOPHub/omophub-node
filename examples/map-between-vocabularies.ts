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

  // Type 2 diabetes mellitus (SNOMED, standard)
  const conceptId = 201826;

  // `get()` returns ONE page. `meta.pagination` is the only thing that says
  // whether it was the whole set — see getEveryMapping() below.
  const { data, error } = await client.mappings.get(conceptId);
  if (error) {
    console.log(`API error: ${error.message}`);
    return;
  }

  console.log(`Mappings for concept ${conceptId} (this page: ${data.mappings.length}):`);
  for (const m of data.mappings.slice(0, 10)) {
    // A mapping row carries only these fields. `target_vocabulary_id` and
    // `target_concept_code` are optional on the type because this endpoint
    // does not return them — fetch the target concept if you need them.
    console.log(`  ${m.relationship_id}: ${m.target_concept_id} ${m.target_concept_name}`);
  }
}

/**
 * Find which ICD-10-CM codes correspond to a SNOMED concept.
 *
 * Note the DIRECTION. `Maps to` always points at a *standard* concept, and
 * ICD-10-CM is non-standard, so `targetVocabulary: 'ICD10CM'` on the default
 * relationship matches nothing — it returns an empty list rather than an
 * error. The codes that roll up INTO a standard concept need `Mapped from`.
 */
async function mapToSpecificVocabulary(): Promise<void> {
  console.log('\n=== Mapping to a Specific Vocabulary ===');
  const client = new OMOPHub();

  const conceptId = 201826;

  const { data: empty } = await client.mappings.get(conceptId, {
    targetVocabulary: 'ICD10CM',
  });
  console.log(`  'Maps to' + ICD10CM:     ${empty?.mappings.length ?? 0} rows (as expected)`);

  const icd = await client.mappings.getAll(conceptId, {
    relationshipIds: ['Mapped from'],
    targetVocabulary: 'ICD10CM',
  });
  console.log(`  'Mapped from' + ICD10CM: ${icd.data.length} rows`);
  for (const m of icd.data.slice(0, 5)) {
    console.log(`    ← ${m.target_concept_id} ${m.target_concept_name}`);
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

/**
 * Walk every page instead of trusting the first one.
 *
 * This is the one to copy when you are building a code list: a partial code
 * list is wrong in a way nothing in the result reveals.
 */
async function getEveryMapping(): Promise<void> {
  console.log('\n=== Every Mapping (all pages) ===');
  const client = new OMOPHub();

  const conceptId = 201826;

  // Eager: one array, errors accumulated rather than thrown, so a partial
  // result is distinguishable from a complete one.
  const { data, errors, pagesFetched } = await client.mappings.getAll(conceptId);
  const [firstError] = errors;
  if (firstError) {
    console.log(`  Incomplete — ${errors.length} page(s) failed: ${firstError.message}`);
  }
  console.log(`  ${data.length} mappings across ${pagesFetched} page(s)`);

  // Streaming: same walk, one mapping at a time, without holding them all.
  let count = 0;
  for await (const _m of client.mappings.getIter(conceptId)) count++;
  console.log(`  getIter yielded the same ${count}`);
}

/**
 * Composite concepts decompose across TWO relationships, and the default
 * returns only the first — you learn the patient is allergic to *a drug*
 * but not *which* drug.
 */
async function valueAsConcept(): Promise<void> {
  console.log('\n=== Value-as-Concept ===');
  const client = new OMOPHub();

  const conceptId = 4167462; // Allergy to penicillin G

  const { data, error } = await client.mappings.get(conceptId, {
    relationshipIds: ['Maps to', 'Maps to value'],
  });
  if (error) {
    console.log(`API error: ${error.message}`);
    return;
  }

  for (const m of data.mappings) {
    // `Maps to` → the OMOP concept column; `Maps to value` → value_as_concept_id.
    const column = m.relationship_id === 'Maps to value' ? 'value_as_concept_id' : 'concept_id';
    console.log(`  ${m.relationship_id}: ${m.target_concept_name} → ${column}`);
  }
}

/** Deprecated mappings are returned by default; pass false to drop them. */
async function excludeInvalid(): Promise<void> {
  console.log('\n=== Valid Mappings Only ===');
  const client = new OMOPHub();

  const conceptId = 201826;
  const withInvalid = await client.mappings.getAll(conceptId);
  const validOnly = await client.mappings.getAll(conceptId, { includeInvalid: false });

  console.log(`  default (includes deprecated): ${withInvalid.data.length}`);
  console.log(`  includeInvalid: false:         ${validOnly.data.length}`);
}

async function main(): Promise<void> {
  await getMappings();
  await mapToSpecificVocabulary();
  await getEveryMapping();
  await valueAsConcept();
  await excludeInvalid();
  await mapConcepts();
  await mapByNativeCode();
  await lookupByCode();
}

main().catch((err: unknown) => {
  console.error('Failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
