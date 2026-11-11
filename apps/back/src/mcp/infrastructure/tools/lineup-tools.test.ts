import { describe, expect, it, vi } from "vitest";
import type { RosterChange, StaffRole } from "@sarpbc/types";
import { z } from "zod";
import type { ToolArguments } from "../define-tool";
import { rosterTools } from "./roster-tools";

const MATCH_ID = "0b6e3d8a-1f2c-4e5d-8a9b-7c6d5e4f3a2b";
const SOURCE = "https://example.com/fake-cup/lineups";
const LINEUPS = [
  {
    participantId: "part-fake-a",
    playerIds: ["8d1f3b2a-4c5e-4f60-9a7b-1c2d3e4f5a6b", "9e2a4c3b-5d6f-4a71-8b8c-2d3e4f5a6b7c"],
  },
  { participantId: "part-fake-b", playerIds: ["af3b5d4c-6e7a-4b82-9c9d-3e4f5a6b7c8d"] },
];

function setup(role: StaffRole = "admin") {
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
    (candidate) => candidate.name === "set_match_lineups",
  );
  if (!tool) throw new Error("set_match_lineups is not defined");
  const call = (args: ToolArguments) => tool.run({ id: "u1", email: "staff@test.com", role }, args);
  return { rosterProposalService, tool, call };
}

describe("set_match_lineups", () => {
  it("queues a pending proposal that replaces the match lineups", async () => {
    vi.stubEnv("ADMIN_URL", "https://admin.sarpbc.test");
    const { call, rosterProposalService } = setup();

    const result = await call({ matchId: MATCH_ID, lineups: LINEUPS, sourceUrl: SOURCE });

    expect(rosterProposalService.propose).toHaveBeenCalledExactlyOnceWith(
      { kind: "set_match_lineups", matchId: MATCH_ID, lineups: LINEUPS },
      SOURCE,
      "u1",
    );
    const block = result.content[0];
    expect(JSON.parse(block?.type === "text" ? block.text : "null")).toMatchObject({
      kind: "set_match_lineups",
      status: "pending",
      reviewUrl: expect.stringContaining("admin.sarpbc.test"),
    });
  });

  it("requires a non-Liquipedia sourceUrl and bounded lineups", () => {
    const schema = z.object(setup().tool.inputSchema);
    const input = { matchId: MATCH_ID, lineups: LINEUPS, sourceUrl: SOURCE };
    expect(schema.safeParse(input).success).toBe(true);
    expect(schema.safeParse({ ...input, sourceUrl: undefined }).success).toBe(false);
    expect(
      schema.safeParse({ ...input, sourceUrl: "https://liquipedia.net/rocketleague/Fake_Cup" })
        .success,
    ).toBe(false);
    expect(
      schema.safeParse({
        ...input,
        lineups: [{ participantId: "part-fake-a", playerIds: ["not-a-uuid"] }],
      }).success,
    ).toBe(false);
    expect(
      schema.safeParse({
        ...input,
        lineups: [{ participantId: "part-fake-a", playerIds: Array(7).fill(MATCH_ID) }],
      }).success,
    ).toBe(false);
  });

  it("requires tournaments.manage", async () => {
    const { call, rosterProposalService } = setup("journalist");
    const result = await call({ matchId: MATCH_ID, lineups: LINEUPS, sourceUrl: SOURCE });
    expect(result.isError).toBe(true);
    expect(rosterProposalService.propose).not.toHaveBeenCalled();
  });
});
