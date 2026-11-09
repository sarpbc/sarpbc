import type { TournamentTab } from "@sarpbc/types";

// Detected by route name, not path: a stage may itself be slugged `matches`.
export function getTournamentTabFromRouteName(
  routeBaseName: PropertyKey | undefined,
): TournamentTab {
  return routeBaseName === "tournaments-event-stage-matches" ? "matches" : "overview";
}
