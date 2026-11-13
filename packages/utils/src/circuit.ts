import { isLiquipediaSourceHost } from "./team-alias";

export const CIRCUIT_NAME_MAX_LENGTH = 120;
export const CIRCUIT_DESCRIPTION_MAX_LENGTH = 500;
export const CIRCUIT_REGION_MAX_LENGTH = 40;
export const MIN_CIRCUIT_SEASON = 2015;
export const MAX_CIRCUIT_SEASON = 2100;
export const MAX_CIRCUIT_SCALE_TIERS = 64;
export const MAX_CIRCUIT_PLACEMENT = 256;
export const MAX_CIRCUIT_POINTS = 100_000;
export const MAX_CIRCUIT_QUALIFICATION_SPOTS = 64;
export const MAX_CIRCUIT_STAGE_TEAMS = 256;
export const WORLDWIDE_CIRCUIT_REGION = "Worldwide";

const FORBIDDEN_CIRCUIT_SOURCE_HOSTS = ["blast.tv"] as const;

export function isWorldwideCircuitRegion(region: string | null | undefined): boolean {
  const trimmed = region?.trim().toLowerCase() ?? "";
  return trimmed === "" || trimmed === WORLDWIDE_CIRCUIT_REGION.toLowerCase();
}

export function isForbiddenCircuitSourceHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return (
    isLiquipediaSourceHost(host) ||
    FORBIDDEN_CIRCUIT_SOURCE_HOSTS.some(
      (forbidden) => host === forbidden || host.endsWith(`.${forbidden}`),
    )
  );
}
