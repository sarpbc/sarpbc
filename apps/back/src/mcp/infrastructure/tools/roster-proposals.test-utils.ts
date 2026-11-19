import type { RosterChange, RosterProposalStatus } from "@sarpbc/types";
import type {
  RosterProposalList,
  RosterProposalService,
  TeamLogoProposal,
} from "../../../roster-proposal/application/roster-proposal.service";
import { RosterProposal } from "../../../roster-proposal/domain/roster-proposal";

export interface ProposedChange {
  change: RosterChange;
  sourceUrl: string;
  proposedById: string;
}

export const proposed = (change: RosterChange, sourceUrl = "", proposedById = "u1") => ({
  change,
  proposedById,
  sourceUrl,
});

export class FakeRosterProposals implements Pick<
  RosterProposalService,
  "propose" | "proposeTeamLogo" | "list"
> {
  readonly changes: ProposedChange[] = [];
  readonly logos: { logo: TeamLogoProposal; sourceUrl: string; proposedById: string }[] = [];
  readonly listings: RosterProposalStatus[] = [];
  proposals: RosterProposalList = { names: {}, proposals: [] };
  private failure: Error | null = null;

  failNext(error: Error) {
    this.failure = error;
  }

  async propose(change: RosterChange, sourceUrl: string, proposedById: string) {
    this.throwPendingFailure();
    this.changes.push({ change, proposedById, sourceUrl });

    return Object.assign(new RosterProposal(), { change, id: "proposal-1", sourceUrl });
  }

  async proposeTeamLogo(logo: TeamLogoProposal, sourceUrl: string, proposedById: string) {
    this.throwPendingFailure();
    this.logos.push({ logo, proposedById, sourceUrl });

    return Object.assign(new RosterProposal(), {
      change: {
        ...logo,
        kind: "upload_team_logo",
        logoKey: `teams/${logo.teamId}/logo-${logo.variant}-0123456789abcdef.webp`,
        logoUrl: `https://cdn.sarpbc.test/teams/${logo.teamId}/logo-${logo.variant}-0123456789abcdef.webp`,
      },
      id: "proposal-1",
      sourceUrl,
    });
  }

  async list(status: RosterProposalStatus) {
    this.listings.push(status);

    return this.proposals;
  }

  private throwPendingFailure() {
    if (this.failure) {
      const { failure } = this;

      this.failure = null;

      throw failure;
    }
  }
}
