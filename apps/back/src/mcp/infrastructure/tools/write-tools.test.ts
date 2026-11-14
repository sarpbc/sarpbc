import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { Match, Tournament, TournamentParticipant } from "../../../tournament/domain/competition";
import { Team } from "../../../roster/domain/roster";
import type { McpTool, ToolArguments } from "../define-tool";
import { writeTools, type WriteToolServices } from "./write-tools";

function services(): WriteToolServices {
  return {
    newsService: { create: vi.fn(), update: vi.fn(), findOneAdminByIdOrSlug: vi.fn() },
    tournaments: { findById: vi.fn() },
    teamService: { findById: vi.fn(), findBySlug: vi.fn() },
    playerService: { findById: vi.fn(), findBySlug: vi.fn() },
    matchService: {
      createMatch: vi.fn(),
      createEmptyBracket: vi.fn(),
      setMatchWinner: vi.fn(),
      setGameVods: vi.fn(),
      updateMatch: vi.fn(),
      setSource: vi.fn(),
    },
    manualTournamentService: { create: vi.fn(), update: vi.fn() },
    pandascoreTournamentSync: { execute: vi.fn(), executeByPandascoreId: vi.fn() },
    pandascoreNewTournamentsSync: { execute: vi.fn() },
  };
}

function defined(tools: McpTool[], name: string): McpTool {
  const tool = tools.find((candidate) => candidate.name === name);

  if (!tool) throw new Error(`${name} is not defined`);

  return tool;
}

function textOf(result: { content: Array<{ type: string; text?: string }> }): string {
  return result.content[0]?.text ?? "";
}

