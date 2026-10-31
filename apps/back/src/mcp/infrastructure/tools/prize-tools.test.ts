import { describe, expect, it, vi } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Test } from "@nestjs/testing";
import type { DataSource } from "@sarpbc/types";
import { z } from "zod";
import { NewsService } from "../../../news/application/news.service";
import { ContractService } from "../../../roster/application/contract.service";
import { PlayerService } from "../../../roster/application/player.service";
import { TeamService } from "../../../roster/application/team.service";
import { RosterProposalService } from "../../../roster-proposal/application/roster-proposal.service";
import { SearchService } from "../../../search/application/search.service";
import { ManualTournamentService } from "../../../tournament/application/manual-tournament.service";
import { MatchService } from "../../../tournament/application/match/match.service";
import { TournamentPrizeService } from "../../../tournament/application/tournament-prize.service";
import { TournamentService } from "../../../tournament/application/tournament.service";
import type { StaffRole } from "../../../user/domain/staff-access";
import type { McpToolContext } from "../mcp-tool-context";
import { registerReadTools } from "./read-tools";
import { registerRosterTools } from "./roster-tools";

const TOURNAMENT_ID = "0b6e3d8a-1f2c-4e5d-8a9b-7c6d5e4f3a2b";
const TEAM_ID = "6f1c1f9e-2a4b-4c55-9d1e-0f3a2b1c4d5e";
const SOURCE = "https://example.com/fake-cup/prizes";

async function setup(role: StaffRole = "admin", source: DataSource = "manual") {
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
  const module = await Test.createTestingModule({
    providers: [
      { provide: McpServer, useValue: { registerTool } },
      { provide: TournamentPrizeService, useValue: tournamentPrizeService },
      { provide: RosterProposalService, useValue: rosterProposalService },
      { provide: PlayerService, useValue: { findBySlug: vi.fn().mockResolvedValue(player) } },
      {
        provide: TeamService,
        useValue: {
          findBySlug: vi.fn().mockResolvedValue(team),
          getTeamWithPlayers: vi.fn().mockResolvedValue(team),
        },
      },
      { provide: SearchService, useValue: {} },
      { provide: ContractService, useValue: {} },
      { provide: TournamentService, useValue: {} },
      { provide: ManualTournamentService, useValue: {} },
      { provide: MatchService, useValue: {} },
      { provide: NewsService, useValue: {} },
    ],
  }).compile();
  const ctx: McpToolContext = {
    user: { id: "u1", email: "staff@test.com", role },
    searchService: module.get(SearchService),
    playerService: module.get(PlayerService),
    contractService: module.get(ContractService),
    teamService: module.get(TeamService),
    tournamentService: module.get(TournamentService),
    manualTournamentService: module.get(ManualTournamentService),
    matchService: module.get(MatchService),
    newsService: module.get(NewsService),
    rosterProposalService: module.get(RosterProposalService),
    tournamentPrizeService: module.get(TournamentPrizeService),
  };
  const server = module.get(McpServer);
  registerReadTools(server, ctx);
  registerRosterTools(server, ctx);
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
    const { call } = await setup("admin", "startgg");
    expect((await call("get_tournament_prizes", { id: "c1" })).isError).toBe(true);
  });

  it("returns redistributable distributions with the PandaScore prize pool", async () => {
    const { call } = await setup();
    const result = await call("get_tournament_prizes", { id: "c1" });
    expect(JSON.parse(result.content[0].text)).toEqual({
      tournamentId: "c1",
      prizepool: null,
      prizes: [],
    });
  });

  it("excludes start.gg earnings in the queries", async () => {
    const { call, tournamentPrizeService } = await setup();
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
    const { call, rosterProposalService } = await setup();
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
    const { call, rosterProposalService } = await setup("journalist");
    const result = await call("propose_tournament_prizes", {
      tournamentId: TOURNAMENT_ID,
      prizes,
      sourceUrl: SOURCE,
    });
    expect(result.isError).toBe(true);
    expect(rosterProposalService.propose).not.toHaveBeenCalled();
  });

  it("requires a non-Liquipedia source and ISO 4217 currencies", async () => {
    const schema = z.object((await setup()).tool("propose_tournament_prizes")[1].inputSchema);
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
