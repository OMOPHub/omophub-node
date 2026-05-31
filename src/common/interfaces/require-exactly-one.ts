/**
 * Forces the consumer to set exactly one of the given keys.
 *
 * ```ts
 * type SimilarOptions = RequireExactlyOne<{
 *   conceptId: number;
 *   conceptName: string;
 *   query: string;
 * }>;
 * ```
 */
export type RequireExactlyOne<T, K extends keyof T = keyof T> = Omit<T, K> &
  {
    [P in K]: Required<Pick<T, P>> & Partial<Record<Exclude<K, P>, undefined>>;
  }[K];
