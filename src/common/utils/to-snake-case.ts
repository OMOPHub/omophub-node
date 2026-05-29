/**
 * Converts a camelCase string to snake_case. Used at the request boundary
 * to translate option-object keys into wire-format keys.
 *
 * Treats consecutive uppercase runs as a single acronym so that
 * `FHIRResource` → `fhir_resource` and `XMLHttpRequest` → `xml_http_request`
 * rather than splitting between each letter. Trailing uppercase runs are
 * also preserved (`userID` → `user_id`).
 *
 * A single uppercase letter followed by another uppercase is treated as a
 * separate word (`OAuthToken` → `o_auth_token`) — matches `lodash.snakeCase`.
 */
export function camelToSnakeCase(input: string): string {
  return input
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
    .toLowerCase();
}

/**
 * Recursively converts an object's keys from camelCase to snake_case.
 * Arrays are mapped element-wise; primitives pass through. Used for
 * request bodies only — responses stay snake_case to match the API.
 */
export function toSnakeCaseKeys<T>(input: T): T {
  if (Array.isArray(input)) {
    return input.map((item) => toSnakeCaseKeys(item)) as unknown as T;
  }
  if (input !== null && typeof input === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(input)) {
      out[camelToSnakeCase(k)] = toSnakeCaseKeys(v);
    }
    return out as T;
  }
  return input;
}
