# Changelog

All notable changes to this project will be documented in this file. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Initial scaffolding: `OMOPHub` client skeleton with API key + base URL resolution, env-var precedence, and constructor-time validation.
- TypeScript build (ES2022, NodeNext, strict mode).
- Biome v2 lint + format.
- Vitest test runner with v8 coverage and a 90% statements threshold.
- CI workflow on Node 22 and 24 (`build`, `lint`, `typecheck`, `test`).
- npm publish workflow triggered by GitHub release, with provenance attestation.
- HTTP layer: `get` / `post` / `patch` / `put` / `delete` methods on `OMOPHub` with retry on 429 + 502/503/504 + network errors. Full-jitter exponential backoff (500ms → 8s), `Retry-After` honoured up to 60s.
- Discriminated `Response<T> = { data, error, meta, headers }` return type — errors never throw from network paths.
- 16-code `OMOPHUB_ERROR_CODE_KEY` union with stable codes mapped from HTTP status + server-provided error codes.
- `OMOPHubError` (thrown only on constructor misuse) and `OMOPHubIteratorError` (thrown from future async iterators).
- Common request-option interfaces: `PerCallOptions`, `GetOptions`, `PostOptions` (with `idempotencyKey`), `PatchOptions`, `PutOptions`, `DeleteOptions`.
- Pagination types: `PaginationOptions`, `PaginationMeta`, `PaginatedData<T>`.
- Vocab-release mixin + utility types (`RequireAtLeastOne`, `RequireExactlyOne`).
- Query builder: camelCase → snake_case, array → comma-join, null/undefined dropped.
- Envelope unwrap: tolerates both `{ success, data, meta }` and raw payload bodies.
- AbortSignal composition: client timeout + caller signal merged via `AbortSignal.any`; caller aborts propagate as thrown `AbortError`, timeouts return `timeout_error`.
- `X-Vocab-Version` header injection when `vocabVersion` option is set.
- First resource: `client.vocabularies.list()` with snake_case query serialisation, pagination, and error mapping.
- Test fixtures (`DIABETES_CONCEPT_ID` etc.) and mock-fetch helpers for `vi.fn`-based testing without external mock libraries.

### Changed

- Retries are now gated by `isRetryableRequest(method, headers)`: idempotent verbs (GET/HEAD/OPTIONS/PUT/DELETE) always retry, but POST/PATCH only retry when an `Idempotency-Key` header is set. Prevents accidental duplicate writes on transient failures.
- Response body is drained via `response.body?.cancel()` before sleeping for a retry, releasing the undici connection back to the pool.
- `publishConfig.access` set to `public` so scoped-package publishes don't fall through to npm's default restricted access.
- **Resource method shape switched from "two options objects" to "positional path args + merged options"** — e.g. `client.concepts.get(201826, { includeRelationships: true })` rather than `client.concepts.get({ conceptId: 201826, includeRelationships: true })`. Matches Python/R ergonomics. `vocabularies.list` migrated to the new shape.

### Added (resources)

