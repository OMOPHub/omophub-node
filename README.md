# OMOPHub Node.js SDK

**Query millions of standardized medical concepts from TypeScript with full type safety**

Access SNOMED CT, ICD-10, RxNorm, LOINC, and 100+ OHDSI ATHENA vocabularies without downloading, installing, or maintaining local databases.

[![npm version](https://img.shields.io/npm/v/@omophub/omophub-node.svg)](https://www.npmjs.com/package/@omophub/omophub-node)
[![Node Version](https://img.shields.io/node/v/@omophub/omophub-node.svg)](https://www.npmjs.com/package/@omophub/omophub-node)
[![Codecov](https://codecov.io/gh/OMOPHub/omophub-node/branch/main/graph/badge.svg)](https://app.codecov.io/gh/OMOPHub/omophub-node?branch=main)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
![Downloads](https://img.shields.io/npm/dm/@omophub/omophub-node)

**[Documentation](https://docs.omophub.com/sdks/node/overview)** ·
**[API Reference](https://docs.omophub.com/api-reference)** ·
**[Examples](https://github.com/OMOPHub/omophub-node/tree/main/examples)**

---

## Why OMOPHub?

Working with OHDSI ATHENA vocabularies traditionally requires downloading multi-gigabyte files, setting up a database instance, and writing complex SQL queries. **OMOPHub eliminates this friction.**

| Traditional Approach | With OMOPHub |
|---------------------|--------------|
| Download 5GB+ ATHENA vocabulary files | `npm install @omophub/omophub-node` |
| Set up and maintain database | One API call |
| Write complex SQL with multiple JOINs | Simple TypeScript methods |
| Manually update vocabularies quarterly | Always current data |
| Local infrastructure required | Runs in Node, Deno, Bun, or any edge runtime |

## Installation

```bash
npm install @omophub/omophub-node
# or pnpm add / yarn add / bun add @omophub/omophub-node
```

Requires **Node ≥ 22**. Also runs in Deno, Bun, Cloudflare Workers, Vercel Edge, and modern browsers (CORS permitting). Pure ESM, zero runtime dependencies.

## Quick Start

```ts
import { OMOPHub } from '@omophub/omophub-node';

// Initialize client (uses OMOPHUB_API_KEY env var, or pass apiKey explicitly)
const client = new OMOPHub();

// Get a concept by ID
const { data, error } = await client.concepts.get(201826);
if (error) throw new Error(error.message);
console.log(data.concept_name); // "Type 2 diabetes mellitus"

// Search for concepts across vocabularies
const search = await client.search.basic('metformin', {
  vocabularyIds: ['RxNorm'],
  domainIds: ['Drug'],
});
for (const c of search.data?.concepts ?? []) {
  console.log(`${c.concept_id}: ${c.concept_name}`);
}

// Map ICD-10 code to SNOMED
const mapping = await client.mappings.map({
  targetVocabulary: 'SNOMED',
  sourceCodes: [{ vocabulary_id: 'ICD10CM', concept_code: 'E11.9' }],
});

// Navigate concept hierarchy
const ancestors = await client.hierarchy.ancestors(201826, { maxLevels: 3 });
```

**Errors are values, not exceptions.** Every method returns a discriminated `{ data, error, meta, headers }` union - narrow with `if (error) ...` and TypeScript types `data` correctly in the success branch. No try/catch boilerplate, no surprise throws on 404s or rate limits.

## FHIR-to-OMOP Resolution

Resolve FHIR coded values to OMOP standard concepts in one call:

```ts
// Single FHIR Coding → OMOP concept + CDM target table
const { data } = await client.fhir.resolve({
  system: 'http://snomed.info/sct',
  code: '44054006',
  resourceType: 'Condition',
});
console.log(data.resolution.target_table); // "condition_occurrence"
console.log(data.resolution.mapping_type); // "direct"

// ICD-10-CM → traverses "Maps to" automatically
const icd = await client.fhir.resolve({
  system: 'http://hl7.org/fhir/sid/icd-10-cm',
  code: 'E11.9',
});
console.log(icd.data?.resolution.standard_concept.vocabulary_id); // "SNOMED"

// Batch resolve up to 100 codings
const batch = await client.fhir.resolveBatch(
  [
    { system: 'http://snomed.info/sct', code: '44054006' },
    { system: 'http://loinc.org', code: '2339-0' },
    { system: 'http://www.nlm.nih.gov/research/umls/rxnorm', code: '197696' },
  ],
);
console.log(`Resolved ${batch.data?.summary?.resolved}/${batch.data?.summary?.total}`);

// CodeableConcept with vocabulary preference (SNOMED wins over ICD-10)
const codeable = await client.fhir.resolveCodeableConcept(
  [
    { system: 'http://snomed.info/sct', code: '44054006' },
    { system: 'http://hl7.org/fhir/sid/icd-10-cm', code: 'E11.9' },
  ],
  { resourceType: 'Condition' },
);
console.log(codeable.data?.best_match?.resolution.source_concept.vocabulary_id); // "SNOMED"
```

The resolver follows the [HL7 FHIR-to-OMOP IG](https://hl7.org/fhir/uv/omop/INFORMATIVE1/en/): it resolves FHIR administrative codes via the IG ConceptMaps, decomposes composite concepts (`Maps to value`), honors `Coding.userSelected`, and can return a `concept_id` 0 sentinel instead of a 404.

```ts
// Administrative gender → person.gender_concept_id (via IG ConceptMap)
await client.fhir.resolve({
  system: 'http://hl7.org/fhir/administrative-gender',
  code: 'male',
});

// A user-selected coding wins over vocabulary preference
await client.fhir.resolveCodeableConcept([
  { system: 'http://snomed.info/sct', code: '44054006' },
  { system: 'http://hl7.org/fhir/sid/icd-10-cm', code: 'E11.9', userSelected: true },
]);

// onUnmapped: 'sentinel' → concept_id 0 record instead of a 404 (one row per input for ETL)
await client.fhir.resolve({
  system: 'http://snomed.info/sct',
  code: '00000000',
  onUnmapped: 'sentinel',
});

// Display-only semantic fallback - no code/system needed
await client.fhir.resolve({ display: 'blood glucose measurement' });
```

Composite concepts (e.g. "Allergy to penicillin") additionally surface `resolution.value_as_concept` (the IG Value-as-Concept pattern). `onUnmapped` is accepted by `resolve()`, `resolveBatch()`, and `resolveCodeableConcept()`.

### FHIR Type Interoperability

The resolver accepts any Coding-like input via TypeScript structural typing - a plain object, the SDK's `Coding` interface, or any object with `system` and `code` properties (e.g. `fhir-kit-client` codings, generated FHIR resource types).

```ts
import type { Coding } from '@omophub/omophub-node';

// SDK's typed interface - IDE autocomplete, no extra deps
const coding: Coding = { system: 'http://snomed.info/sct', code: '44054006' };
const { data } = await client.fhir.resolve({ coding });

// Mixed shapes in a single batch call
await client.fhir.resolveBatch([
  { system: 'http://snomed.info/sct', code: '44054006' },
  { system: 'http://loinc.org', code: '2339-0' },
]);
```

### FHIR Server URL Helper

Point external FHIR client libraries at OMOPHub's hosted FHIR Terminology Service directly - useful when you need raw FHIR `Parameters` / `Bundle` responses instead of the Concept Resolver envelope.

```ts
import { omophubFhirUrl } from '@omophub/omophub-node';

omophubFhirUrl();      // → "https://fhir.omophub.com/fhir/r4"
omophubFhirUrl('r5');  // → "https://fhir.omophub.com/fhir/r5"
omophubFhirUrl('r4b'); // → "https://fhir.omophub.com/fhir/r4b"
```

**When to use which**: the Concept Resolver (`client.fhir.resolve`) gives you OMOP-enriched answers - standard concept ID, CDM target table, mapping quality. Use the FHIR server URL directly with a FHIR client when you need raw FHIR responses for FHIR-native tooling.

## Semantic Search

Use natural language queries to find concepts using neural embeddings:

```ts
// Natural language search - understands clinical intent
const { data } = await client.search.semantic('high blood sugar levels');
for (const r of data?.results ?? []) {
  console.log(`${r.concept_name} (similarity: ${r.similarity_score.toFixed(2)})`);
}

// Filter by vocabulary and set minimum similarity threshold
await client.search.semantic('heart attack', {
  vocabularyIds: ['SNOMED'],
  domainIds: ['Condition'],
  threshold: 0.5,
});

// Iterate through all results with auto-pagination
for await (const r of client.search.semanticIter('chronic kidney disease', { pageSize: 50 })) {
  console.log(`${r.concept_id}: ${r.concept_name}`);
}
```

### Bulk Search

Search for multiple terms in a single API call - much faster than individual requests:

```ts
// Bulk lexical search (up to 50 queries) - `bulkBasic` returns a bare array
const bulk = await client.search.bulkBasic(
  [
    { search_id: 'q1', query: 'diabetes mellitus' },
    { search_id: 'q2', query: 'hypertension' },
    { search_id: 'q3', query: 'aspirin' },
  ],
  { defaults: { vocabulary_ids: ['SNOMED'], page_size: 5 } },
);
for (const item of bulk.data ?? []) {
  console.log(`${item.search_id}: ${item.results.length} results`);
}

// Bulk semantic search (up to 25 queries) - returns a wrapper with aggregate counts
await client.search.bulkSemantic(
  [
    { search_id: 's1', query: 'heart failure treatment options' },
    { search_id: 's2', query: 'type 2 diabetes medication' },
  ],
  { defaults: { threshold: 0.5, page_size: 10 } },
);
```

### Similarity Search

Find concepts similar to a known concept or natural language query:

```ts
// Find concepts similar to a known concept
const sim = await client.search.similar({ conceptId: 201826, algorithm: 'hybrid' });
for (const r of sim.data?.similar_concepts ?? []) {
  console.log(`${r.concept_name} (score: ${r.similarity_score.toFixed(2)})`);
}

// Find similar concepts using a natural language query
await client.search.similar({
  query: 'medications for high blood pressure',
  algorithm: 'semantic',
  similarityThreshold: 0.6,
  vocabularyIds: ['RxNorm'],
  includeScores: true,
});
```

## Async Iteration & Eager Collection

Every paginated resource exposes `*Iter` (lazy async generator) and `*All` (eager collector) variants:

```ts
// Async iterator - walks every page, throws OMOPHubIteratorError on page failure
for await (const c of client.search.basicIter('diabetes', { pageSize: 100 })) {
  await process(c);
}

// Eager collect - accumulates errors as values instead of throwing
const { data, errors, pagesFetched } = await client.search.basicAll('diabetes', {
  maxPages: 10,
});
console.log(`Got ${data.length} concepts across ${pagesFetched} pages, ${errors.length} errors`);
```

## Use Cases

### ETL & Data Pipelines

Validate and map clinical codes during OMOP CDM transformations:

```ts
async function validateAndMap(sourceVocab: string, sourceCode: string): Promise<number | null> {
  const lookup = await client.concepts.getByCode(sourceVocab, sourceCode);
  if (lookup.error || !lookup.data) return null;

  if (lookup.data.standard_concept === 'S') {
    return lookup.data.concept_id;
  }

  const mappings = await client.mappings.get(lookup.data.concept_id, {
    targetVocabulary: 'SNOMED',
  });
  return mappings.data?.mappings[0]?.target_concept_id ?? null;
}
```

### Data Quality Checks

Verify codes exist and are valid standard concepts:

```ts
const conditionCodes = ['E11.9', 'I10', 'J44.9']; // ICD-10 codes
for (const code of conditionCodes) {
  const { data, error } = await client.concepts.getByCode('ICD10CM', code);
  if (error?.name === 'not_found') {
    console.log(`✗ ${code}: Invalid code!`);
  } else if (data) {
    console.log(`✓ ${code}: ${data.concept_name}`);
  }
}
```

### Phenotype Development

Explore hierarchies to build comprehensive concept sets:

```ts
// Get all descendants of "Type 2 diabetes mellitus" for phenotype
const { data } = await client.hierarchy.descendants(201826, { maxLevels: 5 });
const conceptSet = data?.descendants.map((d) => d.concept_id) ?? [];
console.log(`Found ${conceptSet.length} concepts for T2DM phenotype`);
```

### Clinical Applications

Build terminology lookups into healthcare applications - works in Next.js server components, Express, Fastify, Hono, and edge functions:

```ts
// Autocomplete endpoint (Next.js route handler)
export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams.get('q') ?? '';

  const { data } = await client.search.autocomplete(q, {
    vocabularyIds: ['SNOMED'],
    pageSize: 10,
  });
  return Response.json(data?.suggestions ?? []);
}
```

## API Resources

| Resource | Description | Key Methods |
|----------|-------------|-------------|
| `concepts` | Concept lookup, batch ops, suggestions | `get()`, `getByCode()`, `batch()`, `suggest()`, `related()`, `relationships()`, `recommended()` |
| `search` | Full-text and semantic search | `basic()`, `advanced()`, `semantic()`, `similar()`, `bulkBasic()`, `bulkSemantic()`, plus `*Iter` / `*All` |
| `hierarchy` | Navigate concept relationships | `get()`, `ancestors()`, `descendants()` |
| `relationships` | Concept relationship lookup | `get()`, `types()` |
| `mappings` | Cross-vocabulary mappings | `get()`, `map()` |
| `vocabularies` | Vocabulary metadata | `list()`, `get()`, `stats()`, `domainStats()`, `domains()`, `conceptClasses()`, `concepts()` |
| `domains` | Domain catalog | `list()`, `concepts()` |
| `fhir` | FHIR-to-OMOP resolution | `resolve()`, `resolveBatch()`, `resolveCodeableConcept()` |

## Configuration

```ts
const client = new OMOPHub('oh_xxx', {
  baseUrl: 'https://api.omophub.com/v1', // API endpoint
  timeoutMs: 30_000,                      // Request timeout (0 disables)
  maxRetries: 3,                          // Retry attempts (0 disables)
  vocabVersion: '2025.2',                 // Pin a specific vocabulary release
  userAgent: 'my-app/1.0',                // Override default UA
  fetch: customFetch,                     // BYO fetch (e.g. for testing / proxies)
});
```

| Option | Env var | Default |
|---|---|---|
| `apiKey` (1st constructor arg) | `OMOPHUB_API_KEY` | - (required) |
| `baseUrl` | `OMOPHUB_API_URL` | `https://api.omophub.com/v1` |
| `timeoutMs` | - | `30000` |
| `maxRetries` | - | `3` |
| `vocabVersion` | - | unset (server picks latest) |

The client retries `429`, `502`, `503`, `504`, and transient network errors automatically (jittered exponential backoff, `Retry-After` honoured up to 60s). **POST and PATCH only retry when an `Idempotency-Key` header is set** - pass it via `{ idempotencyKey: '...' }`.

## Error Handling

```ts
const { data, error, headers } = await client.concepts.get(999_999_999);
if (error) {
  switch (error.name) {
    case 'not_found':
      console.log(`Concept not found: ${error.message}`);
      break;
    case 'invalid_api_key':
    case 'missing_api_key':
    case 'restricted_api_key':
      console.log('Check your API key');
      break;
    case 'rate_limit_exceeded':
    case 'tier_limit_exceeded':
      console.log(`Rate limited. Retry after ${error.retryAfter}s`);
      break;
    case 'validation_error':
    case 'missing_required_field':
    case 'invalid_argument':
      console.log(`Bad request: ${error.message}`);
      break;
    case 'timeout_error':
    case 'connection_error':
      console.log('Transport error - try again');
      break;
    default:
      console.log(`API error ${error.statusCode}: ${error.message}`);
  }
  return;
}
console.log(data.concept_name); // TypeScript narrows to the success type
```

Async iterators are the **only** API surface that throws - page failures during `for await` raise `OMOPHubIteratorError` (since generators can't yield discriminated errors gracefully):

```ts
import { OMOPHubIteratorError } from '@omophub/omophub-node';

try {
  for await (const c of client.search.basicIter('diabetes')) {
    /* ... */
  }
} catch (e) {
  if (e instanceof OMOPHubIteratorError) {
    console.error(e.code, e.statusCode, e.message);
  }
}
```

Prefer the `*All` variants (`basicAll`, `semanticAll`, etc.) when you want errors as values instead.

## Type Safety

The SDK ships hand-written TypeScript types for every request option and response shape - full IDE autocomplete, no codegen, no `any`.

```ts
import { OMOPHub, type Concept } from '@omophub/omophub-node';

const client = new OMOPHub();
const { data, error } = await client.concepts.get(201826);
if (error) throw new Error(error.message);

// `data` is narrowed to `Concept`
const c: Concept = data;
c.concept_id;        // number
c.concept_name;      // string
c.vocabulary_id;     // string
c.domain_id;         // string
c.concept_class_id;  // string
c.standard_concept;  // 'S' | 'C' | 'N' | null
```

Request options are camelCase TypeScript; wire fields are snake_case. The SDK converts between them at the request boundary - you write `{ vocabularyIds: ['SNOMED'] }` and the server sees `vocabulary_ids=SNOMED`.

## Runtime Support

| Runtime | Status | Notes |
|---|---|---|
| Node.js ≥ 22 | First-class | Primary target |
| Deno ≥ 1.40 | First-class | Native `fetch`, ESM-only |
| Bun ≥ 1.0 | First-class | Native `fetch`, ESM-only |
| Cloudflare Workers | Supported | Pure ESM, no Node built-ins required |
| Vercel Edge | Supported | Same as Workers |
| Browser | Supported | CORS configured on `api.omophub.com` |

## Compared to Alternatives

| Feature | OMOPHub SDK | ATHENA Download | OHDSI WebAPI |
|---------|-------------|-----------------|--------------|
| Setup time | 1 minute | Hours | Hours |
| Infrastructure | None | Database required | Full OHDSI stack |
| Updates | Automatic | Manual download | Manual |
| TypeScript types | First-class | None | Generated from OpenAPI |
| Edge runtime support | Yes | N/A | No |

**Best for:** Teams who need quick, type-safe access to OMOP vocabularies from JavaScript/TypeScript without infrastructure overhead.

## Documentation

- [Full Documentation](https://docs.omophub.com/sdks/node/overview)
- [API Reference](https://docs.omophub.com/api-reference)
- [Examples](https://github.com/OMOPHub/omophub-node/tree/main/examples)
- [Get API Key](https://dashboard.omophub.com/api-keys)

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

```bash
# Clone and install for development
git clone https://github.com/OMOPHub/omophub-node.git
cd omophub-node
npm install

# Run tests
npm test                   # unit tests
npm run test:e2e           # integration tests (requires OMOPHUB_API_KEY)
npm run typecheck && npm run lint && npm run build
```

## Support

- [GitHub Issues](https://github.com/OMOPHub/omophub-node/issues)
- [GitHub Discussions](https://github.com/OMOPHub/omophub-node/discussions)
- Email: support@omophub.com
- Website: [omophub.com](https://omophub.com)

## License

MIT License - see [LICENSE](./LICENSE) for details.

---

*Built for the OHDSI community*
