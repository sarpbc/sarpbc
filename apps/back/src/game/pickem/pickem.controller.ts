import { Controller, Get, Param, Post, Body, UseGuards, Request } from "@nestjs/common";
import { PickemService } from "./pickem.service";
import { AuthGuard } from "src/auth/auth.guard";
import { AdminGuard } from "src/user/user.guard";
import { AuthenticatedUserRequest } from "src/common/types/authenticated.interface";
import { PostHogService } from "src/posthog/posthog.service";

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
    @Request() req: any,
    @Param("matchId") matchId: string,
    @Body() body: { pickedParticipantId: string },
  ) {
    const userId = req.user.id;
    try {
      await this.pickemService.makePick(userId, matchId, body.pickedParticipantId);
      const distinctId = req.headers["x-posthog-distinct-id"] as string | undefined;
      const sessionId = req.headers["x-posthog-session-id"] as string | undefined;
      this.posthog.capture({
        distinctId,
        event: "server_pickem_pick_submitted",
        sessionId,
        properties: { match_id: matchId },
      });
      await this.posthog.flush();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  @UseGuards(AuthGuard, AdminGuard)
  @Post("matches/:matchId/validate")
  async validateMatch(@Param("matchId") matchId: string) {
    const res = await this.pickemService.validateMatchResult(matchId);
    return res;
  }

  @Get("tournament/:tournamentId/leaderboard")
  async leaderboard(@Param("tournamentId") tournamentId: string) {
    const lb = await this.pickemService.leaderboard(tournamentId);
    return { leaderboard: lb };
  }

  @UseGuards(AuthGuard)
  @Get("tournament/:tournamentId/me")
  async personal(@Param("tournamentId") tournamentId: string, @Request() req: any) {
    const userId = req.user.id;
    const rank = await this.pickemService.personalRanking(tournamentId, userId);
    return rank;
  }
}
