/**
 * Reads a process.env value, returning undefined if process is not
 * available (Cloudflare Workers, Vercel Edge, etc.). Never throws.
 */
export function envOrUndefined(name: string): string | undefined {
  if (typeof process === 'undefined' || !process.env) return undefined;
  return process.env[name];
}

export function envOr(name: string, fallback: string): string {
  return envOrUndefined(name) ?? fallback;
}
