import { Controller, Get, Query } from "@nestjs/common";
import type { PlayerComparison } from "@sarpbc/types";
import { PlayerComparisonService } from "../../application/player-comparison.service";
import {
  ComparePlayersQueryDto,
  type ComparePlayersQueryInput,
} from "./dto/compare-players-query.dto";
import { mapComparison } from "./player-comparison.mapper";

@Controller("player")
export class PlayerComparisonController {
  constructor(private readonly comparisons: PlayerComparisonService) {}

  @Get("compare")
  async compare(
    @Query({ schema: ComparePlayersQueryDto }) query: ComparePlayersQueryInput,
  ): Promise<{ comparison: PlayerComparison }> {
    return { comparison: mapComparison(await this.comparisons.compare(query.a, query.b)) };
  }
}
