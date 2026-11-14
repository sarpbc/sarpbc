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

export const isWorldwideCircuitRegion = (region: string | null | undefined): boolean => {
  const trimmed = region?.trim().toLowerCase() ?? "";

  return trimmed === "" || trimmed === WORLDWIDE_CIRCUIT_REGION.toLowerCase();
};
