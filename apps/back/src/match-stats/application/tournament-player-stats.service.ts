import type { DataSource, TournamentPlayerStatsResponse } from "@sarpbc/types";
import { isRedistributable } from "../../common/domain/data-source";
import { aggregatePlayerStats } from "../domain/player-stats";
import type { GameStatsStore } from "./ports";

export interface StatsStage {
  id: string;
  source: DataSource;
}

export class TournamentPlayerStatsService {
  constructor(private readonly games: Pick<GameStatsStore, "playerLines">) {}

  async forStages(stages: readonly StatsStage[]): Promise<TournamentPlayerStatsResponse> {
    const ids = stages.filter((stage) => isRedistributable(stage.source)).map(({ id }) => id);
    return aggregatePlayerStats(ids.length === 0 ? [] : await this.games.playerLines(ids));
  }
}
