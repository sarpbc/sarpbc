import type { CareerPlacement, CareerRegion, CareerSplitRecord } from "~/types/career";

export const REGIONAL_POINTS = {
  finalist: 7,
  group: 1,
  top4: 5,
  top8: 3,
  unavailable: 0,
  winner: 10,
} satisfies Record<CareerPlacement, number>;

export const MAJOR_POINTS = {
  finalist: 14,
  group: 2,
  top4: 10,
  top8: 6,
  unavailable: 0,
  winner: 20,
} satisfies Record<CareerPlacement, number>;

export const regionalCircuitWeight = (region: CareerRegion) => {
  switch (region) {
    case "eu": {
      return 1;
    }

    case "na": {
      return 0.9;
    }

    case "sam":
    case "mena": {
      return 0.75;
    }

    case "oce":
    case "apac": {
      return 0.55;
    }

    case "ssa": {
      return 0.5;
    }

    default: {
      const _exhaustive: never = region;

      return _exhaustive;
    }
  }
};

export const computeSeasonPoints = (splits: CareerSplitRecord[]) =>
  splits.reduce((sum, split) => sum + split.points, 0);

export const computeCircuitPoints = (splits: CareerSplitRecord[]) => computeSeasonPoints(splits);
