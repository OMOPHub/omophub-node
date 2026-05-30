import { describe, expect, test } from 'vitest';
import { syntheticError } from '../../../src/common/utils/synthetic-error.js';

describe('syntheticError', () => {
  test('builds a Response with data null and the supplied error fields', () => {
    const result = syntheticError<{ id: number }>('validation_error', 'bad input', {
      field: 'concept_id',
    });
    expect(result.data).toBeNull();
    expect(result.error?.name).toBe('validation_error');
    expect(result.error?.message).toBe('bad input');
    expect(result.error?.statusCode).toBeNull();
    expect(result.error?.details).toEqual({ field: 'concept_id' });
    expect(result.meta).toBeNull();
    expect(result.headers).toBeNull();
  });

  test('omits details when not provided', () => {
    const result = syntheticError<unknown>('not_found', 'gone');
    expect(result.error?.details).toBeUndefined();
  });
});
