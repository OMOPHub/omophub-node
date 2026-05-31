# @omophub/omophub-node

Official Node.js / TypeScript SDK for [OMOPHub](https://omophub.com) — search, lookup, map, and navigate OHDSI medical vocabularies (SNOMED, ICD10, RxNorm, LOINC, and 100+ more) from JavaScript. API reference at [docs.omophub.com](https://docs.omophub.com).

## Install

```bash
npm install @omophub/omophub-node
```

Requires Node ≥ 22. Runs in Node, modern browsers (CORS permitting), and edge runtimes (Cloudflare Workers, Vercel Edge).

## Quick start

```ts
import { OMOPHub } from '@omophub/omophub-node';

const client = new OMOPHub(process.env.OMOPHUB_API_KEY);

const { data, error } = await client.concepts.get(201826);
if (error) throw new Error(error.message);
console.log(data.concept_name); // → "Type 2 diabetes mellitus"
```

Every method returns a discriminated `{ data, error, meta, headers }` — errors are values, not exceptions. Narrow with `if (error) ...` and TypeScript will type `data` correctly in the success branch.

## Configuration

| Option | Env var | Default |
|---|---|---|
| `apiKey` (1st constructor arg) | `OMOPHUB_API_KEY` | — (required) |
| `baseUrl` | `OMOPHUB_API_URL` | `https://api.omophub.com/v1` |
| `timeoutMs` | — | `30000` (set to `0` to disable) |
| `maxRetries` | — | `3` (set to `0` to disable) |
| `vocabVersion` | — | unset (server picks latest) |
| `userAgent` | — | `omophub-node/<version>` |
| `fetch` | — | `globalThis.fetch` |

```ts
const client = new OMOPHub('oh_...', {
  baseUrl: 'https://staging.api.omophub.com/v1',
  timeoutMs: 60_000,
  maxRetries: 5,
  vocabVersion: '2025.1',
});
```

## Resources

The client exposes 8 resources covering the full OMOPHub API surface.

### Concepts

```ts
// Single concept by OMOP ID
await client.concepts.get(201826, { includeRelationships: true });

// By native vocabulary code
await client.concepts.getByCode('SNOMED', '44054006');

// Up to 100 concepts in one call
await client.concepts.batch({ conceptIds: [201826, 1112807] });

// Type-ahead concept suggestions
await client.concepts.suggest('diab', { pageSize: 5 });

// Phoebe-style related concepts
await client.concepts.related(201826, { minScore: 0.5 });

// Relationship list for a concept
await client.concepts.relationships(201826);

// OHDSI Phoebe recommendations
await client.concepts.recommended({ conceptIds: [201826], standardOnly: true });
```

### Search

```ts
// Keyword search — normalises both modern and legacy response shapes
const { data } = await client.search.basic('diabetes', {
  vocabularyIds: ['SNOMED'],
  standardConcept: 'S',
  pageSize: 50,
});
console.log(data.concepts.length);

// Async iterator — walk every page
for await (const c of client.search.basicIter('diabetes', { pageSize: 100 })) {
  console.log(c.concept_id);
}

// Eager collect across pages
const { data: allConcepts, errors } = await client.search.basicAll('diabetes', {
  maxPages: 5,
});

// Advanced (POST) — relationship filters
await client.search.advanced('diabetes', {
  relationshipFilters: [{ relationshipId: 'Is a', targetConceptId: 4034964 }],
});

// Semantic (embedding-based) search
await client.search.semantic('high blood sugar', { threshold: 0.85 });

// Bulk: 50 basic / 25 semantic searches per call
await client.search.bulkBasic([
  { search_id: 'q1', query: 'diabetes' },
  { search_id: 'q2', query: 'hypertension' },
]);

// Similarity search (exactly one of conceptId / conceptName / query)
await client.search.similar({ conceptId: 201826, algorithm: 'hybrid' });
```

### Vocabularies

```ts
await client.vocabularies.list({ includeStats: true });
await client.vocabularies.get('SNOMED');
await client.vocabularies.stats('SNOMED');
await client.vocabularies.domainStats('SNOMED', 'Condition');
await client.vocabularies.domains();           // vocab-scoped
await client.vocabularies.conceptClasses();
await client.vocabularies.concepts('SNOMED', { search: 'diabetes', pageSize: 100 });
```

### Domains

```ts
await client.domains.list();                                   // ~20-row catalog
await client.domains.concepts('Condition', { pageSize: 100 });
```

### Hierarchy

```ts
await client.hierarchy.get(201826, { format: 'graph', maxLevels: 5 });
await client.hierarchy.ancestors(201826, { vocabularyIds: ['SNOMED'] });
await client.hierarchy.descendants(201826, { maxLevels: 3, domainIds: ['Condition'] });
```

### Relationships

```ts
await client.relationships.get(201826, { standardOnly: true });
await client.relationships.types();
```

### Mappings

```ts
await client.mappings.get(201826, { targetVocabulary: 'ICD10CM' });

// Map by OMOP concept IDs
await client.mappings.map({
  targetVocabulary: 'SNOMED',
  sourceConcepts: [201826, 1112807],
});

// Map by native vocabulary codes
await client.mappings.map({
  targetVocabulary: 'SNOMED',
  sourceCodes: [
    { vocabulary_id: 'ICD10CM', concept_code: 'E11.9' },
    { vocabulary_id: 'ICD10CM', concept_code: 'I10' },
  ],
});
```

### FHIR

```ts
// Resolve a single FHIR coding to its OMOP standard concept
const { data } = await client.fhir.resolve({
  system: 'http://snomed.info/sct',
  code: '44054006',
  resourceType: 'Condition',
});
console.log(data.resolution.standard_concept.concept_name);
console.log(data.resolution.target_table); // → "condition_occurrence"

// Up to 100 codings at once
await client.fhir.resolveBatch(
  [
    { system: 'http://snomed.info/sct', code: '44054006' },
    { system: 'http://hl7.org/fhir/sid/icd-10-cm', code: 'E11.9' },
  ],
  { resourceType: 'Condition', includeQuality: true },
);

// CodeableConcept resolution (up to 20 codings, picks best match)
await client.fhir.resolveCodeableConcept(
  [
    { system: 'http://snomed.info/sct', code: '44054006', userSelected: true },
    { system: 'http://hl7.org/fhir/sid/icd-10-cm', code: 'E11.9' },
  ],
  { text: 'Type 2 diabetes mellitus' },
);
```

## Error handling

Every method returns a discriminated union — never throws on network or API errors.

```ts
const { data, error, headers } = await client.concepts.get(999_999_999);
if (error) {
  console.error(error.name, error.message, error.statusCode);
  if (error.name === 'rate_limit_exceeded') {
    console.log('Retry after', error.retryAfter, 'seconds');
  }
  return;
}
console.log(data.concept_name); // narrowed
```

Error codes (`error.name`):

| Code | Cause |
|---|---|
| `invalid_api_key`, `restricted_api_key`, `missing_api_key` | 401 / 403 |
| `not_found` | 404 |
| `validation_error`, `missing_required_field`, `invalid_argument` | 400 |
| `method_not_allowed`, `conflict` | 405 / 409 |
| `rate_limit_exceeded`, `tier_limit_exceeded` | 429 |
| `service_unavailable`, `internal_server_error` | 5xx |
| `connection_error`, `timeout_error` | Transport |
| `application_error` | Catch-all |

The client retries `429`, `502`, `503`, `504`, and transient network errors automatically (jittered exponential backoff, `Retry-After` honoured up to 60s). **POST and PATCH only retry when an `Idempotency-Key` header is set** — pass it via `{ idempotencyKey: '...' }`.

## Async iterators

`*Iter` variants are async generators — they throw `OMOPHubIteratorError` if a page fails, since generators can't yield discriminated errors gracefully. `*All` variants accumulate errors into the return value:

```ts
import { OMOPHubIteratorError } from '@omophub/omophub-node';

try {
  for await (const c of client.search.basicIter('diabetes')) {
    console.log(c.concept_id);
  }
} catch (e) {
  if (e instanceof OMOPHubIteratorError) {
    console.error(e.code, e.statusCode);
  }
}

// Or the value-based variant:
const { data, errors, pagesFetched } = await client.search.basicAll('diabetes', {
  maxPages: 10,
});
```

## Standalone helpers

```ts
import {
  omophubFhirUrl,
  getApiKey,
  setApiKey,
  hasApiKey,
} from '@omophub/omophub-node';

// Pointer to OMOPHub's hosted FHIR Terminology Service
omophubFhirUrl();        // → "https://fhir.omophub.com/fhir/r4"
omophubFhirUrl('r5');    // → "https://fhir.omophub.com/fhir/r5"

// Env-backed key helpers
getApiKey();             // process.env.OMOPHUB_API_KEY
setApiKey('oh_...');     // writes the env var
hasApiKey();             // boolean
```

## Migration from the Python or R SDK

| Python | Node | Notes |
|---|---|---|
| `client.concepts.get(201826)` | `client.concepts.get(201826)` | Same |
| `client.concepts.batch(concept_ids=[1,2])` | `client.concepts.batch({ conceptIds: [1,2] })` | Options object |
| `client.search.basic(query, vocabulary_ids=[...])` | `client.search.basic(query, { vocabularyIds: [...] })` | camelCase options |
| `client.mappings.map('SNOMED', source_concepts=[1])` | `client.mappings.map({ targetVocabulary: 'SNOMED', sourceConcepts: [1] })` | All in options |
| `client.fhir.resolve(system='...', code='...')` | `client.fhir.resolve({ system: '...', code: '...' })` | Single options object |

Wire-format snake_case is preserved on **response** types (`data.concept_id`, `data.vocabulary_id`) — same as Python and R. Option keys are camelCase in TS and converted to snake_case at the request boundary.

## License

MIT — see [LICENSE](./LICENSE).
