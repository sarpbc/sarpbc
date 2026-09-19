import type { CareerPlacement, CareerRegion, CareerSplitRecord } from "~/types/career";

export const REGIONAL_POINTS: Record<CareerPlacement, number> = {
  winner: 10,
  finalist: 7,
  top4: 5,
  top8: 3,
  group: 1,
  unavailable: 0,
};

/** International majors are worth double a regional finish. */
export const MAJOR_POINTS: Record<CareerPlacement, number> = {
  winner: 20,
  finalist: 14,
  top4: 10,
  top8: 6,
  group: 2,
  unavailable: 0,
};

/** Regional circuit points scale with the region's depth. Majors are unweighted. */
export function regionalCircuitWeight(region: CareerRegion): number {
  switch (region) {
    case "eu":
      return 1;
    case "na":
      return 0.9;
    case "sam":
    case "mena":
      return 0.75;
    case "oce":
    case "apac":
      return 0.55;
    case "ssa":
      return 0.5;
    default: {
      const _exhaustive: never = region;
      return _exhaustive;
    }
  }
}

export function computeSeasonPoints(splits: CareerSplitRecord[]): number {
  return splits.reduce((sum, split) => sum + split.points, 0);
}

/** Circuit points are split results only. Worlds is prestige, not ranking points. */
export function computeCircuitPoints(splits: CareerSplitRecord[]): number {
  return computeSeasonPoints(splits);
}