- `client.concepts` — 7 methods: `get`, `getByCode`, `batch`, `suggest`, `related`, `relationships`, `recommended`. `concepts.get(0)` accepts the OMOP unmapped sentinel (R-SDK bug fix). `batch` validates 1–100 IDs synthetically; `recommended` validates `conceptIds` ≤ 100, `relationshipTypes` ≤ 20, `vocabularyIds`/`domainIds` ≤ 50.
- `client.vocabularies` extended with 6 methods: `get`, `stats`, `domainStats`, `domains` (vocab-scoped), `conceptClasses`, `concepts`.
- `client.domains` — 2 methods: `list`, `concepts`.
- `client.search` — 11 methods: `basic`, `basicIter`, `basicAll`, `advanced`, `autocomplete`, `semantic`, `semanticIter`, `semanticAll`, `bulkBasic`, `bulkSemantic`, `similar`. `bulkBasic` validates 1–50 searches; `bulkSemantic` validates 1–25; `similar` enforces XOR of `conceptId`/`conceptName`/`query` both at the TS type level (discriminated union) and at runtime.
- `client.hierarchy` — 3 methods: `get` (flat or graph format), `ancestors`, `descendants`. Server caps `maxLevels` at 20.
- `client.relationships` — 2 methods: `get` (shares wire endpoint with `concepts.relationships` — kept as parallel discoverable surface), `types`.
- `client.mappings` — 2 methods: `get` and `map`. `map` enforces XOR of `sourceConcepts` vs `sourceCodes` at both type and runtime levels. `vocabRelease` is routed to the `?vocab_release=` query parameter rather than the JSON body (matches Python SDK convention). JSDoc documents the Procedure-domain vocabulary priority chain (SNOMED → LOINC → CPT4 → HCPCS → ICD10PCS → ICD9Proc → OPCS4 → OMOP Extension).
- `ConceptHierarchyNode` extended with `domain_id`, `concept_class_id`, `standard_concept` optional fields — now matches Python's `HierarchyConcept` and is re-exported as `HierarchyConcept`/`Ancestor`/`Descendant` from the hierarchy module.
- `ConceptRelationship` re-exported as `Relationship` from the relationships module — kept in sync via type alias.
- `client.fhir` — 3 methods: `resolve` (accepts both flat `{ system, code }` and nested `{ coding: {...} }` forms, mirroring the Python SDK's `_extract_coding`), `resolveBatch` (1–100 codings), `resolveCodeableConcept` (1–20 codings). All three validate synthetically before issuing requests.
- Standalone helpers (no client required):
  - `omophubFhirUrl(version)` — returns the URL of OMOPHub's hosted FHIR Terminology Service (`'r4'` default, also `'r4b'`, `'r5'`, `'r6'`).
  - `getApiKey()`, `setApiKey(key)`, `hasApiKey()` — env-backed helpers reading `OMOPHUB_API_KEY` from `process.env`. `setApiKey` throws `OMOPHubError` on edge runtimes that lack a writable `process.env`.
- FHIR `Coding` type uses camelCase (`userSelected`, `vocabularyId`) to match the FHIR JSON spec — converted to snake_case at the wire via `toSnakeCaseKeys`.
- README polish: install + config table + per-resource usage examples for all 8 resources + error-handling guide + async-iterator guide + Python/R migration table.

### SDK surface at v0.1.0 — 37 methods across 8 resources

```
client.concepts      — get, getByCode, batch, suggest, related, relationships, recommended   (7)
client.search        — basic, basicIter, basicAll, advanced, autocomplete, semantic,
                       semanticIter, semanticAll, bulkBasic, bulkSemantic, similar           (11)
client.vocabularies  — list, get, stats, domainStats, domains, conceptClasses, concepts      (7)
client.domains       — list, concepts                                                        (2)
client.hierarchy     — get, ancestors, descendants                                           (3)
client.relationships — get, types                                                            (2)
client.mappings      — get, map                                                              (2)
client.fhir          — resolve, resolveBatch, resolveCodeableConcept                         (3)
                                                                                          Σ = 37

Standalone: omophubFhirUrl, getApiKey, setApiKey, hasApiKey
```

### Fixed (post-PR-6 e2e validation against live API — first pass)

The initial 23-test e2e smoke suite uncovered response-shape drift between speculative types and the actual live API. Two of these (`vocabularies.concepts`, `vocabularies.conceptClasses`) were superseded by the comprehensive integration sweep below:

- `vocabularies.list` → `ListVocabulariesResult = { vocabularies: Vocabulary[] }` (was union of bare array / generic `PaginatedData<Vocabulary>`).
- `vocabularies.concepts` → first typed as `{ concepts: [...] }`; **superseded** to bare `Concept[]` after the wider sweep.
- `vocabularies.domains` → `ListVocabularyDomainsResult = { domains: VocabularyDomain[] }`.
- `vocabularies.conceptClasses` → first typed as `{ concept_classes: [...] }`; **superseded** to bare `ConceptClass[]` after the wider sweep.
- `domains.list` → `ListDomainsResult = { domains: Domain[] }`.
- `domains.concepts` → `DomainConceptsResult = { concepts: ConceptSummary[] }`.
- `search.autocomplete` → `AutocompleteResult = { query: string, suggestions: AutocompleteEntry[] }`. Each entry nests the concept under `suggestion` and may carry `match_score` / `match_type`.

**Pattern (refined after deeper integration testing):** the API uses named-wrapper objects for *most* collection responses but a handful of endpoints return bare arrays. See the "Confirmed wire patterns" section below for the authoritative list. Pagination metadata consistently lives on the outer envelope `Response.meta.pagination`, never nested inside `data`.

### Added (testing — comprehensive integration sweep)

- E2E test suite (`e2e/`) — **121 integration tests across 11 files** hitting `api.omophub.com/v1` live, gated by `OMOPHUB_API_KEY` (auto-skip when unset, never fail). Coverage:
  - Per-resource happy-path + edge-case tests for all 8 resources.
  - **`auth.test.ts`** — bad/empty API keys → live 401 mapping.
  - **`server-errors.test.ts`** — 404/400/empty across resources.
  - **`url-encoding.test.ts`** — slashes, spaces, ampersand, hash, Cyrillic, Japanese in queries.
  - **`pagination.test.ts`** — `basicAll` maxPages cap, iterator early-break, has_next detection, partial-result accumulation.
  - **`abort-timeout.test.ts`** — pre-aborted signal re-throws `AbortError`, mid-request abort, very-short `timeoutMs` returns `timeout_error`.
  - **`hierarchy-relationships-mappings.test.ts`** — flat-vs-graph format, includeReverse parity, mapping vocabRelease query routing.
  - **`fhir.test.ts`** — flat vs. nested coding forms, batch summary counts, includeQuality string, XOR validation.
- `vitest.e2e.config.ts` with sequential execution + 500 ms soft throttle + 90 s per-test timeout for live-API latency.
- Minimal `.env` loader (no `dotenv` runtime dep).
- `npm run test:e2e` script + `tsconfig.e2e.json`.
- `e2eClient()` (full retries + 45 s timeout) and `e2eClientNoRetry()` (no retries + 20 s timeout) helpers for happy-path vs. expected-error test paths.

### Fixed (post-integration shape drift — 9 more wire-shape corrections)

The expanded integration sweep uncovered additional response-shape mismatches the initial 23-test smoke suite hadn't exercised:

- `vocabularies.concepts(vocabId)` → `VocabularyConceptsResult = Concept[]` (bare array, was speculatively typed as `{ concepts: [...] }`).
- `vocabularies.conceptClasses()` → `ListConceptClassesResult = ConceptClass[]` (bare array, was `{ concept_classes: [...] }`).
- `concepts.get(id, { includeRelationships })` → `Concept.relationships?: { parents?: ConceptRelationshipNode[]; children?: ConceptRelationshipNode[] }` — the include-flag form returns a compact `{ parents, children }` shape, **not** a flat `ConceptRelationship[]`. New `ConceptRelationshipNode` type added.
- `Concept` extended with `is_valid?`, `is_standard?`, `is_classification?` boolean convenience fields the server populates.
- `concepts.related(id)` → `RelatedConceptsResult = RelatedConcept[]` (bare array, was `{ related_concepts: [...] }`). `RelatedConcept` fields corrected: `relationship_id` / `relationship_name` / `relationship_score` / `relationship_distance` (was speculative `relatedness_score` / `relatedness_type`).
- `concepts.recommended({ conceptIds: [...] })` → `RecommendedConceptsResult = Record<string, RecommendedConceptEntry[]>` — keyed by source concept ID **as a string**, not a flat `{ recommendations: [...] }`. Use `Object.entries(data)` to iterate.
- `search.bulkBasic` → `BulkBasicSearchResponse = BulkBasicResultItem[]` (bare array, was `{ results, total_searches, ... }` wrapper).
- `search.bulkSemantic` stays as a wrapper (`{ results, total_searches, completed_count, failed_count, total_duration? }`) — **different from `bulkBasic`**, the semantic endpoint adds aggregate counts.
- `FhirResolution.mapping_quality?: string` (bucket name like `'high'` / `'medium'` / `'low'` / `'manual_review'`, was speculatively typed as `Record<string, unknown>`).
- Dropped speculative `ConceptRecommendation` interface (replaced by `RecommendedConceptEntry` keyed by source ID).

### Confirmed wire patterns

After the full integration sweep, the API's actual conventions:

- **List endpoints are inconsistent**: most use named wrappers (`{ vocabularies }`, `{ domains }`, `{ relationship_types }`), but several return bare arrays (`vocabularies.concepts`, `vocabularies.conceptClasses`, `concepts.related`, `search.bulkBasic`). No way to predict from method name alone — the SDK types are now wire-accurate.
- **Single-resource endpoints** return the resource directly (`concepts.get`, `vocabularies.get`, etc.).
- **Pagination metadata** lives on the outer `Response.meta.pagination`, never inside `data`.
- **Server-side error handling varies**: unknown domains return `200 + { concepts: [] }`, unknown vocabularies return a structured 400/404, hierarchy validates `maxLevels` rather than silently capping.
- **Known slow paths**: `getByCode + includeRelationships`, `domains.concepts('Drug', { vocabularyIds: ['RxNorm'] })`, `hierarchy.get('flat')`, `search.basic(..., { exactMatch: true })` can take 25–60 s. The e2e suite tolerates these with the no-retry client + structured-timeout assertions.
- `basic` and `advanced` normalise three known server response shapes (`{ concepts, facets, search_metadata }`, legacy `{ data: [...] }`, bare `Concept[]`) into a stable `SearchResult` — addresses the cross-SDK shape drift documented in `project_search_api_response_shapes.md`.
- `similar` uses a two-arg `(options, requestOptions)` signature (not the merged style) because its `query` XOR field would otherwise collide with `PerCallOptions.query`.
- `paginate<T>()` async generator and `paginateAll<T>()` eager collector in `common/utils/` — generic page-walking helpers used by the search `*Iter` / `*All` variants. The async generator throws `OMOPHubIteratorError` on page failure; `paginateAll` accumulates errors as values.
- `syntheticError<T>(name, message, details?)` helper in `common/utils/` — builds wire-shaped errors for client-side validation without issuing a network call.

<!-- No compare link yet — first tag will be created on the v0.1.0 release. -->

