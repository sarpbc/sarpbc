import { Controller, Get, Query } from "@nestjs/common";
import { PlayerService } from "../../application/player.service";
import { TeamService } from "../../application/team.service";
import { TransferService } from "../../application/transfer.service";
import { ListTransfersQueryDto } from "./dto/list-transfers-query.dto";
import { mapTransfer } from "./transfer.mapper";

@Controller("transfers")
export class TransferController {
  constructor(
    private transferService: TransferService,
    private teamService: TeamService,
    private playerService: PlayerService,
  ) {}

  @Get()
  async find(@Query({ schema: ListTransfersQueryDto }) query: ListTransfersQueryDto) {
    const [team, player] = await Promise.all([
      query.team ? this.teamService.findBySlug(query.team) : null,
      query.player ? this.playerService.findBySlug(query.player) : null,
    ]);
    if ((query.team && !team) || (query.player && !player)) {
      return { transfers: [], count: 0 };
    }

    const [transfers, count] = await this.transferService.findAndCount({
      teamId: team?.id,
      playerId: player?.id,
      type: query.type,
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined,
      limit: query.limit,
      offset: query.offset,
    });
    return { transfers: transfers.map(mapTransfer), count };
  }
}
