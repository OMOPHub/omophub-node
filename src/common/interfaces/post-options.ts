import type { PerCallOptions } from './per-call-options.js';

export interface IdempotentRequest {
  /** Optional `Idempotency-Key` header value. POST-only. */
  idempotencyKey?: string;
}

export type PostOptions = PerCallOptions & IdempotentRequest;
