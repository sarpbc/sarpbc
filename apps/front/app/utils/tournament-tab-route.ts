import type { TournamentTab } from "@sarpbc/types";
import { stageMatchesPath, stageStatsPath, tournamentStagePath } from "@sarpbc/utils";

// Detected by route name, not path: a stage may itself be slugged `matches`.
export const getTournamentTabFromRouteName = (
  routeBaseName: PropertyKey | undefined,
): TournamentTab => {
  if (routeBaseName === "tournaments-event-stage-matches") {
    return "matches";
  }

  if (routeBaseName === "tournaments-event-stage-stats") {
    return "stats";
  }

  return "overview";
};

export const tournamentTabPath = (tab: TournamentTab, eventSlug: string, stageSlug: string) => {
  switch (tab) {
    case "overview": {
      return tournamentStagePath(eventSlug, stageSlug);
    }

    case "matches": {
      return stageMatchesPath(eventSlug, stageSlug);
    }

    case "stats": {
      return stageStatsPath(eventSlug, stageSlug);
    }

    default: {
      const unreachable: never = tab;

      return unreachable;
    }
  }
};
