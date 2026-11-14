import { isNonEmptyString } from "./text";

export const INTERNAL_API_HEADER = "x-sarpbc-internal";
export const INTERNAL_CLIENT_HEADER = "x-sarpbc-client";

function trimSlash(value: string): string {
  let end = value.length;

  while (end > 0 && value.codePointAt(end - 1) === 47) {
    end -= 1;
  }

  return end === value.length ? value : value.slice(0, end);
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

  if (!isNonEmptyString(server)) {
    return fallback;
  }

  return trimSlash(server);
}
