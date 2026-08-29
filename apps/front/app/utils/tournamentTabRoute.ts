export type TournamentTab = "overview" | "matches";

const TAB_ORDER = {
  overview: 0,
  matches: 1,
} as const;

export function getTournamentTabFromPath(path: string): TournamentTab {
  return path.endsWith("/matches") ? "matches" : "overview";
}

export function getTournamentTabTransitionName(fromPath: string, toPath: string): string | null {
  const fromTab = getTournamentTabFromPath(fromPath);
  const toTab = getTournamentTabFromPath(toPath);

  if (fromTab === toTab) {
    return null;
  }

  return TAB_ORDER[toTab] > TAB_ORDER[fromTab] ? "tournament-tab-left" : "tournament-tab-right";
}
