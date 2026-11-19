import type { DataSource, TournamentPlayerStatsResponse } from "@sarpbc/types";
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
    ) satisfies TournamentPlayerStatsResponse;
  }

  async overall() {
    return playerStatsResponse(
      await this.games.playerStats({ kind: "redistributable" }),
    ) satisfies TournamentPlayerStatsResponse;
  }
}
