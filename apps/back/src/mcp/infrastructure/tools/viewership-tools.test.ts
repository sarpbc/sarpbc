import { describe, expect, it, vi } from "vitest";
import type { RosterChange, StaffRole } from "@sarpbc/types";
import { z } from "zod";
import type { ToolArguments } from "../define-tool";
import { rosterTools } from "./roster-tools";

const MATCH_ID = "0b6e3d8a-1f2c-4e5d-8a9b-7c6d5e4f3a2b";
const SOURCE = "https://escharts.com/tournaments/rl/fake-open";
const INPUT = {
  peakViewers: 48_000,
  scope: "official",
  sourceName: "Esports Charts",
  sourceUrl: SOURCE,
};

function setup(toolName: string, role: StaffRole = "admin") {
  const rosterProposalService = {
    propose: vi.fn().mockImplementation(async (change: RosterChange) => ({
      id: "proposal-1",
      status: "pending",
      change,
    })),
    proposeTeamLogo: vi.fn(),
    list: vi.fn(),
  };
  const tool = rosterTools({ rosterProposalService }).find(
    (candidate) => candidate.name === toolName,
  );
  if (!tool) throw new Error(`${toolName} is not defined`);
  const call = (args: ToolArguments) => tool.run({ id: "u1", email: "staff@test.com", role }, args);
  return { rosterProposalService, tool, call };
}

describe("viewership tools", () => {
  it.each([
    ["set_event_viewership", "eventId"],
    ["set_match_viewership", "matchId"],
  ])("%s queues a proposal credited to its sourceUrl", async (kind, idField) => {
    vi.stubEnv("ADMIN_URL", "https://admin.sarpbc.test");
    const { call, rosterProposalService } = setup(kind);

    const result = await call({ [idField]: MATCH_ID, ...INPUT, averageViewers: 30_000 });

    expect(rosterProposalService.propose).toHaveBeenCalledExactlyOnceWith(
      {
        kind,
        [idField]: MATCH_ID,
        viewership: {
          peakViewers: 48_000,
          averageViewers: 30_000,
          scope: "official",
          measuredAt: null,
          sourceName: "Esports Charts",
          sourceUrl: SOURCE,
        },
      },
      SOURCE,
      "u1",
    );
    const block = result.content[0];
    expect(JSON.parse(block?.type === "text" ? block.text : "null")).toMatchObject({
      kind,
      status: "pending",
    });
  });

  it("requires an https sourceUrl that is neither Liquipedia nor BLAST.tv, and a source name", () => {
    const schema = z.object(setup("set_match_viewership").tool.inputSchema);
    const input = { matchId: MATCH_ID, ...INPUT };
    expect(schema.safeParse(input).success).toBe(true);
    for (const invalid of [
      { sourceUrl: undefined },
      { sourceUrl: "http://escharts.com/tournaments/rl/fake-open" },
      { sourceUrl: "https://liquipedia.net/rocketleague/Fake_Open" },
      { sourceUrl: "https://blast.tv/rl/fake-open" },
      { sourceName: undefined },
      { sourceName: " " },
      { peakViewers: -1 },
      { scope: "replay" },
    ]) {
      expect(schema.safeParse({ ...input, ...invalid }).success).toBe(false);
    }
  });

  it("requires tournaments.manage", async () => {
    const { call, rosterProposalService } = setup("set_match_viewership", "journalist");
    const result = await call({ matchId: MATCH_ID, ...INPUT });
    expect(result.isError).toBe(true);
    expect(rosterProposalService.propose).not.toHaveBeenCalled();
  });
});
