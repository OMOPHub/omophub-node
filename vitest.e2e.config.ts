import { readFileSync } from 'node:fs';
import { defineConfig } from 'vitest/config';

// Minimal .env loader — just enough to pick up OMOPHUB_API_KEY for the
// e2e suite. Keeping a runtime dotenv dependency out of the package.
try {
  const env = readFileSync(new URL('.env', import.meta.url), 'utf8');
  for (const line of env.split('\n')) {
    const match = line.match(/^\s*(?:export\s+)?([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (!key) continue;
    const value = (rawValue ?? '').replace(/^['"](.*)['"]$/, '$1');
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
} catch {
  // .env is optional — tests skip themselves if OMOPHUB_API_KEY isn't set.
}

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['e2e/**/*.test.ts'],
    // Live API can be slow — generous per-test timeout
    testTimeout: 90_000,
    hookTimeout: 90_000,
    // E2E hits a shared API; run sequentially to avoid rate-limit hot-spotting
    fileParallelism: false,
    sequence: { concurrent: false },
  },
});
