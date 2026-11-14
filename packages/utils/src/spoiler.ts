import { isNonEmptyString } from "./text";

export const SPOILER_FREE_COOKIE = "spoilerFree";

export type SpoilerRevealTarget =
  | { kind: "match"; id: string }
  | { kind: "tournament"; id: string };

export interface SpoilerScope {
  matchId?: string;
  tournamentId?: string;
}

export interface SpoilerReveals {
  matchIds: readonly string[];
  tournamentIds: readonly string[];
}

export const NO_SPOILER_REVEALS: SpoilerReveals = { matchIds: [], tournamentIds: [] };

export function isSpoilerConcealed(
  enabled: boolean,
  reveals: SpoilerReveals,
  scope: SpoilerScope,
): boolean {
  if (!enabled) {
    return false;
  }

  if (isNonEmptyString(scope.matchId) && reveals.matchIds.includes(scope.matchId)) {
    return false;
  }

  return !(
    isNonEmptyString(scope.tournamentId) && reveals.tournamentIds.includes(scope.tournamentId)
  );
}

export function revealSpoilers(
  reveals: SpoilerReveals,
  target: SpoilerRevealTarget,
): SpoilerReveals {
  switch (target.kind) {
    case "match": {
      return reveals.matchIds.includes(target.id)
        ? reveals
        : { ...reveals, matchIds: [...reveals.matchIds, target.id] };
    }

    case "tournament": {
      return reveals.tournamentIds.includes(target.id)
        ? reveals
        : { ...reveals, tournamentIds: [...reveals.tournamentIds, target.id] };
    }

    default: {
      const exhaustive: never = target;

      return exhaustive;
    }
  }
}
