import { describe, expect, test } from 'vitest';
import { OMOPHubError, OMOPHubIteratorError } from '../src/errors.js';

describe('OMOPHubError', () => {
  test('is an Error subclass with the right name', () => {
    const err = new OMOPHubError('boom');
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('OMOPHubError');
    expect(err.message).toBe('boom');
  });
});

describe('OMOPHubIteratorError', () => {
  test('carries statusCode and code fields', () => {
    const err = new OMOPHubIteratorError('rate limited', 429, 'rate_limit_exceeded');
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('OMOPHubIteratorError');
    expect(err.statusCode).toBe(429);
    expect(err.code).toBe('rate_limit_exceeded');
  });

  test('accepts a null statusCode for client-side failures', () => {
    const err = new OMOPHubIteratorError('lost connection', null, 'connection_error');
    expect(err.statusCode).toBeNull();
    expect(err.code).toBe('connection_error');
  });
});
