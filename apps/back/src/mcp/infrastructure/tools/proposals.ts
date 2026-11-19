import type { RosterChange } from "@sarpbc/types";
import type { RosterProposalService } from "../../../roster-proposal/application/roster-proposal.service";
import type { RosterProposal } from "../../../roster-proposal/domain/roster-proposal";
import { adminRosterProposalsUrl } from "../urls";
import { dataSourceUrlField } from "./tool-input";

const REVIEW_NOTE =
  "Nothing changed yet. A staff member must approve this proposal in the admin app before it applies.";

export const proposalSourceUrlSchema = dataSourceUrlField(
  "Required public source: the official team or player announcement, the official Rocket League rules, RLEsports, the PandaScore page, or the start.gg event. Never Liquipedia, a mirror of it or BLAST.tv. A start.gg source marks created players and teams as start.gg data; they stay public and readable through the MCP.",
);

export const proposed = (proposal: RosterProposal, sourceUrl: string | undefined) => ({
  entityId: proposal.id,
  result: {
    change: proposal.change,
    kind: proposal.change.kind,
    note: REVIEW_NOTE,
    proposalId: proposal.id,
    reviewUrl: adminRosterProposalsUrl(),
    status: proposal.status,
  },
  sourceUrl,
});

export const proposer =
  (proposals: Pick<RosterProposalService, "propose">) =>
  async (change: RosterChange, sourceUrl: string, userId: string) =>
    proposed(await proposals.propose(change, sourceUrl, userId), sourceUrl);
