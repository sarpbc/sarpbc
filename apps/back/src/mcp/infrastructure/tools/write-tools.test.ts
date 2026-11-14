import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { Match } from "../../../tournament/domain/match";
import { Tournament } from "../../../tournament/domain/tournament";
import { TournamentParticipant } from "../../../tournament/domain/tournament-participant";
import { Team } from "../../../roster/domain/team";
import type { McpTool, ToolArguments } from "../define-tool";
import { jsonOf } from "../../../../test/mcp-result";
import { writeTools } from "./write-tools";
import type { WriteToolServices } from "./write-tools";

const services = (): WriteToolServices => ({
  manualTournamentService: {
    create: vi.fn<WriteToolServices["manualTournamentService"]["create"]>(),
    update: vi.fn<WriteToolServices["manualTournamentService"]["update"]>(),
  },
  matchService: {
    createEmptyBracket: vi.fn<WriteToolServices["matchService"]["createEmptyBracket"]>(),
    createMatch: vi.fn<WriteToolServices["matchService"]["createMatch"]>(),
    setGameVods: vi.fn<WriteToolServices["matchService"]["setGameVods"]>(),
    setMatchWinner: vi.fn<WriteToolServices["matchService"]["setMatchWinner"]>(),
    setSource: vi.fn<WriteToolServices["matchService"]["setSource"]>(),
    updateMatch: vi.fn<WriteToolServices["matchService"]["updateMatch"]>(),
  },
  newsService: {
    create: vi.fn<WriteToolServices["newsService"]["create"]>(),
    findOneAdminByIdOrSlug: vi.fn<WriteToolServices["newsService"]["findOneAdminByIdOrSlug"]>(),
    update: vi.fn<WriteToolServices["newsService"]["update"]>(),
  },
  pandascoreNewTournamentsSync: {
    execute: vi.fn<WriteToolServices["pandascoreNewTournamentsSync"]["execute"]>(),
  },
  pandascoreTournamentSync: {
    execute: vi.fn<WriteToolServices["pandascoreTournamentSync"]["execute"]>(),
    executeByPandascoreId:
      vi.fn<WriteToolServices["pandascoreTournamentSync"]["executeByPandascoreId"]>(),
  },
  playerService: {
    findById: vi.fn<WriteToolServices["playerService"]["findById"]>(),
    findBySlug: vi.fn<WriteToolServices["playerService"]["findBySlug"]>(),
  },
  teamService: {
    findById: vi.fn<WriteToolServices["teamService"]["findById"]>(),
    findBySlug: vi.fn<WriteToolServices["teamService"]["findBySlug"]>(),
  },
  tournaments: {
    findById: vi.fn<WriteToolServices["tournaments"]["findById"]>(),
  },
});

const defined = (tools: McpTool[], name: string): McpTool => {
  const tool = tools.find((candidate) => candidate.name === name);

  if (!tool) {
    throw new Error(`${name} is not defined`);
  }

  return tool;
};

const textOf = (result: { content: { type: string; text?: string }[] }): string =>
  result.content[0]?.text ?? "";

const setup = (role: "admin" | "journalist") => {
  vi.stubEnv("FRONT_URL", "https://sarpbc.test");

  const match = Object.assign(new Match(), {
    id: "m1",
    name: "Final",
    participants: [],
    publicId: 12,
    tournament: { event: { slug: "worlds" }, slug: "playoffs" },
    vods: [{ game: 5, language: "fr", source: "youtube", url: "https://youtu.be/g5?t=95" }],
  });

  const matchService = {
    ...services().matchService,
    setGameVods: vi.fn<WriteToolServices["matchService"]["setGameVods"]>().mockResolvedValue(match),
  };

  const tool = defined(writeTools({ ...services(), matchService }), "set_match_game_vods");

  return {
    matchService,
    run: async (input: ToolArguments) =>
      await tool.run({ email: "staff@test.com", id: "u1", role }, input),
    tool,
  };
};

