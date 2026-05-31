import { readFileSync } from 'node:fs';
import { defineConfig } from 'vitest/config';

// Minimal .env loader — just enough to pick up OMOPHUB_API_KEY for the
// e2e suite. Keeping a runtime dotenv dependency out of the package.
//
// Supported syntax (subset of dotenv):
// - KEY=value
// - KEY="value with spaces or # hash"   (quoted: # is literal)
// - KEY='value'
// - KEY=value # inline comment           (unquoted: trailing # stripped)
// - export KEY=value                     (export prefix allowed)
// - # full-line comments                 (ignored)
try {
  const env = readFileSync(new URL('.env', import.meta.url), 'utf8');
  for (const rawLine of env.split('\n')) {
    const line = rawLine.trimStart();
    if (line === '' || line.startsWith('#')) continue;
    const match = line.match(/^(?:export\s+)?([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;
    const [, key, rest] = match;
    if (!key) continue;
    let value = (rest ?? '').trimEnd();
    // Quoted values: take the content between matching quotes literally
    // (a `#` inside quotes is part of the value, not a comment).
    const quoted = value.match(/^(['"])((?:\\.|(?!\1).)*)\1\s*(?:#.*)?$/);
    if (quoted) {
      value = quoted[2] ?? '';
    } else {
      // Unquoted: strip a trailing inline comment introduced by ` #`
      // (whitespace + hash). A `#` with no preceding whitespace is
      // treated as part of the value (matches dotenv conventions).
      const commentIdx = value.search(/\s+#/);
      if (commentIdx !== -1) value = value.slice(0, commentIdx);
      value = value.trim();
    }
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
