/**
 * FHIR Resolver examples for the OMOPHub Node SDK.
 *
 * Translates FHIR coded values (system URI + code) into OMOP standard
 * concepts, CDM target tables, and optional Phoebe recommendations — all
 * in a single API call.
 *
 * Covers:
 *   1. Direct SNOMED resolution
 *   2. ICD-10-CM → SNOMED via "Maps to"
 *   3. LOINC → measurement table
 *   4. RxNorm → drug_exposure table
 *   5. Text-only semantic search fallback
 *   6. vocabularyId bypass (skip URI resolution)
 *   7. Phoebe recommendations
 *   8. Mapping quality signal
 *   9. Batch resolution
 *  10. CodeableConcept resolution
 *  11. Coding-object input form (vs. flat fields)
 *  12. FHIR Terminology Service URL helper
 *
 * Run with:
 *   OMOPHUB_API_KEY=oh_... npx tsx examples/fhir-resolver.ts
 */
import { OMOPHub, omophubFhirUrl } from '../src/index.js';

// ─── 1. Direct SNOMED resolution ─────────────────────────────────────

async function resolveSnomed(client: OMOPHub): Promise<void> {
  console.log('=== 1. SNOMED Direct Resolution ===');
  const { data, error } = await client.fhir.resolve({
    system: 'http://snomed.info/sct',
    code: '44054006',
    resourceType: 'Condition',
  });
  if (error) {
    console.log(`  Error: ${error.message}`);
    return;
  }
  const r = data.resolution;
  console.log(`  Source: ${r.source_concept.concept_name}`);
  console.log(`  Standard: ${r.standard_concept.concept_name}`);
  console.log(`  Mapping type: ${r.mapping_type}`); // "direct"
  console.log(`  Target table: ${r.target_table}`); // "condition_occurrence"
}

// ─── 2. ICD-10-CM → SNOMED via "Maps to" ─────────────────────────────

async function resolveIcd10Mapped(client: OMOPHub): Promise<void> {
  console.log('\n=== 2. ICD-10-CM → SNOMED Mapping ===');
  const { data, error } = await client.fhir.resolve({
    system: 'http://hl7.org/fhir/sid/icd-10-cm',
    code: 'E11.9',
    resourceType: 'Condition',
  });
  if (error) {
    console.log(`  Error: ${error.message}`);
    return;
  }
  const r = data.resolution;
  console.log(`  Source: [${r.source_concept.vocabulary_id}] ${r.source_concept.concept_name}`);
  console.log(
    `  Standard: [${r.standard_concept.vocabulary_id}] ${r.standard_concept.concept_name}`,
  );
  console.log(`  Mapping type: ${r.mapping_type}`); // "mapped" or similar
  console.log(`  Target table: ${r.target_table}`);
}

// ─── 3. LOINC → measurement table ────────────────────────────────────

async function resolveLoinc(client: OMOPHub): Promise<void> {
  console.log('\n=== 3. LOINC → Measurement ===');
  const { data, error } = await client.fhir.resolve({
    system: 'http://loinc.org',
    code: '2339-0', // Glucose [Mass/volume] in Blood
    resourceType: 'Observation',
  });
  if (error) {
    console.log(`  Error: ${error.message}`);
    return;
  }
  console.log(`  Concept: ${data.resolution.standard_concept.concept_name}`);
  console.log(`  Target table: ${data.resolution.target_table}`); // "measurement"
}

// ─── 4. RxNorm → drug_exposure ──────────────────────────────────────

async function resolveRxNorm(client: OMOPHub): Promise<void> {
  console.log('\n=== 4. RxNorm → Drug Exposure ===');
  const { data, error } = await client.fhir.resolve({
    system: 'http://www.nlm.nih.gov/research/umls/rxnorm',
    code: '197696', // Metformin 500 MG Oral Tablet
    resourceType: 'MedicationStatement',
  });
  if (error) {
    console.log(`  Error: ${error.message}`);
    return;
  }
  console.log(`  Concept: ${data.resolution.standard_concept.concept_name}`);
  console.log(`  Target table: ${data.resolution.target_table}`); // "drug_exposure"
}

// ─── 5. Text-only semantic fallback ──────────────────────────────────

async function resolveTextOnly(client: OMOPHub): Promise<void> {
  console.log('\n=== 5. Text-Only (Semantic Fallback) ===');
  const { data, error } = await client.fhir.resolve({
    display: 'Blood Sugar',
    resourceType: 'Observation',
  });
  if (error) {
    console.log(`  Error: ${error.message}`);
    return;
  }
  const r = data.resolution;
  console.log(`  Standard: ${r.standard_concept.concept_name}`);
  console.log(`  Mapping type: ${r.mapping_type}`); // "semantic_match" or similar
  if (r.similarity_score !== undefined) {
    console.log(`  Similarity: ${r.similarity_score.toFixed(2)}`);
  }
}

// ─── 6. vocabularyId bypass (skip URI resolution) ────────────────────

async function resolveVocabularyIdBypass(client: OMOPHub): Promise<void> {
  console.log('\n=== 6. vocabularyId Bypass ===');
  // If you already know the OMOP vocabulary, skip the system-URI lookup.
  const { data, error } = await client.fhir.resolve({
    vocabularyId: 'ICD10CM',
    code: 'E11.9',
  });
  if (error) {
    console.log(`  Error: ${error.message}`);
    return;
  }
  console.log(`  Resolved: ${data.resolution.standard_concept.concept_name}`);
}

// ─── 7. Phoebe recommendations ───────────────────────────────────────

