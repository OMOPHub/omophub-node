# OMOPHub Node SDK — Examples

Runnable TypeScript examples covering the full SDK surface. Each file is self-contained: import the SDK, call a few methods, print results.

## Setup

```bash
# 1. From the repo root, install dev deps if you haven't
npm install

# 2. Either set the env var inline or copy the loader from vitest.e2e.config.ts
export OMOPHUB_API_KEY=oh_your_api_key
```

## Running an example

Examples run directly via `tsx` (already a dev-dep — no build step):

```bash
npx tsx examples/basic-usage.ts
npx tsx examples/error-handling.ts
npx tsx examples/search-concepts.ts
npx tsx examples/navigate-hierarchy.ts
npx tsx examples/map-between-vocabularies.ts
npx tsx examples/fhir-resolver.ts
```

## Files

| File | What it covers |
|---|---|
| [`basic-usage.ts`](./basic-usage.ts) | `concepts.get`, `search.basic`, `vocabularies.list` — quickstart |
| [`error-handling.ts`](./error-handling.ts) | Discriminated `{ data, error }` pattern, every error code, iterator vs. eager error modes, `OMOPHubError` on misuse |
| [`search-concepts.ts`](./search-concepts.ts) | basic / filtered / autocomplete / semantic / bulk / similar + async iterator pagination |
| [`navigate-hierarchy.ts`](./navigate-hierarchy.ts) | `hierarchy.ancestors`, `hierarchy.descendants`, `hierarchy.get` (graph format), `relationships.get` |
| [`map-between-vocabularies.ts`](./map-between-vocabularies.ts) | `mappings.get`, `mappings.map` (concepts + native codes), code-lookup-then-map |
| [`fhir-resolver.ts`](./fhir-resolver.ts) | SNOMED/LOINC/RxNorm/ICD-10-CM resolution, recommendations, quality, batch, CodeableConcept, coding-object form, `omophubFhirUrl` |

## SDK conventions used throughout

**Returns over throws.** Every method returns `{ data, error, meta, headers }` — narrow with `if (error) ...` and TypeScript types `data` correctly:

```ts
const { data, error } = await client.concepts.get(201826);
if (error) {
  console.error(error.name, error.message);
  return;
}
console.log(data.concept_name); // narrowed to Concept
```

**camelCase in, snake_case on the wire.** The SDK accepts camelCase option keys and converts to snake_case at the HTTP boundary. Response field names stay snake_case (matches the wire).

**Async iterators throw.** `*Iter` variants throw `OMOPHubIteratorError` on page failure (generators can't gracefully yield discriminated errors). Use `*All` if you prefer error accumulation:

```ts
// Throws on first failure:
for await (const c of client.search.basicIter('diabetes')) { ... }

// Accumulates errors:
const { data, errors, pagesFetched } = await client.search.basicAll('diabetes', { maxPages: 5 });
```

**The only thing that throws.** `OMOPHubError` from the `OMOPHub` constructor when no API key is supplied. Network / API / validation errors are all return values.

## Testing examples

Examples run against the live API at `https://api.omophub.com/v1`. To verify they execute end-to-end on your key:

```bash
export OMOPHUB_API_KEY=oh_...
for f in examples/*.ts; do
  echo "--- $f ---"
  npx tsx "$f" || echo "FAILED: $f"
done
```
