export const INTERNAL_API_HEADER = "x-sarpbc-internal";

function trimSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

/**
 * Server-side callers use `serverBase` when it is set. The browser always uses
 * the public origin, including after hydration.
 */
export function resolveApiBase(
  publicBase: string,
  serverBase: string | undefined,
  onServer: boolean,
): string {
  const fallback = trimSlash(publicBase.trim());
  if (!onServer) {
    return fallback;
  }
  const server = serverBase?.trim();
  if (!server) {
    return fallback;
  }
  return trimSlash(server);
}

/**
 * The internal token is only attached to requests whose resolved URL is the
 * private API origin. A relative path needs `baseURL` so a missing base cannot
 * be treated as internal.
 */
export function shouldSendInternalApiToken(
  request: string,
  baseURL: string | undefined,
  serverBase: string | undefined,
): boolean {
  const server = serverBase?.trim();
  if (!server) {
    return false;
  }
  const base = baseURL?.trim();
  const absolute = /^[a-z][a-z0-9+.-]*:/i.test(request);
  if (!absolute && !base) {
    return false;
  }
  try {
    const serverUrl = new URL(server);
    const resolved = new URL(request, absolute ? undefined : base);
    return resolved.origin === serverUrl.origin;
  } catch {
    return false;
  }
}