describe("set_match_game_vods", () => {
  function setup(role: "admin" | "journalist") {
    vi.stubEnv("FRONT_URL", "https://sarpbc.test");

    const match = Object.assign(new Match(), {
      id: "m1",
      publicId: 12,
      name: "Final",
      participants: [],
      tournament: { slug: "playoffs", event: { slug: "worlds" } },
      vods: [{ game: 5, url: "https://youtu.be/g5?t=95", language: "fr", source: "youtube" }],
    });

    const matchService = {
      ...services().matchService,
      setGameVods: vi.fn().mockResolvedValue(match),
    };

    const tool = defined(writeTools({ ...services(), matchService }), "set_match_game_vods");

    return {
      matchService,
      tool,
      run: async (input: ToolArguments) =>
        await tool.run({ id: "u1", email: "staff@test.com", role }, input),
    };
  }

  const links = [{ url: "https://youtu.be/g5?t=95", language: "fr" }];

  it("replaces one game's links and returns the match VODs", async () => {
    const { matchService, run } = setup("admin");
    const result = await run({ matchId: "m1", game: 5, links });
    expect(matchService.setGameVods).toHaveBeenCalledWith("m1", 5, links);
    expect(JSON.parse(textOf(result))).toEqual({
      id: "m1",
      vods: [{ game: 5, url: "https://youtu.be/g5?t=95", language: "fr", source: "youtube" }],
      url: expect.stringMatching(/^https:\/\/sarpbc\.test\/matches\/12\//),
    });
  });

  it("validates its input shape", () => {
    const { tool } = setup("admin");
    const schema = z.object(tool.inputSchema);
    expect(schema.safeParse({ matchId: "m1", game: 0, links }).success).toBe(false);
    expect(
      schema.safeParse({ matchId: "m1", game: 1, links: [{ url: "x", language: "fra" }] }).success,
    ).toBe(false);
    expect(schema.safeParse({ matchId: "m1", game: 1, links: [] }).success).toBe(true);
  });

  it("requires tournaments.manage", async () => {
    const { matchService, run } = setup("journalist");
    expect((await run({ matchId: "m1", game: 5, links })).isError).toBe(true);
    expect(matchService.setGameVods).not.toHaveBeenCalled();
  });
});

describe("create_match participants", () => {
  function side(id: string, teamId: string, slug: string, name: string) {
    return Object.assign(new TournamentParticipant(), {
      id,
      team: Object.assign(new Team(), { id: teamId, slug, name }),
    });
  }

  function setup(source: "manual" | "startgg" = "manual", role: "admin" | "journalist" = "admin") {
    vi.stubEnv("FRONT_URL", "https://sarpbc.test");
    const kc = side("p-kc", "team-kc", "karmine-corp", "Karmine Corp");
    const m8 = side("p-m8", "team-m8", "gentle-mates", "Gentle Mates");

    const outsider = Object.assign(new Team(), {
      id: "team-out",
      slug: "outsider",
      name: "Outsider",
    });

    const tournament = Object.assign(new Tournament(), {
      id: "cup",
      name: "Coupe",
      slug: "coupe",
      source,
      imageUrl: null,
      endAt: null,
      event: { id: "event", slug: "cdf", name: "Coupe" },
      participants: [kc, m8],
    });

    const match = Object.assign(new Match(), {
      id: "m1",
      publicId: 12,
      name: "Bo5",
      participants: [kc, m8],
      tournament: { slug: "coupe", event: { slug: "cdf" } },
    });

    const clubs = [kc.team, m8.team, outsider];
    const matchService = { createMatch: vi.fn().mockResolvedValue(match) };

    const tournaments = {
      findById: vi.fn(async (id: string) => (id === tournament.id ? tournament : null)),
    };

    const teamService = {
      findById: vi.fn(async (id: string) => clubs.find((club) => club.id === id) ?? null),
      findBySlug: vi.fn(async (slug: string) => clubs.find((club) => club.slug === slug) ?? null),
    };

    const manualTournamentService = {
      create: vi.fn().mockResolvedValue(tournament),
      update: vi.fn().mockResolvedValue(tournament),
    };

    const tools = writeTools({
      ...services(),
      matchService: { ...services().matchService, ...matchService },
      tournaments,
      teamService,
      manualTournamentService,
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
      const result = await registered(name).run({ id: "u1", email: "staff@test.com", role }, args);
      const text = textOf(result);

      return { result, text, body: result.isError ? null : JSON.parse(text) };
    };

    return { matchService, tournaments, manualTournamentService, registered, call };
  }

  it("resolves team slugs to participant ids and returns them", async () => {
    const { matchService, call } = setup();

    const { body } = await call("create_match", {
      tournamentId: "cup",
      name: "Bo5",
      teams: ["karmine-corp", "gentle-mates"],
    });

    expect(matchService.createMatch).toHaveBeenCalledWith("cup", {
      name: "Bo5",
      beginAt: undefined,
      endAt: undefined,
      status: undefined,
      numberOfGames: undefined,
      participantIds: ["p-kc", "p-m8"],
      results: undefined,
    });
    expect(body.participants).toEqual([
      {
        id: "p-kc",
        name: "Karmine Corp",
        team: { id: "team-kc", slug: "karmine-corp", name: "Karmine Corp" },
        players: [],
        rosterSourceUrl: null,
      },
      {
        id: "p-m8",
        name: "Gentle Mates",
        team: { id: "team-m8", slug: "gentle-mates", name: "Gentle Mates" },
        players: [],
        rosterSourceUrl: null,
      },
    ]);
  });

  it("still accepts participant ids", async () => {
    const { matchService, call } = setup();
    await call("create_match", {
      tournamentId: "cup",
      name: "Bo5",
      participantIds: ["p-m8", "p-kc"],
    });
    expect(matchService.createMatch).toHaveBeenCalledWith(
      "cup",
      expect.objectContaining({ participantIds: ["p-m8", "p-kc"] }),
    );
  });

  it("reports a missing tournament", async () => {
    const { tournaments, matchService, call } = setup();
    tournaments.findById.mockResolvedValue(null);

    const { result, text } = await call("create_match", {
      tournamentId: "missing",
      name: "Bo5",
      participantIds: ["p-kc", "p-m8"],
    });

    expect(result.isError).toBe(true);
    expect(text).toContain('Tournament "missing" was not found');
    expect(matchService.createMatch).not.toHaveBeenCalled();
  });

  it("rejects a team that is not registered without creating a match", async () => {
    const { matchService, call } = setup();

    const { result, text } = await call("create_match", {
      tournamentId: "cup",
      name: "Bo5",
      teams: ["outsider", "karmine-corp"],
    });

    expect(result.isError).toBe(true);
    expect(text).toContain('Team "Outsider" (outsider) is not registered in "Coupe"');
    expect(matchService.createMatch).not.toHaveBeenCalled();
  });

  it("does not return participants of a start.gg tournament", async () => {
    const { call } = setup("startgg");

    const created = await call("create_match", {
      tournamentId: "cup",
      name: "Bo5",
      participantIds: ["p-kc", "p-m8"],
    });

    expect(created.body).not.toHaveProperty("participants");

    const tournament = await call("create_tournament", {
      name: "Hidden",
      beginAt: "2026-11-02",
      endAt: "2026-11-03",
      source: "startgg",
    });

    expect(tournament.body).not.toHaveProperty("participants");

    const updated = await call("update_tournament", {
      tournamentId: "cup",
      teamIds: ["11111111-1111-4111-8111-111111111111"],
    });

    expect(updated.body).not.toHaveProperty("participants");
  });

  it("returns participants after creating or updating a manual tournament", async () => {
    const { call } = setup();

    const created = await call("create_tournament", {
      name: "Coupe",
      beginAt: "2026-11-02",
      endAt: "2026-11-03",
    });

    expect(created.body.participants.map((participant: { id: string }) => participant.id)).toEqual([
      "p-kc",
      "p-m8",
    ]);
    const updated = await call("update_tournament", { tournamentId: "cup", name: "Coupe" });
    expect(updated.body.participants).toHaveLength(2);
  });

  it("passes the target event of a stage and returns it", async () => {
    const { manualTournamentService, call } = setup();
    const eventId = "0b6f2d3e-6c1a-4b8e-9a51-2f7c3d4e5a6b";
    const created = await call("create_tournament", { name: "Finals", eventId });
    expect(manualTournamentService.create).toHaveBeenCalledWith({ name: "Finals", eventId });
    expect(created.body.event).toEqual({ id: "event", slug: "cdf", name: "Coupe" });
    await call("update_tournament", { tournamentId: "cup", eventId });
    expect(manualTournamentService.update).toHaveBeenCalledWith("cup", { eventId });
  });

  it("accepts teams without participantIds and requires tournaments.manage", async () => {
    const { registered, matchService, call } = setup("manual", "journalist");
    const schema = z.object(registered("create_match").inputSchema);
    expect(
      schema.safeParse({
        tournamentId: "cup",
        name: "Bo5",
        teams: ["karmine-corp", "gentle-mates"],
      }).success,
    ).toBe(true);
    expect(
      (await call("create_match", { tournamentId: "cup", name: "Bo5", teams: ["a", "b"] })).result
        .isError,
    ).toBe(true);
    expect(matchService.createMatch).not.toHaveBeenCalled();
  });
});

describe("bracket tools", () => {
  function setup(source: "manual" | "startgg") {
    vi.stubEnv("FRONT_URL", "https://sarpbc.test");
    const stage = { slug: "finals", event: { slug: "cdf-2026" }, source, streams: [] };

    const match = Object.assign(new Match(), {
      id: "final",
      publicId: 3,
      name: "Grand Final",
      source,
      tournament: { ...stage, eventStreams: [] },
      previousMatches: [
        { id: "l1", match: { id: "final" }, previousMatch: { id: "semi-1" }, type: "winner" },
      ],
    });

    const base = services();

    const matchService = {
      ...base.matchService,
      updateMatch: vi.fn().mockResolvedValue(match),
      setSource: vi.fn().mockResolvedValue(match),
      createEmptyBracket: vi.fn().mockResolvedValue([match]),
    };

    const tournaments = {
      findById: vi
        .fn()
        .mockResolvedValue(Object.assign(new Tournament(), { id: "finals", ...stage })),
    };

    const tools = writeTools({ ...base, matchService, tournaments });

    const run = async (name: string, input: ToolArguments) =>
      await defined(tools, name).run({ id: "u1", email: "staff@test.com", role: "admin" }, input);

    return { tools, matchService, run };
  }

  it("forwards bracket links and participants to update_match", async () => {
    const { matchService, run } = setup("manual");
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
    expect(JSON.parse(textOf(result)).previousMatches).toEqual(previousMatches);
  });

  it("records or clears a match source and refuses BLAST.tv and Liquipedia mirrors", async () => {
    const { tools, matchService, run } = setup("manual");
    const sourceUrl = "https://www.rocketleague.com/en/news/rlcs-official-rules";
    await run("set_match_source", { matchId: "final", sourceUrl });
    expect(matchService.setSource).toHaveBeenCalledWith("final", sourceUrl);

    const input = z.object(defined(tools, "set_match_source").inputSchema);
    expect(input.safeParse({ matchId: "final", sourceUrl: null }).success).toBe(true);

    for (const refused of ["https://blast.tv/rl", "https://liquipedia-mirror.example/rl"])
      expect(input.safeParse({ matchId: "final", sourceUrl: refused }).success).toBe(false);
  });

  it("refuses more than two feeders and bracket sizes other than 4, 8 or 16", () => {
    const { tools } = setup("manual");
    const update = z.object(defined(tools, "update_match").inputSchema);
    const link = { previousMatchId: "m", type: "winner" };
    expect(
      update.safeParse({ matchId: "final", previousMatches: [link, link, link] }).success,
    ).toBe(false);
    const generate = z.object(defined(tools, "create_empty_bracket").inputSchema);
    expect(generate.safeParse({ tournamentId: "finals", teams: 8 }).success).toBe(true);
    expect(generate.safeParse({ tournamentId: "finals", teams: 6 }).success).toBe(false);
  });

  it("keeps generated start.gg matches out of the response", async () => {
    const { matchService, run } = setup("startgg");

    const body = JSON.parse(
      textOf(await run("create_empty_bracket", { tournamentId: "finals", teams: 4 })),
    );

    expect(matchService.createEmptyBracket).toHaveBeenCalledWith("finals", {
      teams: 4,
      numberOfGames: undefined,
    });
    expect(body).toMatchObject({ created: 1 });
    expect(body.matches).toBeUndefined();
  });

  it("lists generated manual matches with their links", async () => {
    const { run } = setup("manual");

    const body = JSON.parse(
      textOf(await run("create_empty_bracket", { tournamentId: "finals", teams: 4 })),
    );

    expect(body.matches[0].previousMatches).toEqual([
      { previousMatchId: "semi-1", type: "winner" },
    ]);
  });
});
