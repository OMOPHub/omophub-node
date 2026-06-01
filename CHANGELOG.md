# Changelog

All notable changes to this project will be documented in this file. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.1] - 2026-06-01

### Changed

- `client.search.semantic()` now calls the canonical path `GET /v1/search/semantic` instead of `GET /v1/concepts/semantic-search`. The legacy path remains a permanent server-side alias, so older SDK installations continue to work — no breaking change. The `User-Agent` and `__version__` are bumped to `1.0.1`.

### Fixed

- Corrected `sortBy` enum values across three options interfaces to match what the API actually accepts. TypeScript users were previously offered values that the server rejects with `validation_error`:
  - `ListVocabulariesOptions.sortBy`: was `'name' | 'concept_count' | 'last_updated'`, now `'name' | 'priority' | 'updated'`.
  - `VocabularyConceptsOptions.sortBy`: was `'name' | 'concept_count' | 'last_updated'`, now `'name' | 'concept_id' | 'concept_code'`.
  - `BasicSearchOptions.sortBy`: was `'relevance' | 'name' | 'concept_count' | 'last_updated'`, now `'relevance' | 'name' | 'code' | 'date'`.

## [1.0.0] - 2026-05-31

### Added

- Initial scaffolding: `OMOPHub` client skeleton with API key + base URL resolution, env-var precedence, and constructor-time validation.
- TypeScript build (ES2022, NodeNext, strict mode).
- Biome v2 lint + format.
- Vitest test runner with v8 coverage and a 90% statements threshold.
- CI workflow on Node 22 and 24 (`build`, `lint`, `typecheck`, `test`).
- npm publish workflow triggered by GitHub release, with provenance attestation.
- HTTP layer: `get` / `post` / `patch` / `put` / `delete` methods on `OMOPHub` with retry on 429 + 502/503/504 + network errors. Full-jitter exponential backoff (500ms → 8s), `Retry-After` honoured up to 60s.
- Discriminated `Response<T> = { data, error, meta, headers }` return type - errors never throw from network paths.
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

### Added (resources)

- `client.concepts` - 7 methods: `get`, `getByCode`, `batch`, `suggest`, `related`, `relationships`, `recommended`. `concepts.get(0)` accepts the OMOP unmapped sentinel (R-SDK bug fix). `batch` validates 1–100 IDs synthetically; `recommended` validates `conceptIds` ≤ 100, `relationshipTypes` ≤ 20, `vocabularyIds`/`domainIds` ≤ 50.
- `client.vocabularies` extended with 6 methods: `get`, `stats`, `domainStats`, `domains` (vocab-scoped), `conceptClasses`, `concepts`.
- `client.domains` - 2 methods: `list`, `concepts`.
- `client.search` - 11 methods: `basic`, `basicIter`, `basicAll`, `advanced`, `autocomplete`, `semantic`, `semanticIter`, `semanticAll`, `bulkBasic`, `bulkSemantic`, `similar`. `bulkBasic` validates 1–50 searches; `bulkSemantic` validates 1–25; `similar` enforces XOR of `conceptId`/`conceptName`/`query` both at the TS type level (discriminated union) and at runtime.
- `client.hierarchy` - 3 methods: `get` (flat or graph format), `ancestors`, `descendants`. Server caps `maxLevels` at 20.
- `client.relationships` - 2 methods: `get` (shares wire endpoint with `concepts.relationships` - kept as parallel discoverable surface), `types`.
- `client.mappings` - 2 methods: `get` and `map`. `map` enforces XOR of `sourceConcepts` vs `sourceCodes` at both type and runtime levels. `vocabRelease` is routed to the `?vocab_release=` query parameter rather than the JSON body (matches Python SDK convention). JSDoc documents the Procedure-domain vocabulary priority chain (SNOMED → LOINC → CPT4 → HCPCS → ICD10PCS → ICD9Proc → OPCS4 → OMOP Extension).
- `ConceptHierarchyNode` extended with `domain_id`, `concept_class_id`, `standard_concept` optional fields - now matches Python's `HierarchyConcept` and is re-exported as `HierarchyConcept`/`Ancestor`/`Descendant` from the hierarchy module.
- `ConceptRelationship` re-exported as `Relationship` from the relationships module - kept in sync via type alias.
- `client.fhir` - 3 methods: `resolve` (accepts both flat `{ system, code }` and nested `{ coding: {...} }` forms, mirroring the Python SDK's `_extract_coding`), `resolveBatch` (1–100 codings), `resolveCodeableConcept` (1–20 codings). All three validate synthetically before issuing requests.
- Standalone helpers (no client required):
  - `omophubFhirUrl(version)` - returns the URL of OMOPHub's hosted FHIR Terminology Service (`'r4'` default, also `'r4b'`, `'r5'`, `'r6'`).
  - `getApiKey()`, `setApiKey(key)`, `hasApiKey()` - env-backed helpers reading `OMOPHUB_API_KEY` from `process.env`. `setApiKey` throws `OMOPHubError` on edge runtimes that lack a writable `process.env`.
- FHIR `Coding` type uses camelCase (`userSelected`, `vocabularyId`) to match the FHIR JSON spec - converted to snake_case at the wire via `toSnakeCaseKeys`.
- README polish: install + config table + per-resource usage examples for all 8 resources + error-handling guide + async-iterator guide + Python/R migration table.

### SDK surface at v1.0.0 - 37 methods across 8 resources

```
client.concepts      - get, getByCode, batch, suggest, related, relationships, recommended   (7)
client.search        - basic, basicIter, basicAll, advanced, autocomplete, semantic,
                       semanticIter, semanticAll, bulkBasic, bulkSemantic, similar           (11)
client.vocabularies  - list, get, stats, domainStats, domains, conceptClasses, concepts      (7)
client.domains       - list, concepts                                                        (2)
client.hierarchy     - get, ancestors, descendants                                           (3)
client.relationships - get, types                                                            (2)
client.mappings      - get, map                                                              (2)
client.fhir          - resolve, resolveBatch, resolveCodeableConcept                         (3)
                                                                                          Σ = 37

Standalone: omophubFhirUrl, getApiKey, setApiKey, hasApiKey
```

<!-- Reference-style version links. -->
[Unreleased]: https://github.com/OMOPHub/omophub-node/compare/v1.0.1...HEAD
[1.0.1]: https://github.com/OMOPHub/omophub-node/releases/tag/v1.0.1
[1.0.0]: https://github.com/OMOPHub/omophub-node/releases/tag/v1.0.0

