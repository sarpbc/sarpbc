import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "../../../auth/infrastructure/http/auth.guard";
import { CurrentUserId } from "../../../user/infrastructure/http/decorator/current-user.decorator";
import { RequirePermissions } from "../../../user/infrastructure/http/decorator/require-permissions.decorator";
import { PermissionGuard } from "../../../user/infrastructure/http/user.guard";
import { RosterProposalService } from "../../application/roster-proposal.service";
import type { RosterProposal } from "../../domain/roster-proposal";
import { ListRosterProposalsQueryDto } from "./dto/list-roster-proposals-query.dto";

function mapProposal(proposal: RosterProposal) {
  return {
    id: proposal.id,
    change: proposal.change,
    sourceUrl: proposal.sourceUrl,
    status: proposal.status,
    proposedById: proposal.proposedById,
    reviewedById: proposal.reviewedById,
    reviewedAt: proposal.reviewedAt,
    entityId: proposal.entityId,
    createdAt: proposal.createdAt,
  };
}

@Controller("roster-proposals")
export class RosterProposalController {
  constructor(private readonly proposals: RosterProposalService) {}

  @RequirePermissions("players.manage", "teams.manage")
  @UseGuards(AuthGuard, PermissionGuard)
  @Get()
  async list(@Query({ schema: ListRosterProposalsQueryDto }) query: ListRosterProposalsQueryDto) {
    const { proposals, names } = await this.proposals.list(query.status);
    return { proposals: proposals.map(mapProposal), names };
  }

  @RequirePermissions("players.manage", "teams.manage")
  @UseGuards(AuthGuard, PermissionGuard)
  @Post(":id/approve")
  @HttpCode(HttpStatus.OK)
  async approve(@Param("id", ParseUUIDPipe) id: string, @CurrentUserId() userId: string) {
    return { proposal: mapProposal(await this.proposals.approve(id, userId)) };
  }

  @RequirePermissions("players.manage", "teams.manage")
  @UseGuards(AuthGuard, PermissionGuard)
  @Post(":id/reject")
  @HttpCode(HttpStatus.OK)
  async reject(@Param("id", ParseUUIDPipe) id: string, @CurrentUserId() userId: string) {
    return { proposal: mapProposal(await this.proposals.reject(id, userId)) };
  }
}
