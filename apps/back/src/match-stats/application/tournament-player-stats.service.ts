import { OVERALL_STATS_MIN_GAMES } from "@sarpbc/types";
import type { StatsEra, TournamentPlayerStatsResponse } from "@sarpbc/types";
import { playerStatsResponse } from "../domain/player-stats";
import type { GameStatsStore } from "./ports";

const NO_STATS = { games: 0, tallies: [], unlinkedAccounts: 0 };

export class TournamentPlayerStatsService {
  constructor(private readonly games: Pick<GameStatsStore, "playerStats">) {}

  async forStages(stages: readonly { id: string }[]) {
    const ids = stages.map(({ id }) => id);

    return playerStatsResponse(
      ids.length === 0 ? NO_STATS : await this.games.playerStats({ ids, kind: "tournaments" }),
    ) satisfies TournamentPlayerStatsResponse;
  }

  async overall(era: StatsEra | null) {
    return playerStatsResponse(
      await this.games.playerStats({
        era,
        kind: "overall",
        minGames: OVERALL_STATS_MIN_GAMES,
      }),
    ) satisfies TournamentPlayerStatsResponse;
  }
}
