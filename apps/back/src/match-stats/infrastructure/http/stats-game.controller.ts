import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from "@nestjs/common";
import type { TournamentStatsGame } from "@sarpbc/types";
import { AuthGuard } from "../../../auth/infrastructure/http/auth.guard";
import { RequirePermissions } from "../../../user/infrastructure/http/decorator/require-permissions.decorator";
import { PermissionGuard } from "../../../user/infrastructure/http/user.guard";
import { ManualGameService } from "../../application/manual-game.service";
import { AttachReplayDto } from "./dto/attach-replay.dto";

@Controller("tournaments/:id/stats-games")
@UseGuards(AuthGuard, PermissionGuard)
@RequirePermissions("tournaments.manage")
export class StatsGameController {
  constructor(private readonly service: ManualGameService) {}

  @Get()
  async list(@Param("id") tournamentId: string): Promise<{ games: TournamentStatsGame[] }> {
    return { games: await this.service.list(tournamentId) };
  }

  @Post()
  attach(
    @Param("id") tournamentId: string,
    @Body({ schema: AttachReplayDto }) dto: AttachReplayDto,
  ): Promise<TournamentStatsGame> {
    return this.service.attach(tournamentId, dto);
  }

  @Delete(":matchId/:number")
  remove(
    @Param("id") tournamentId: string,
    @Param("matchId") matchId: string,
    @Param("number", ParseIntPipe) number: number,
  ): Promise<TournamentStatsGame> {
    return this.service.remove(tournamentId, matchId, number);
  }
}
