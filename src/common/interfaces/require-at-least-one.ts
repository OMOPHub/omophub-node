/**
 * Forces the consumer to set at least one of the given keys.
 *
 * ```ts
 * type Options = RequireAtLeastOne<{ html: string; text: string; react: ReactNode }>;
 * ```
 */
export type RequireAtLeastOne<T> = {
  [K in keyof T]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<keyof T, K>>>;
}[keyof T];
