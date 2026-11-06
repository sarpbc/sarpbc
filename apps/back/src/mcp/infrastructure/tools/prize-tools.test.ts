import type { ToolArguments } from "../define-tool";
import { describe, expect, it, vi } from "vitest";
import type { RosterChange, StaffRole } from "@sarpbc/types";
import { z } from "zod";
import { rosterTools } from "./roster-tools";

const TOURNAMENT_ID = "0b6e3d8a-1f2c-4e5d-8a9b-7c6d5e4f3a2b";
const TEAM_ID = "6f1c1f9e-2a4b-4c55-9d1e-0f3a2b1c4d5e";
const SOURCE = "https://example.com/fake-cup/prizes";

function setup(role: StaffRole = "admin") {
  vi.stubEnv("ADMIN_URL", "https://admin.sarpbc.test");
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
    (candidate) => candidate.name === "propose_tournament_prizes",
  );
  if (!tool) throw new Error("propose_tournament_prizes is not defined");
  const call = (args: ToolArguments) => tool.run({ id: "u1", email: "staff@test.com", role }, args);
  return { rosterProposalService, tool, call };
}

describe("propose_tournament_prizes", () => {
  const prizes = [{ placement: 1, amount: 500, currency: "EUR", teamId: TEAM_ID }];
  const input = { tournamentId: TOURNAMENT_ID, prizes, sourceUrl: SOURCE };

  it("queues a proposal instead of writing the distribution", async () => {
    const { call, rosterProposalService } = setup();
    const result = await call(input);

    expect(rosterProposalService.propose).toHaveBeenCalledWith(
      {
        kind: "set_tournament_prizes",
        tournamentId: TOURNAMENT_ID,
        prizes: [{ ...prizes[0], playerIds: [] }],
      },
      SOURCE,
      "u1",
    );
    const block = result.content[0];
    expect(JSON.parse(block?.type === "text" ? block.text : "null")).toMatchObject({
      kind: "set_tournament_prizes",
      status: "pending",
    });
  });

  it("requires tournaments.manage", async () => {
    const { call, rosterProposalService } = setup("journalist");
    const result = await call(input);
    expect(result.isError).toBe(true);
    expect(rosterProposalService.propose).not.toHaveBeenCalled();
  });

  it("requires a non-Liquipedia source and ISO 4217 currencies", () => {
    const schema = z.object(setup().tool.inputSchema);
    expect(schema.safeParse(input).success).toBe(true);
    expect(schema.safeParse({ ...input, sourceUrl: undefined }).success).toBe(false);
    expect(
      schema.safeParse({ ...input, sourceUrl: "https://liquipedia.net/rocketleague/Fake_Cup" })
        .success,
    ).toBe(false);
    expect(
      schema.safeParse({ ...input, prizes: [{ ...prizes[0], currency: "XYZ" }] }).success,
    ).toBe(false);
  });
});
