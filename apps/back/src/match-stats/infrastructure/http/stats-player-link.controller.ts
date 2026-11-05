import { Body, Controller, Get, Param, Put, UseGuards } from "@nestjs/common";
import type { StatsPlayerLinkResult, UnlinkedStatsPlayer } from "@sarpbc/types";
import { AuthGuard } from "../../../auth/infrastructure/http/auth.guard";
import { RequirePermissions } from "../../../user/infrastructure/http/decorator/require-permissions.decorator";
import { PermissionGuard } from "../../../user/infrastructure/http/user.guard";
import { StatsPlayerLinkService } from "../../application/stats-player-link.service";
import { LinkStatsPlayerDto } from "./dto/link-stats-player.dto";

@Controller("tournaments/:id/stats-players")
@UseGuards(AuthGuard, PermissionGuard)
@RequirePermissions("tournaments.manage")
export class StatsPlayerLinkController {
  constructor(private readonly service: StatsPlayerLinkService) {}

  @Get("unlinked")
  async unlinked(@Param("id") tournamentId: string): Promise<{ players: UnlinkedStatsPlayer[] }> {
    return { players: await this.service.unlinked(tournamentId) };
  }

  @Put("link")
  async link(
    @Param("id") tournamentId: string,
    @Body({ schema: LinkStatsPlayerDto }) dto: LinkStatsPlayerDto,
  ): Promise<StatsPlayerLinkResult> {
    const linkedRows = await this.service.link(tournamentId, dto);
    return { link: dto, linkedRows };
  }
}
