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
import type { RosterProposal as RosterProposalResponse } from "@sarpbc/types";
import { ROSTER_PROPOSAL_PERMISSIONS } from "@sarpbc/utils";
import { AuthGuard } from "../../../auth/infrastructure/http/auth.guard";
import { CurrentUserId } from "../../../user/infrastructure/http/decorator/current-user.decorator";
import { RequirePermissions } from "../../../user/infrastructure/http/decorator/require-permissions.decorator";
import { PermissionGuard } from "../../../user/infrastructure/http/user.guard";
import { RosterProposalService } from "../../application/roster-proposal.service";
import type { RosterProposal } from "../../domain/roster-proposal";
import { ListRosterProposalsQueryDto } from "./dto/list-roster-proposals-query.dto";

function mapProposal(proposal: RosterProposal): RosterProposalResponse {
  return {
    id: proposal.id,
    change: proposal.change,
    sourceUrl: proposal.sourceUrl,
    status: proposal.status,
    proposedById: proposal.proposedById,
    reviewedById: proposal.reviewedById,
    reviewedAt: proposal.reviewedAt?.toISOString() ?? null,
    entityId: proposal.entityId,
    createdAt: proposal.createdAt.toISOString(),
  };
}

@Controller("roster-proposals")
export class RosterProposalController {
  constructor(private readonly proposals: RosterProposalService) {}

  @RequirePermissions(...ROSTER_PROPOSAL_PERMISSIONS)
  @UseGuards(AuthGuard, PermissionGuard)
  @Get()
  async list(@Query({ schema: ListRosterProposalsQueryDto }) query: ListRosterProposalsQueryDto) {
    const { proposals, names } = await this.proposals.list(query.status);
    return { proposals: proposals.map(mapProposal), names };
  }

  @RequirePermissions(...ROSTER_PROPOSAL_PERMISSIONS)
  @UseGuards(AuthGuard, PermissionGuard)
  @Post(":id/approve")
  @HttpCode(HttpStatus.OK)
  async approve(@Param("id", ParseUUIDPipe) id: string, @CurrentUserId() userId: string) {
    return { proposal: mapProposal(await this.proposals.approve(id, userId)) };
  }

  @RequirePermissions(...ROSTER_PROPOSAL_PERMISSIONS)
  @UseGuards(AuthGuard, PermissionGuard)
  @Post(":id/reject")
  @HttpCode(HttpStatus.OK)
  async reject(@Param("id", ParseUUIDPipe) id: string, @CurrentUserId() userId: string) {
    return { proposal: mapProposal(await this.proposals.reject(id, userId)) };
  }
}
