import type { TournamentTab } from "~/types/tournament";

const TAB_ORDER = {
  overview: 0,
  matches: 1,
} as const satisfies Record<TournamentTab, number>;

// Detected by route name, not path: a stage may itself be slugged `matches`.
export function getTournamentTabFromRouteName(
  routeBaseName: PropertyKey | undefined,
): TournamentTab {
  return routeBaseName === "tournaments-event-stage-matches" ? "matches" : "overview";
}

export function getTournamentTabTransitionName(
  fromTab: TournamentTab,
  toTab: TournamentTab,
): string | null {
  if (fromTab === toTab) {
    return null;
  }

  return TAB_ORDER[toTab] > TAB_ORDER[fromTab] ? "tournament-tab-left" : "tournament-tab-right";
}
