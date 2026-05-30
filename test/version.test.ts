import { describe, expect, test } from 'vitest';
import { __version__ } from '../src/version.js';

describe('__version__', () => {
  test('is a semver-like string', () => {
    expect(__version__).toMatch(/^\d+\.\d+\.\d+/);
  });
});
