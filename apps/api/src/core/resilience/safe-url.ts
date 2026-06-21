/**
 * core/resilience/safe-url.ts
 *
 * SSRF guard (CWE-918). Outbound integration calls interpolate user-controlled
 * identifiers (artistId, trackId, …) into a fixed API base URL. This helper
 * verifies the fully-constructed URL still targets an allowlisted HTTPS host,
 * so a crafted identifier can never redirect the request to an internal/other
 * host. Callers must additionally `encodeURIComponent` each user-supplied
 * segment so it cannot break out of the URL path/query.
 */

export class DisallowedHostError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DisallowedHostError';
  }
}

/**
 * Returns the URL unchanged if it is HTTPS and its host is in `allowedHosts`;
 * throws `DisallowedHostError` otherwise. Use the return value as the fetch arg
 * so the validation provably dominates the request sink.
 */
export function assertAllowedHost(
  rawUrl: string,
  allowedHosts: readonly string[],
): string {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new DisallowedHostError('URL de integração inválida');
  }
  if (parsed.protocol !== 'https:') {
    throw new DisallowedHostError(`Esquema não permitido: ${parsed.protocol}`);
  }
  if (!allowedHosts.includes(parsed.hostname)) {
    throw new DisallowedHostError(`Host não permitido para integração: ${parsed.hostname}`);
  }
  return parsed.toString();
}
