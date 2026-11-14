import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { RosterChange } from "@sarpbc/types";
import { vi } from "vitest";
import { z } from "zod";
import type { RosterProposalService } from "../src/roster-proposal/application/roster-proposal.service";
import { RosterProposal } from "../src/roster-proposal/domain/roster-proposal";

export const textOf = (result: CallToolResult): string => {
  const [block] = result.content;

  return block?.type === "text" ? block.text : "";
};

export const jsonOf = (result: CallToolResult) =>
  z.json().parse(JSON.parse(textOf(result) || "null"));

export const pendingProposalService = () => ({
  propose: vi.fn<RosterProposalService["propose"]>(async (change: RosterChange) =>
    Object.assign(new RosterProposal(), { id: "proposal-1", change }),
  ),
  proposeTeamLogo: vi.fn<RosterProposalService["proposeTeamLogo"]>(),
  list: vi.fn<RosterProposalService["list"]>(),
});
