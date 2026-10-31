import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { registerReadTools } from "./read-tools";
import { registerRosterTools } from "./roster-tools";

const TOURNAMENT_ID = "0b6e3d8a-1f2c-4e5d-8a9b-7c6d5e4f3a2b";
const TEAM_ID = "6f1c1f9e-2a4b-4c55-9d1e-0f3a2b1c4d5e";
const SOURCE = "https://example.com/fake-cup/prizes";

function setup(role: "admin" | "journalist" = "admin", source = "manual") {
  vi.stubEnv("FRONT_URL", "https://sarpbc.test");
  vi.stubEnv("ADMIN_URL", "https://admin.sarpbc.test");
  const team = { id: "t1", slug: "fake-team", name: "Fake Team", players: [] };
  const player = { id: "p1", slug: "fake-player", name: "Fake Player", team };
  const earnings = { totals: [{ currency: "USD", amount: 10 }], years: [] };
  const tournamentPrizeService = {
    findByTournamentId: vi.fn().mockResolvedValue({ source, prizepool: null, prizes: [] }),
    teamEarnings: vi.fn().mockResolvedValue(earnings),
    playerEarnings: vi.fn().mockResolvedValue(earnings),
  };
  const rosterProposalService = {
    propose: vi.fn().mockResolvedValue({ id: "proposal-1", status: "pending" }),
  };
  const registerTool = vi.fn();
  const ctx = {
    user: { id: "u1", email: "staff@test.com", role },
    tournamentPrizeService,
    rosterProposalService,
    playerService: { findBySlug: vi.fn().mockResolvedValue(player) },
    teamService: {
      findBySlug: vi.fn().mockResolvedValue(team),
      getTeamWithPlayers: vi.fn().mockResolvedValue(team),
    },
  };
  registerReadTools({ registerTool } as never, ctx as never);
  registerRosterTools({ registerTool } as never, ctx as never);
  const tool = (name: string) => {
    const registered = registerTool.mock.calls.find((call) => call[0] === name);
    if (!registered) throw new Error(`${name} is not registered`);
    return registered;
  };
  const call = <Args>(name: string, args: Args) => tool(name)[2](args);
  return { tournamentPrizeService, rosterProposalService, tool, call };
}

describe("MCP prize read tools", () => {
  it("hides start.gg prize distributions", async () => {
    const { call } = setup("admin", "startgg");
    expect((await call("get_tournament_prizes", { id: "c1" })).isError).toBe(true);
  });

  it("returns redistributable distributions with the PandaScore prize pool", async () => {
    const { call } = setup();
    const result = await call("get_tournament_prizes", { id: "c1" });
    expect(JSON.parse(result.content[0].text)).toEqual({
      tournamentId: "c1",
      prizepool: null,
      prizes: [],
    });
  });

  it("excludes start.gg earnings in the queries", async () => {
    const { call, tournamentPrizeService } = setup();
    await call("get_team_earnings", { idOrSlug: "fake-team" });
    await call("get_player_earnings", { idOrSlug: "fake-player" });
    expect(tournamentPrizeService.teamEarnings).toHaveBeenCalledWith("t1", {
      redistributableOnly: true,
    });
    expect(tournamentPrizeService.playerEarnings).toHaveBeenCalledWith("p1", {
      redistributableOnly: true,
    });
  });
});

describe("propose_tournament_prizes", () => {
  const prizes = [{ placement: 1, amount: 500, currency: "EUR", teamId: TEAM_ID }];

  it("queues a proposal instead of writing the distribution", async () => {
    const { call, rosterProposalService } = setup();
    const result = await call("propose_tournament_prizes", {
      tournamentId: TOURNAMENT_ID,
      prizes,
      sourceUrl: SOURCE,
    });

    expect(rosterProposalService.propose).toHaveBeenCalledWith(
      {
        kind: "set_tournament_prizes",
        tournamentId: TOURNAMENT_ID,
        prizes: [{ ...prizes[0], playerIds: [] }],
      },
      SOURCE,
      "u1",
    );
    expect(JSON.parse(result.content[0].text)).toMatchObject({
      kind: "set_tournament_prizes",
      status: "pending",
    });
  });

  it("requires tournaments.manage", async () => {
    const { call, rosterProposalService } = setup("journalist");
    const result = await call("propose_tournament_prizes", {
      tournamentId: TOURNAMENT_ID,
      prizes,
      sourceUrl: SOURCE,
    });
    expect(result.isError).toBe(true);
    expect(rosterProposalService.propose).not.toHaveBeenCalled();
  });

  it("requires a non-Liquipedia source and ISO 4217 currencies", () => {
    const schema = z.object(setup().tool("propose_tournament_prizes")[1].inputSchema);
    const input = { tournamentId: TOURNAMENT_ID, prizes, sourceUrl: SOURCE };
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
