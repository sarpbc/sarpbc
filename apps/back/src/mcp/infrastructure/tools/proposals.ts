import type { RosterChange } from "@sarpbc/types";
import type { RosterProposalService } from "../../../roster-proposal/application/roster-proposal.service";
import type { RosterProposal } from "../../../roster-proposal/domain/roster-proposal";
import type { ToolWrite } from "../define-tool";
import { adminRosterProposalsUrl } from "../urls";
import { dataSourceUrlField } from "./tool-input";

const REVIEW_NOTE =
  "Nothing changed yet. A staff member must approve this proposal in the admin app before it applies.";

export const proposalSourceUrlSchema = dataSourceUrlField(
  "Required public source: the official team or player announcement, the official Rocket League rules, RLEsports, the PandaScore page, or the start.gg event. Never Liquipedia, a mirror of it or BLAST.tv. A start.gg source marks created players and teams as start.gg data; they stay public and readable through the MCP.",
);

export const proposed = (proposal: RosterProposal, sourceUrl: string | undefined): ToolWrite => ({
  entityId: proposal.id,
  sourceUrl,
  result: {
    proposalId: proposal.id,
    kind: proposal.change.kind,
    change: proposal.change,
    status: proposal.status,
    reviewUrl: adminRosterProposalsUrl(),
    note: REVIEW_NOTE,
  },
});

export const proposer =
  (proposals: Pick<RosterProposalService, "propose">) =>
  async (change: RosterChange, sourceUrl: string, userId: string) =>
    proposed(await proposals.propose(change, sourceUrl, userId), sourceUrl);
