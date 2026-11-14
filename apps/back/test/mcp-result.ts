import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { RosterChange } from "@sarpbc/types";
import { vi } from "vitest";
import { z } from "zod";
import { RosterProposal } from "../src/roster-proposal/domain/roster-proposal";

export function textOf(result: CallToolResult): string {
  const block = result.content[0];

  return block?.type === "text" ? block.text : "";
}

export function jsonOf(result: CallToolResult) {
  return z.json().parse(JSON.parse(textOf(result) || "null"));
}

export function pendingProposalService() {
  return {
    propose: vi.fn(async (change: RosterChange) =>
      Object.assign(new RosterProposal(), { id: "proposal-1", change }),
    ),
    proposeTeamLogo: vi.fn(),
    list: vi.fn(),
  };
}
