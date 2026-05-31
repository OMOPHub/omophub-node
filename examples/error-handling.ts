/**
 * Error handling examples for the OMOPHub Node SDK.
 *
 * Unlike SDKs that throw on API errors, every method here returns a
 * discriminated `{ data, error, meta, headers }` union. Narrow with
 * `if (error) ...` and TypeScript will type `data` correctly in the
 * else branch.
 *
 * Run with:
 *   OMOPHUB_API_KEY=oh_... npx tsx examples/error-handling.ts
 */
import { OMOPHub, OMOPHubError, OMOPHubIteratorError } from '../src/index.js';

async function handleNotFound(): Promise<void> {
  console.log('=== Handling Not Found ===');
  const client = new OMOPHub();
  const { data, error } = await client.concepts.get(999_999_999);
  if (error) {
    console.log(`Concept not found: ${error.message}`);
    console.log(`  Code: ${error.name}`);
    console.log(`  Status: ${error.statusCode}`);
    if (error.requestId) console.log(`  Request ID: ${error.requestId}`);
    return;
  }
  console.log(`Found: ${data.concept_name}`);
}

async function handleAuthentication(): Promise<void> {
  console.log('\n=== Handling Authentication Errors ===');
  // Bypass env by passing an explicit (bad) key
  const client = new OMOPHub('oh_invalid_key', { maxRetries: 0 });
  const { error } = await client.concepts.get(201826);
  if (error) {
    console.log(`Authentication failed: ${error.message}`);
    console.log(`  Code: ${error.name}`); // invalid_api_key | restricted_api_key
    console.log(`  Status: ${error.statusCode}`);
  }
}

async function handleRateLimit(): Promise<void> {
  console.log('\n=== Handling Rate Limits ===');
  // The SDK retries 429 automatically up to `maxRetries` with backoff.
  // For demo, disable retries to surface the error so we can inspect it.
  const client = new OMOPHub(undefined, { maxRetries: 0 });
  for (let i = 0; i < 3; i++) {
    const { error } = await client.search.basic('diabetes', { pageSize: 1 });
    if (error?.name === 'rate_limit_exceeded') {
      console.log(`Rate limited! Retry after ${error.retryAfter ?? '?'}s`);
      await new Promise((r) => setTimeout(r, (error.retryAfter ?? 1) * 1000));
      continue;
    }
    if (error) {
      console.log(`  Request ${i + 1}: ${error.name}: ${error.message}`);
      return;
    }
    console.log(`  Request ${i + 1} succeeded`);
  }
}

async function handleValidation(): Promise<void> {
  console.log('\n=== Handling Validation Errors ===');
  const client = new OMOPHub();
  // Trigger synthetic client-side validation — no network call.
  const { error } = await client.concepts.batch({ conceptIds: [] });
  if (error) {
    console.log(`Validation error: ${error.message}`);
    console.log(`  Code: ${error.name}`); // validation_error
    console.log(`  Status: ${error.statusCode}`); // null — synthetic
  }
}

/**
 * The full set of error codes you can switch on. See
 * `OMOPHUB_ERROR_CODE_KEY` in the SDK for the canonical list.
 */
async function comprehensiveErrorHandling(): Promise<void> {
  console.log('\n=== Comprehensive Error Handling ===');
  const client = new OMOPHub();
  const { data, error } = await client.concepts.get(201826);

  if (error) {
    switch (error.name) {
      case 'invalid_api_key':
      case 'missing_api_key':
      case 'restricted_api_key':
        console.log(`Auth error: ${error.message}`);
        break;
      case 'not_found':
        console.log(`Not found: ${error.message}`);
        break;
      case 'rate_limit_exceeded':
      case 'tier_limit_exceeded':
        console.log(`Rate / tier limited, retry after: ${error.retryAfter ?? '?'}s`);
        break;
      case 'validation_error':
      case 'missing_required_field':
      case 'invalid_argument':
        console.log(`Invalid request: ${error.message}`);
        break;
      case 'service_unavailable':
      case 'internal_server_error':
        console.log(`Server error: ${error.message}`);
        break;
      case 'connection_error':
        console.log(`Network error: ${error.message}`);
        break;
      case 'timeout_error':
        console.log(`Request timed out: ${error.message}`);
        break;
      default:
        console.log(`SDK error: ${error.name}: ${error.message}`);
    }
    return;
  }

  console.log(`Success: ${data.concept_name}`);
}

/**
 * Async iterators throw `OMOPHubIteratorError` on page failure (they can't
 * gracefully yield discriminated errors). Catch and inspect like any
 * other Error subclass.
 */
async function handleIteratorErrors(): Promise<void> {
  console.log('\n=== Iterator Error Handling ===');
  const client = new OMOPHub('oh_definitely_bad_key', { maxRetries: 0 });
  try {
    for await (const c of client.search.basicIter('diabetes', { pageSize: 5 })) {
      console.log(`  ${c.concept_name}`); // will not reach
    }
  } catch (e) {
    if (e instanceof OMOPHubIteratorError) {
      console.log(`Iterator failed: ${e.code} (${e.statusCode}): ${e.message}`);
    } else {
      throw e;
    }
  }
}

/**
 * The eager `*All` variant accumulates errors as values rather than throwing.
 */
async function handleEagerErrors(): Promise<void> {
  console.log('\n=== Eager Collect with Error Accumulation ===');
  const client = new OMOPHub('oh_definitely_bad_key', { maxRetries: 0 });
  const { data, errors, pagesFetched } = await client.search.basicAll('diabetes', {
    pageSize: 5,
    maxPages: 2,
  });
  console.log(`  Collected ${data.length} items across ${pagesFetched} page(s)`);
  console.log(`  Errors: ${errors.length}`);
  for (const e of errors) console.log(`    ${e.name}: ${e.message}`);
}

async function main(): Promise<void> {
  await handleNotFound();
  await handleAuthentication();
  await handleValidation();
  await comprehensiveErrorHandling();
  await handleIteratorErrors();
  await handleEagerErrors();
  await handleRateLimit();

  // Demonstrate that constructor misuse THROWS OMOPHubError (the only
  // exception in the SDK — everything else is a return value).
  try {
    delete process.env.OMOPHUB_API_KEY;
    new OMOPHub();
  } catch (e) {
    if (e instanceof OMOPHubError) {
      console.log(`\nConstructor threw OMOPHubError: ${e.message}`);
    }
  }
}

main().catch((err: unknown) => {
  console.error('Failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
