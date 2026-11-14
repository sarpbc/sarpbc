import type { ToolArguments } from "../define-tool";
import { describe, expect, it, vi } from "vitest";
import type { StaffRole } from "@sarpbc/types";
import { z } from "zod";
import { prizeTools } from "./prize-tools";
import { jsonOf, pendingProposalService } from "../../../../test/mcp-result";
import { rosterTools } from "./roster-tools";

const TOURNAMENT_ID = "0b6e3d8a-1f2c-4e5d-8a9b-7c6d5e4f3a2b";
const TEAM_ID = "6f1c1f9e-2a4b-4c55-9d1e-0f3a2b1c4d5e";
const SOURCE = "https://example.com/fake-cup/prizes";

const setup = (role: StaffRole = "admin", toolName = "propose_tournament_prizes") => {
  vi.stubEnv("ADMIN_URL", "https://admin.sarpbc.test");

  const rosterProposalService = pendingProposalService();

  const tool = [
    ...rosterTools({ rosterProposalService }),
    ...prizeTools({ rosterProposalService }),
  ].find((candidate) => candidate.name === toolName);

  if (!tool) {
    throw new Error(`${toolName} is not defined`);
  }

  const call = async (args: ToolArguments) =>
    await tool.run({ id: "u1", email: "staff@test.com", role }, args);

  return { rosterProposalService, tool, call };
};

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
    expect(jsonOf(result)).toMatchObject({
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

describe("propose_tournament_prize_update", () => {
  const RULES = "https://www.rocketleague.com/en/news/rlcs-official-rules";

  it("queues a source-only correction with an empty patch", async () => {
    const { call, rosterProposalService } = setup("admin", "propose_tournament_prize_update");
    await call({ tournamentId: TOURNAMENT_ID, teamId: TEAM_ID, sourceUrl: RULES });
    expect(rosterProposalService.propose).toHaveBeenCalledWith(
      { kind: "update_tournament_prize", tournamentId: TOURNAMENT_ID, teamId: TEAM_ID, patch: {} },
      RULES,
      "u1",
    );
  });

  it("queues only the corrected fields", async () => {
    const { call, rosterProposalService } = setup("admin", "propose_tournament_prize_update");
    await call({ tournamentId: TOURNAMENT_ID, teamId: TEAM_ID, amount: 1800, sourceUrl: RULES });
    expect(rosterProposalService.propose).toHaveBeenCalledWith(
      expect.objectContaining({ patch: { amount: 1800 } }),
      RULES,
      "u1",
    );
  });
});

const setupAward = (role?: StaffRole) => setup(role, "propose_player_award");

describe("propose_player_award", () => {
  const PLAYER_ID = "3a9d4c7e-5b1f-4e2a-8c6d-9f0e1d2c3b4a";

  const input = {
    tournamentId: TOURNAMENT_ID,
    teamId: TEAM_ID,
    playerId: PLAYER_ID,
    awardType: "mvp",
    sourceUrl: SOURCE,
  };

  it("queues a proposal instead of creating the award", async () => {
    const { call, rosterProposalService } = setupAward();
    const result = await call(input);

    expect(rosterProposalService.propose).toHaveBeenCalledWith(
      {
        kind: "award_player",
        tournamentId: TOURNAMENT_ID,
        teamId: TEAM_ID,
        playerId: PLAYER_ID,
        awardType: "mvp",
      },
      SOURCE,
      "u1",
    );
    expect(jsonOf(result)).toMatchObject({
      kind: "award_player",
      status: "pending",
    });
  });

  it("requires tournaments.manage", async () => {
    const { call, rosterProposalService } = setupAward("journalist");
    const result = await call(input);
    expect(result.isError).toBe(true);
    expect(rosterProposalService.propose).not.toHaveBeenCalled();
  });

  it("queues a Grand Finals MVP proposal next to the stage MVP", async () => {
    const { call, rosterProposalService } = setupAward();
    await call(input);
    await call({ ...input, awardType: "grand_finals_mvp" });

    expect(rosterProposalService.propose.mock.calls.map(([change]) => change)).toStrictEqual([
      expect.objectContaining({ kind: "award_player", awardType: "mvp" }),
      expect.objectContaining({ kind: "award_player", awardType: "grand_finals_mvp" }),
    ]);
  });

  it("requires a known award type and a non-Liquipedia source", () => {
    const schema = z.object(setupAward().tool.inputSchema);
    expect(schema.safeParse(input).success).toBe(true);

    for (const awardType of [
      "grand_finals_mvp",
      "offensive_mvp",
      "defensive_mvp",
      "breakthrough_player",
    ]) {
      expect(schema.safeParse({ ...input, awardType }).success).toBe(true);
    }

    expect(schema.safeParse({ ...input, awardType: "season_mvp" }).success).toBe(false);
    expect(schema.safeParse({ ...input, awardType: "top_scorer" }).success).toBe(false);
    expect(schema.safeParse({ ...input, sourceUrl: undefined }).success).toBe(false);
    expect(
      schema.safeParse({ ...input, sourceUrl: "https://liquipedia.net/rocketleague/Fake_Cup" })
        .success,
    ).toBe(false);
  });
});
