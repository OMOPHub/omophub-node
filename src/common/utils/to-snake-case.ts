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
 * Arrays are mapped element-wise; primitives and non-plain objects
 * (Date, Map, Set, class instances, etc.) pass through unchanged so we
 * don't silently flatten them to `{}`. Used for request bodies only —
 * responses stay snake_case to match the API.
 */
export function toSnakeCaseKeys<T>(input: T): T {
  if (Array.isArray(input)) {
    return input.map((item) => toSnakeCaseKeys(item)) as unknown as T;
  }
  if (isPlainObject(input)) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(input)) {
      out[camelToSnakeCase(k)] = toSnakeCaseKeys(v);
    }
    return out as T;
  }
  return input;
}

/**
 * Plain object = `{}` literal or `Object.create(null)`. Anything with a
 * non-Object prototype (Date, Buffer, URL, Map, Set, user classes) is
 * excluded so its data is preserved as-is.
 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object') return false;
  const proto = Object.getPrototypeOf(value);
  return proto === null || proto === Object.prototype;
}
