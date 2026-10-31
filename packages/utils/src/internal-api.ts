export const INTERNAL_API_HEADER = "x-sarpbc-internal";
export const INTERNAL_CLIENT_HEADER = "x-sarpbc-client";

function trimSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

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