async function resolveWithRecommendations(client: OMOPHub): Promise<void> {
  console.log('\n=== 7. With Phoebe Recommendations ===');
  const { data, error } = await client.fhir.resolve({
    system: 'http://snomed.info/sct',
    code: '44054006',
    includeRecommendations: true,
    recommendationsLimit: 5,
  });
  if (error) {
    console.log(`  Error: ${error.message}`);
    return;
  }
  const recs = data.resolution.recommendations ?? [];
  console.log(`  Got ${recs.length} recommendations:`);
  for (const r of recs.slice(0, 5)) {
    console.log(`    ${r.concept_name} (${r.domain_id ?? '?'})`);
  }
}

// ─── 8. Mapping quality signal ───────────────────────────────────────

async function resolveWithQuality(client: OMOPHub): Promise<void> {
  console.log('\n=== 8. With Quality Signal ===');
  const { data, error } = await client.fhir.resolve({
    system: 'http://snomed.info/sct',
    code: '44054006',
    includeQuality: true,
  });
  if (error) {
    console.log(`  Error: ${error.message}`);
    return;
  }
  console.log(`  Mapping quality: ${data.resolution.mapping_quality ?? '?'}`);
  // Common buckets: "high", "medium", "low", "manual_review"
}

// ─── 9. Batch resolution (up to 100 codings) ─────────────────────────

async function resolveBatchExample(client: OMOPHub): Promise<void> {
  console.log('\n=== 9. Batch Resolution ===');
  const { data, error } = await client.fhir.resolveBatch(
    [
      { system: 'http://snomed.info/sct', code: '44054006' },
      { system: 'http://loinc.org', code: '2339-0' },
      { system: 'http://www.nlm.nih.gov/research/umls/rxnorm', code: '197696' },
    ],
    { includeQuality: true },
  );
  if (error) {
    console.log(`  Error: ${error.message}`);
    return;
  }
  console.log(`  Summary: ${data.summary.resolved}/${data.summary.total} resolved`);
  for (const item of data.results) {
    const r = item.resolution;
    console.log(
      `    ${r.source_concept.concept_code} → ${r.standard_concept.concept_name} → ${r.target_table}`,
    );
  }
}

// ─── 10. CodeableConcept resolution (up to 20 codings) ───────────────

async function resolveCodeableConceptExample(client: OMOPHub): Promise<void> {
  console.log('\n=== 10. CodeableConcept Resolution ===');
  // The resolver picks the best match per OHDSI vocabulary preference
  // (SNOMED > RxNorm > LOINC > CVX > ICD10).
  const { data, error } = await client.fhir.resolveCodeableConcept(
    [
      { system: 'http://snomed.info/sct', code: '44054006' },
      { system: 'http://hl7.org/fhir/sid/icd-10-cm', code: 'E11.9' },
    ],
    { resourceType: 'Condition' },
  );
  if (error) {
    console.log(`  Error: ${error.message}`);
    return;
  }
  if (data.best_match) {
    // best_match is wrapped as { input, resolution } — same shape
    // `fhir.resolve()` returns for a single coding.
    const r = data.best_match.resolution;
    console.log(
      `  Best match: ${r.standard_concept.concept_name} (${r.source_concept.vocabulary_id})`,
    );
  }
  console.log(`  Alternatives: ${data.alternatives.length}`);
  console.log(`  Unresolved: ${data.unresolved.length}`);
}

// ─── 11. Coding-object input form ────────────────────────────────────

async function resolveWithCodingObject(client: OMOPHub): Promise<void> {
  console.log('\n=== 11. Coding-Object Input ===');
  // Equivalent to the flat form — useful when you have a FHIR `Coding`
  // already serialized as an object.
  const { data, error } = await client.fhir.resolve({
    coding: {
      system: 'http://snomed.info/sct',
      code: '44054006',
      display: 'Type 2 diabetes mellitus',
      userSelected: true,
    },
    resourceType: 'Condition',
  });
  if (error) {
    console.log(`  Error: ${error.message}`);
    return;
  }
  console.log(`  Resolved: ${data.resolution.standard_concept.concept_name}`);
  // Flat fields take precedence when both are supplied — handy for
  // patching a single field without rebuilding the coding object.
}

// ─── 12. FHIR Terminology Service URL helper ─────────────────────────

function fhirServiceUrls(): void {
  console.log('\n=== 12. FHIR Terminology Service URLs ===');
  console.log(`  R4 : ${omophubFhirUrl()}`); // default
  console.log(`  R4B: ${omophubFhirUrl('r4b')}`);
  console.log(`  R5 : ${omophubFhirUrl('r5')}`);
  console.log(`  R6 : ${omophubFhirUrl('r6')}`);
  // Point your favourite FHIR client at these to hit the raw FHIR endpoints
  // (CodeSystem/$lookup, ValueSet/$expand, etc.) outside the OMOP envelope.
}

async function main(): Promise<void> {
  // Construct inside main() so OMOPHubError on missing API key is caught
  // by the .catch() handler below instead of crashing at module load.
  const client = new OMOPHub();
  await resolveSnomed(client);
  await resolveIcd10Mapped(client);
  await resolveLoinc(client);
  await resolveRxNorm(client);
  await resolveTextOnly(client);
  await resolveVocabularyIdBypass(client);
  await resolveWithRecommendations(client);
  await resolveWithQuality(client);
  await resolveBatchExample(client);
  await resolveCodeableConceptExample(client);
  await resolveWithCodingObject(client);
  fhirServiceUrls();
}

main().catch((err: unknown) => {
  console.error('Failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
