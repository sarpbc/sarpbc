import { OVERALL_STATS_MIN_GAMES } from "@sarpbc/types";
import type {
  DataSource,
  StatsEra,
  StatsGrouping,
  TournamentPlayerStatsResponse,
} from "@sarpbc/types";
import { isRedistributable } from "../../common/domain/data-source";
import { playerStatsResponse } from "../domain/player-stats";
import type { GameStatsStore } from "./ports";

export interface StatsStage {
  id: string;
  source: DataSource;
}

const NO_STATS = { games: 0, tallies: [], unlinkedAccounts: 0 };

export class TournamentPlayerStatsService {
  constructor(private readonly games: Pick<GameStatsStore, "playerStats">) {}

  async forStages(stages: readonly StatsStage[]) {
    const ids = stages.flatMap(({ id, source }) => (isRedistributable(source) ? [id] : []));

    return playerStatsResponse(
      ids.length === 0 ? NO_STATS : await this.games.playerStats({ ids, kind: "tournaments" }),
      "team",
    ) satisfies TournamentPlayerStatsResponse;
  }

  async overall(era: StatsEra | null, by: StatsGrouping) {
    return playerStatsResponse(
      await this.games.playerStats({
        era,
        kind: "redistributable",
        minGames: { count: OVERALL_STATS_MIN_GAMES, per: by },
      }),
      by,
    ) satisfies TournamentPlayerStatsResponse;
  }
}