describe("set_match_game_vods", () => {
  const links = [{ language: "fr", url: "https://youtu.be/g5?t=95" }];

  it("replaces one game's links and returns the match VODs", async () => {
    const { matchService, run } = setup("admin");
    const result = await run({ game: 5, links, matchId: "m1" });
    expect(matchService.setGameVods).toHaveBeenCalledWith("m1", 5, links);
    const matchUrl: unknown = expect.stringMatching(/^https:\/\/sarpbc\.test\/matches\/12\//u);

    expect(jsonOf(result)).toStrictEqual({
      id: "m1",
      url: matchUrl,
      vods: [{ game: 5, language: "fr", source: "youtube", url: "https://youtu.be/g5?t=95" }],
    });
  });

  it("validates its input shape", () => {
    const { tool } = setup("admin");
    const schema = z.object(tool.inputSchema);
    expect(schema.safeParse({ game: 0, links, matchId: "m1" }).success).toBe(false);
    expect(
      schema.safeParse({ game: 1, links: [{ language: "fra", url: "x" }], matchId: "m1" }).success,
    ).toBe(false);
    expect(schema.safeParse({ game: 1, links: [], matchId: "m1" }).success).toBe(true);
  });

  it("requires tournaments.manage", async () => {
    const { matchService, run } = setup("journalist");
    const runResult = await run({ game: 5, links, matchId: "m1" });
    expect(runResult.isError).toBe(true);
    expect(matchService.setGameVods).not.toHaveBeenCalled();
  });
});

const side = (id: string, teamId: string, slug: string, name: string) =>
  Object.assign(new TournamentParticipant(), {
    id,
    team: Object.assign(new Team(), { id: teamId, name, slug }),
  });

const setupCreateMatch = (
  source: "manual" | "startgg" = "manual",
  role: "admin" | "journalist" = "admin",
) => {
  vi.stubEnv("FRONT_URL", "https://sarpbc.test");
  const kc = side("p-kc", "team-kc", "karmine-corp", "Karmine Corp");
  const m8 = side("p-m8", "team-m8", "gentle-mates", "Gentle Mates");

  const outsider = Object.assign(new Team(), {
    id: "team-out",
    name: "Outsider",
    slug: "outsider",
  });

  const tournament = Object.assign(new Tournament(), {
    endAt: null,
    event: { id: "event", name: "Coupe", slug: "cdf" },
    id: "cup",
    imageUrl: null,
    name: "Coupe",
    participants: [kc, m8],
    slug: "coupe",
    source,
  });

  const match = Object.assign(new Match(), {
    id: "m1",
    name: "Bo5",
    participants: [kc, m8],
    publicId: 12,
    tournament: { event: { slug: "cdf" }, slug: "coupe" },
  });

  const clubs = [kc.team, m8.team, outsider];

  const matchService = {
    createMatch: vi.fn<WriteToolServices["matchService"]["createMatch"]>().mockResolvedValue(match),
  };

  const tournaments = {
    findById: vi.fn<WriteToolServices["tournaments"]["findById"]>(async (id) =>
      id === tournament.id ? tournament : null,
    ),
  };

  const teamService = {
    findById: vi.fn<WriteToolServices["teamService"]["findById"]>(
      async (id) => clubs.find((club) => club.id === id) ?? null,
    ),
    findBySlug: vi.fn<WriteToolServices["teamService"]["findBySlug"]>(
      async (slug) => clubs.find((club) => club.slug === slug) ?? null,
    ),
  };

  const manualTournamentService = {
    create: vi
      .fn<WriteToolServices["manualTournamentService"]["create"]>()
      .mockResolvedValue(tournament),
    update: vi
      .fn<WriteToolServices["manualTournamentService"]["update"]>()
      .mockResolvedValue(tournament),
  };

  const tools = writeTools({
    ...services(),
    manualTournamentService,
    matchService: { ...services().matchService, ...matchService },
    teamService,
    tournaments,
  });

  const registered = (name: string) => defined(tools, name);

  const call = async (
    name: string,
    args: {
      tournamentId?: string;
      name?: string;
      teams?: string[];
      participantIds?: string[];
      beginAt?: string;
      endAt?: string;
      source?: "manual" | "startgg";
      teamIds?: string[];
      eventId?: string;
    },
  ) => {
    const result = await registered(name).run({ email: "staff@test.com", id: "u1", role }, args);
    const text = textOf(result);

    return { body: result.isError === true ? null : jsonOf(result), result, text };
  };

  return { call, manualTournamentService, matchService, registered, tournaments };
};

describe("create_match participants", () => {
  it("resolves team slugs to participant ids and returns them", async () => {
    const { matchService, call } = setupCreateMatch();

    const { body } = await call("create_match", {
      name: "Bo5",
      teams: ["karmine-corp", "gentle-mates"],
      tournamentId: "cup",
    });

    expect(matchService.createMatch).toHaveBeenCalledWith("cup", {
      beginAt: undefined,
      endAt: undefined,
      name: "Bo5",
      numberOfGames: undefined,
      participantIds: ["p-kc", "p-m8"],
      results: undefined,
      status: undefined,
    });
    expect(body).toHaveProperty("participants", [
      {
        id: "p-kc",
        name: "Karmine Corp",
        players: [],
        rosterSourceUrl: null,
        team: { id: "team-kc", name: "Karmine Corp", slug: "karmine-corp" },
      },
      {
        id: "p-m8",
        name: "Gentle Mates",
        players: [],
        rosterSourceUrl: null,
        team: { id: "team-m8", name: "Gentle Mates", slug: "gentle-mates" },
      },
    ]);
  });

  it("still accepts participant ids", async () => {
    const { matchService, call } = setupCreateMatch();
    await call("create_match", {
      name: "Bo5",
      participantIds: ["p-m8", "p-kc"],
      tournamentId: "cup",
    });
    expect(matchService.createMatch).toHaveBeenCalledWith(
      "cup",
      expect.objectContaining({ participantIds: ["p-m8", "p-kc"] }),
    );
  });

  it("reports a missing tournament", async () => {
    const { tournaments, matchService, call } = setupCreateMatch();
    tournaments.findById.mockResolvedValue(null);

    const { result, text } = await call("create_match", {
      name: "Bo5",
      participantIds: ["p-kc", "p-m8"],
      tournamentId: "missing",
    });

    expect(result.isError).toBe(true);
    expect(text).toContain('Tournament "missing" was not found');
    expect(matchService.createMatch).not.toHaveBeenCalled();
  });

  it("rejects a team that is not registered without creating a match", async () => {
    const { matchService, call } = setupCreateMatch();

    const { result, text } = await call("create_match", {
      name: "Bo5",
      teams: ["outsider", "karmine-corp"],
      tournamentId: "cup",
    });

    expect(result.isError).toBe(true);
    expect(text).toContain('Team "Outsider" (outsider) is not registered in "Coupe"');
    expect(matchService.createMatch).not.toHaveBeenCalled();
  });

  it("does not return participants of a start.gg tournament", async () => {
    const { call } = setupCreateMatch("startgg");

    const created = await call("create_match", {
      name: "Bo5",
      participantIds: ["p-kc", "p-m8"],
      tournamentId: "cup",
    });

    expect(created.body).not.toHaveProperty("participants");

    const tournament = await call("create_tournament", {
      beginAt: "2026-11-02",
      endAt: "2026-11-03",
      name: "Hidden",
      source: "startgg",
    });

    expect(tournament.body).not.toHaveProperty("participants");

    const updated = await call("update_tournament", {
      teamIds: ["11111111-1111-4111-8111-111111111111"],
      tournamentId: "cup",
    });

    expect(updated.body).not.toHaveProperty("participants");
  });

  it("returns participants after creating or updating a manual tournament", async () => {
    const { call } = setupCreateMatch();

    const created = await call("create_tournament", {
      beginAt: "2026-11-02",
      endAt: "2026-11-03",
      name: "Coupe",
    });

    expect(created.body).toMatchObject({ participants: [{ id: "p-kc" }, { id: "p-m8" }] });
    const updated = await call("update_tournament", { name: "Coupe", tournamentId: "cup" });
    expect(updated.body).toMatchObject({ participants: [{}, {}] });
  });

  it("passes the target event of a stage and returns it", async () => {
    const { manualTournamentService, call } = setupCreateMatch();
    const eventId = "0b6f2d3e-6c1a-4b8e-9a51-2f7c3d4e5a6b";
    const created = await call("create_tournament", { eventId, name: "Finals" });
    expect(manualTournamentService.create).toHaveBeenCalledWith({ eventId, name: "Finals" });
    expect(created.body).toHaveProperty("event", { id: "event", name: "Coupe", slug: "cdf" });
    await call("update_tournament", { eventId, tournamentId: "cup" });
    expect(manualTournamentService.update).toHaveBeenCalledWith("cup", { eventId });
  });

  it("accepts teams without participantIds and requires tournaments.manage", async () => {
    const { registered, matchService, call } = setupCreateMatch("manual", "journalist");
    const schema = z.object(registered("create_match").inputSchema);
    expect(
      schema.safeParse({
        name: "Bo5",
        teams: ["karmine-corp", "gentle-mates"],
        tournamentId: "cup",
      }).success,
    ).toBe(true);

    const callResult = await call("create_match", {
      name: "Bo5",
      teams: ["a", "b"],
      tournamentId: "cup",
    });

    expect(callResult.result.isError).toBe(true);
    expect(matchService.createMatch).not.toHaveBeenCalled();
  });
});

const setupBracket = (source: "manual" | "startgg") => {
  vi.stubEnv("FRONT_URL", "https://sarpbc.test");
  const stage = { event: { slug: "cdf-2026" }, slug: "finals", source, streams: [] };

  const match = Object.assign(new Match(), {
    id: "final",
    name: "Grand Final",
    previousMatches: [
      { id: "l1", match: { id: "final" }, previousMatch: { id: "semi-1" }, type: "winner" },
    ],
    publicId: 3,
    source,
    tournament: { ...stage, eventStreams: [] },
  });

  const base = services();

  const matchService = {
    ...base.matchService,
    createEmptyBracket: vi
      .fn<WriteToolServices["matchService"]["createEmptyBracket"]>()
      .mockResolvedValue([match]),
    setSource: vi.fn<WriteToolServices["matchService"]["setSource"]>().mockResolvedValue(match),
    updateMatch: vi.fn<WriteToolServices["matchService"]["updateMatch"]>().mockResolvedValue(match),
  };

  const tournaments = {
    findById: vi
      .fn<WriteToolServices["tournaments"]["findById"]>()
      .mockResolvedValue(Object.assign(new Tournament(), { id: "finals", ...stage })),
  };

  const tools = writeTools({ ...base, matchService, tournaments });

  const run = async (name: string, input: ToolArguments) =>
    await defined(tools, name).run({ email: "staff@test.com", id: "u1", role: "admin" }, input);

  return { matchService, run, tools };
};

describe("bracket tools", () => {
  it("forwards bracket links and participants to update_match", async () => {
    const { matchService, run } = setupBracket("manual");
    const previousMatches = [{ previousMatchId: "semi-1", type: "winner" }];

    const result = await run("update_match", {
      matchId: "final",
      participantIds: ["a"],
      previousMatches,
    });

    expect(matchService.updateMatch).toHaveBeenCalledWith(
      "final",
      expect.objectContaining({ participantIds: ["a"], previousMatches }),
    );
    expect(jsonOf(result)).toHaveProperty("previousMatches", previousMatches);
  });

  it("records or clears a match source and refuses BLAST.tv and Liquipedia mirrors", async () => {
    const { tools, matchService, run } = setupBracket("manual");
    const sourceUrl = "https://www.rocketleague.com/en/news/rlcs-official-rules";
    await run("set_match_source", { matchId: "final", sourceUrl });
    expect(matchService.setSource).toHaveBeenCalledWith("final", sourceUrl);

    const input = z.object(defined(tools, "set_match_source").inputSchema);
    expect(input.safeParse({ matchId: "final", sourceUrl: null }).success).toBe(true);

    for (const refused of ["https://blast.tv/rl", "https://liquipedia-mirror.example/rl"]) {
      expect(input.safeParse({ matchId: "final", sourceUrl: refused }).success).toBe(false);
    }
  });

  it("refuses more than two feeders and bracket sizes other than 4, 8 or 16", () => {
    const { tools } = setupBracket("manual");
    const update = z.object(defined(tools, "update_match").inputSchema);
    const link = { previousMatchId: "m", type: "winner" };
    expect(
      update.safeParse({ matchId: "final", previousMatches: [link, link, link] }).success,
    ).toBe(false);
    const generate = z.object(defined(tools, "create_empty_bracket").inputSchema);
    expect(generate.safeParse({ teams: 8, tournamentId: "finals" }).success).toBe(true);
    expect(generate.safeParse({ teams: 6, tournamentId: "finals" }).success).toBe(false);
  });

  it("keeps generated start.gg matches out of the response", async () => {
    const { matchService, run } = setupBracket("startgg");

    const body = jsonOf(await run("create_empty_bracket", { teams: 4, tournamentId: "finals" }));

    expect(matchService.createEmptyBracket).toHaveBeenCalledWith("finals", {
      numberOfGames: undefined,
      teams: 4,
    });
    expect(body).toMatchObject({ created: 1 });
    expect(body).not.toHaveProperty("matches");
  });

  it("lists generated manual matches with their links", async () => {
    const { run } = setupBracket("manual");

    const body = jsonOf(await run("create_empty_bracket", { teams: 4, tournamentId: "finals" }));

    expect(body).toMatchObject({
      matches: [{ previousMatches: [{ previousMatchId: "semi-1", type: "winner" }] }],
    });
  });
});
