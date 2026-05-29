# @omophub/omophub-node

Official Node.js / TypeScript SDK for the [OMOPHub API](https://omophub.com) — search, lookup, map, and navigate OHDSI medical vocabularies (SNOMED, ICD10, RxNorm, LOINC, and 100+ more) from JavaScript.

> **Status — v0.0.x scaffold.** Public API surfaces (concepts, search, vocabularies, hierarchy, mappings, FHIR) ship in upcoming releases. See [`docs/omophub-node-sdk-implementation-plan.md`](https://github.com/OMOPHub/oh-platform) in the platform repo for the roadmap.

## Install

```bash
npm install @omophub/omophub-node
```

Requires Node ≥ 20. Runs in Node, modern browsers (CORS permitting), and edge runtimes (Cloudflare Workers, Vercel Edge).

## Quick start

```ts
import { OMOPHub } from '@omophub/omophub-node';

const client = new OMOPHub(process.env.OMOPHUB_API_KEY);

// Coming in v0.1.0:
// const { data, error } = await client.concepts.get({ conceptId: 201826 });
// if (error) throw new Error(error.message);
// console.log(data.concept_name); // → "Type 2 diabetes mellitus"
```

## Configuration

| Option | Env var | Default |
|---|---|---|
| `apiKey` (1st constructor arg) | `OMOPHUB_API_KEY` | — (required) |
| `baseUrl` | `OMOPHUB_API_URL` | `https://api.omophub.com/v1` |
| `timeoutMs` | — | `30000` |
| `maxRetries` | — | `3` |
| `vocabVersion` | — | unset (server default) |
| `userAgent` | — | `omophub-node/<version>` |
| `fetch` | — | `globalThis.fetch` |

## License

MIT — see [LICENSE](./LICENSE).
