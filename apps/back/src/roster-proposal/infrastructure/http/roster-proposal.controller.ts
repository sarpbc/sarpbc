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
import type { ListRosterProposalsQueryInput } from "./dto/list-roster-proposals-query.dto";

const mapProposal = (proposal: RosterProposal): RosterProposalResponse => ({
  change: proposal.change,
  createdAt: proposal.createdAt.toISOString(),
  entityId: proposal.entityId,
  id: proposal.id,
  proposedById: proposal.proposedById,
  reviewedAt: proposal.reviewedAt?.toISOString() ?? null,
  reviewedById: proposal.reviewedById,
  sourceUrl: proposal.sourceUrl,
  status: proposal.status,
});

@Controller("roster-proposals")
export class RosterProposalController {
  constructor(private readonly proposals: RosterProposalService) {}

  @RequirePermissions(...ROSTER_PROPOSAL_PERMISSIONS)
  @UseGuards(AuthGuard, PermissionGuard)
  @Get()
  async list(@Query({ schema: ListRosterProposalsQueryDto }) query: ListRosterProposalsQueryInput) {
    const { proposals, names } = await this.proposals.list(query.status);

    return { names, proposals: proposals.map(mapProposal) };
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
