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
- `syntheticError<T>(name, message, details?)` helper in `common/utils/` — builds wire-shaped errors for client-side validation without issuing a network call.

<!-- No compare link yet — first tag will be created on the v0.1.0 release. -->

