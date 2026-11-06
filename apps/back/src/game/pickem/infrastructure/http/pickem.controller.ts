import { Controller, Get, Param, Post, Body, UseGuards, Request } from "@nestjs/common";
import { PickemService } from "../../application/pickem.service";
import { AuthGuard } from "../../../../auth/infrastructure/http/auth.guard";
import { RequirePermissions } from "../../../../user/infrastructure/http/decorator/require-permissions.decorator";
import { PermissionGuard } from "../../../../user/infrastructure/http/user.guard";
import { AuthenticatedUserRequest } from "../../../../common/infrastructure/http/types/authenticated.interface";
import { PostHogService } from "../../../../infrastructure/telemetry/posthog.service";
import { captureGameEvent } from "../../../infrastructure/capture-game-event";
import { MakePickDto } from "./dto/make-pick.dto";

@Controller("pickem")
export class PickemController {
  constructor(
    private readonly pickemService: PickemService,
    private readonly posthog: PostHogService,
  ) {}

  @UseGuards(AuthGuard)
  @Get("tournament/:tournamentId/user/picks")
  async getUserPicksForTournament(
    @Param("tournamentId") tournamentId: string,
    @Request() req: AuthenticatedUserRequest,
  ) {
    const picks = await this.pickemService.getUserPicksForTournament(tournamentId, req.user.id);
    return { picks };
  }

  @UseGuards(AuthGuard)
  @Post("match/:matchId/pick")
  async makePick(
    @Request() req: AuthenticatedUserRequest,
    @Param("matchId") matchId: string,
    @Body({ schema: MakePickDto }) body: MakePickDto,
  ) {
    await this.pickemService.makePick(req.user.id, matchId, body.pickedParticipantId);
    await captureGameEvent(this.posthog, req.headers, "server_pickem_pick_submitted", {
      match_id: matchId,
    });
    return { success: true };
  }

  @RequirePermissions("pickems.manage")
  @UseGuards(AuthGuard, PermissionGuard)
  @Post("matches/:matchId/validate")
  async validateMatch(@Param("matchId") matchId: string) {
    return this.pickemService.validateMatchResult(matchId);
  }

  @Get("tournament/:tournamentId/leaderboard")
  async leaderboard(@Param("tournamentId") tournamentId: string) {
    const leaderboard = await this.pickemService.leaderboard(tournamentId);
    return { leaderboard };
  }

  @UseGuards(AuthGuard)
  @Get("tournament/:tournamentId/me")
  async personal(
    @Param("tournamentId") tournamentId: string,
    @Request() req: AuthenticatedUserRequest,
  ) {
    return this.pickemService.personalRanking(tournamentId, req.user.id);
  }
}
