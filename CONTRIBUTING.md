# Contributing to OMOPHub Node.js SDK

First off, thank you for considering contributing to OMOPHub!

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check the [existing issues](https://github.com/OMOPHub/omophub-node/issues) to avoid duplicates.

When creating a bug report, please include:

- **Node version** (`node --version`)
- **Package manager + version** (`npm --version` / `pnpm --version` / `bun --version`)
- **SDK version** (`npm ls @omophub/omophub-node`)
- **Runtime** (Node, Deno, Bun, Cloudflare Workers, Vercel Edge, browser)
- **Operating system**
- **Minimal code example** that reproduces the issue
- **Full error output** - `error.name`, `error.statusCode`, `error.message`, and `error.requestId` if available
- **Expected vs actual behavior**

If you're seeing a transport-level failure, include the response headers - especially `x-request-id` - so we can correlate against server logs.

### Suggesting Features

Feature requests are welcome! Please open an issue with:

- Clear description of the feature
- Use case: why would this be useful?
- Proposed TypeScript surface (option keys, return shape)
- Possible implementation approach (optional)

### Pull Requests

1. **Fork the repository** and create your branch from `main`
2. **Install dependencies:**
   ```bash
   git clone https://github.com/YOUR_USERNAME/omophub-node.git
   cd omophub-node
   npm install
   ```
3. **Make your changes** with clear, descriptive commits
4. **Add tests** for new functionality - both unit tests (`test/`) and, when the change touches the wire, integration tests (`e2e/`)
5. **Run the full validation suite:**
   ```bash
   npm run typecheck
   npm run lint
   npm test
   npm run build
   ```
6. **Run integration tests** if your change affects request/response shapes:
   ```bash
   OMOPHUB_API_KEY=oh_xxx npm run test:e2e
   ```
7. **Update documentation** - `README.md`, `CHANGELOG.md` under `## [Unreleased]`, and any relevant JSDoc
8. **Submit a pull request** with a clear description

## Development Setup

### Prerequisites

- **Node.js 22+** (see `.nvmrc`)
- **npm 10+** (ships with Node 22)

### Installation

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/omophub-node.git
cd omophub-node

# Use the pinned Node version
nvm use   # or `fnm use`

# Install dependencies
npm install
```

For integration tests against the live API, create a `.env` file at the repo root:

```bash
echo "export OMOPHUB_API_KEY=oh_xxx" > .env
```

`.env` is gitignored - never commit your key.

### Running Tests

```bash
# Unit tests (fast, fully mocked - no network)
npm test

# Watch mode for active development
npm run test:watch

# With coverage report
npm run test:coverage

# Integration tests against the live API (requires OMOPHUB_API_KEY)
set -a && source .env && set +a
npm run test:e2e

# Run a single test file
npx vitest run test/concepts/concepts.test.ts

# Run tests matching a pattern
npx vitest run -t "bulk"
```

Unit tests live in `test/` and use `vitest` with `vi.fn()`-based mock fetches - no external mock libraries. Integration tests live in `e2e/` and exercise the SDK against `api.omophub.com/v1`; they tolerate rate limits and known slow paths via the helpers in `e2e/_helpers.ts`.

### Code Style

We use:

- **Biome v2** for linting and formatting
- **TypeScript strict mode** (no `any`, no implicit returns, no unused locals)

```bash
# Check lint + format
npm run lint

# Auto-fix lint + format
npm run lint:fix

# Format only
npm run format

# Type-check (src + e2e)
npm run typecheck
```

Run `npm run lint:fix && npm run typecheck` before pushing. CI runs the same checks.

### Running Examples

The `examples/` directory contains runnable scripts you can use to smoke-test your changes end-to-end:

```bash
set -a && source .env && set +a
npx tsx examples/basic-usage.ts
npx tsx examples/fhir-resolver.ts
```

If your change affects a public method, add or update an example.

## Project Structure

```
omophub-node/
├── src/
│   ├── index.ts              # Public API exports
│   ├── client.ts             # OMOPHub client + HTTP dispatch + retry
│   ├── errors.ts             # OMOPHubError, OMOPHubIteratorError, error codes
│   ├── version.ts            # SDK version (auto-bumped)
│   ├── interfaces.ts         # Shared request/response/option types
│   ├── auth/                 # API key env helpers
│   ├── common/               # syntheticError, pagination, toSnakeCaseKeys, …
│   ├── concepts/
│   │   ├── concepts.ts       # Concepts resource methods
│   │   └── interfaces/       # Per-method option + response types
│   ├── search/
│   ├── hierarchy/
│   ├── relationships/
│   ├── mappings/
│   ├── vocabularies/
│   ├── domains/
│   └── fhir/
├── test/                     # Unit tests (mock-fetch, no network)
├── e2e/                      # Integration tests (live api.omophub.com)
├── examples/                 # Runnable example scripts
├── package.json
├── tsconfig.json             # src build config
├── tsconfig.e2e.json         # e2e typecheck config
├── tsconfig.examples.json    # examples typecheck config
├── biome.json                # Lint + format rules
├── vitest.config.ts          # Unit test runner
└── vitest.e2e.config.ts      # Integration test runner (fileParallelism: false)
```

## SDK Conventions

A few patterns are load-bearing - please follow them when adding new methods:

- **Discriminated returns, not exceptions.** Every method returns `Promise<{ data, error, meta, headers }>`. The only exceptions the SDK throws are `OMOPHubError` (constructor misuse) and `OMOPHubIteratorError` (`*Iter` async-generator page failures). Network errors, 404s, 429s, validation failures - all returned as `error` values.
- **camelCase TypeScript surface, snake_case wire.** Request options take camelCase keys (`vocabularyIds`, `pageSize`); they're converted to snake_case at the request boundary via `toSnakeCaseKeys`. Response types use snake_case to match the wire - never client-translated.
- **Synthetic validation when feasible.** Reject obviously-bad inputs (empty arrays, out-of-range counts, missing required fields) with `syntheticError(...)` before making a network call. Match the wire-shape of a real server error so callers' error-handling code doesn't have to branch.
- **Positional path args + merged options.** Prefer `client.concepts.get(201826, { includeRelationships: true })` over `({ conceptId: 201826, ... })`. Path params are positional; everything else goes in a single options object.
- **Idempotency-key retries.** GET/HEAD/OPTIONS/PUT/DELETE retry automatically on transient failures. POST/PATCH only retry when the caller sets `{ idempotencyKey: '...' }` - never silently retry a non-idempotent write.
- **Pagination metadata on the outer envelope.** `meta.pagination` lives on the response, never inside `data`. Add `*Iter` (async generator) and `*All` (eager collector with error accumulation) variants for any new paginated resource.

When the live API returns a shape that doesn't match the existing types, **fix the type to match the wire** - don't transform on the response path. Log the discovery in `CHANGELOG.md` so the wire-drift history stays traceable.

## Commit Messages

We follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `test:` Adding or updating tests
- `refactor:` Code refactoring
- `chore:` Maintenance tasks

Examples:
```
feat: add semantic search endpoint
fix: handle rate limit errors correctly
docs: update README with new examples
test: add integration tests for batch concept lookup
```

## Release Process

Releases are cut by maintainers via GitHub Releases - **do not bump the version in `package.json` in your PR**. The publish workflow (`.github/workflows/publish.yml`) runs on release-published, publishes to npm with provenance attestation, and tags the registry version.

For each PR, add a bullet under `## [Unreleased]` in `CHANGELOG.md` describing the user-visible change.

## Questions?

- Open a [GitHub Discussion](https://github.com/OMOPHub/omophub-node/discussions)
- Email: support@omophub.com

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for helping make OMOPHub better!
