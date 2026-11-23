import type { TournamentStatsGame } from "@sarpbc/types";
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
import { AuthGuard } from "../../../auth/infrastructure/http/auth.guard";
import { RequirePermissions } from "../../../user/infrastructure/http/decorator/require-permissions.decorator";
import { PermissionGuard } from "../../../user/infrastructure/http/user.guard";
import { ManualGameService } from "../../application/manual-game.service";
import { AppendReplayDto, AttachReplayDto } from "./dto/attach-replay.dto";
import type { AppendReplayInput, AttachReplayInput } from "./dto/attach-replay.dto";

@Controller("tournaments/:id/stats-games")
@UseGuards(AuthGuard, PermissionGuard)
@RequirePermissions("tournaments.manage")
export class StatsGameController {
  constructor(private readonly service: ManualGameService) {}

  @Get()
  async list(@Param("id") tournamentId: string) {
    return { games: await this.service.list(tournamentId) } satisfies {
      games: TournamentStatsGame[];
    };
  }

  @Post()
  async attach(
    @Param("id") tournamentId: string,
    @Body({ schema: AttachReplayDto }) dto: AttachReplayInput,
  ) {
    return (await this.service.attach(tournamentId, dto)) satisfies TournamentStatsGame;
  }

  @Delete(":matchId/:number")
  async remove(
    @Param("id") tournamentId: string,
    @Param("matchId") matchId: string,
    @Param("number", ParseIntPipe) number: number,
  ) {
    return (await this.service.remove(tournamentId, matchId, number)) satisfies TournamentStatsGame;
  }

  @Post(":matchId/:number/replays")
  async appendReplay(
    @Param("id") tournamentId: string,
    @Param("matchId") matchId: string,
    @Param("number", ParseIntPipe) number: number,
    @Body({ schema: AppendReplayDto }) dto: AppendReplayInput,
  ) {
    return (await this.service.appendReplay(
      tournamentId,
      { matchId, number },
      dto,
    )) satisfies TournamentStatsGame;
  }

  @Delete(":matchId/:number/replays/:replayId")
  async removeReplay(
    @Param("id") tournamentId: string,
    @Param("matchId") matchId: string,
    @Param("number", ParseIntPipe) number: number,
    @Param("replayId") replayId: string,
  ) {
    return (await this.service.removeReplay(
      tournamentId,
      { matchId, number },
      replayId,
    )) satisfies TournamentStatsGame;
  }
}
