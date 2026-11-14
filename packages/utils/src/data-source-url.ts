import { isLiquipediaSourceHost } from "./team-alias";

export const DATA_SOURCE_URL_MAX_LENGTH = 2048;

export function isForbiddenDataSourceHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  return isLiquipediaSourceHost(host) || host === "blast.tv" || host.endsWith(".blast.tv");
}

export function isAcceptedDataSourceUrl(value: string): boolean {
  if (value.length > DATA_SOURCE_URL_MAX_LENGTH || !URL.canParse(value)) return false;
  const url = new URL(value);
  if (url.protocol !== "https:" && url.protocol !== "http:") return false;
  if (url.username || url.password) return false;
  return !isForbiddenDataSourceHost(url.hostname);
}
