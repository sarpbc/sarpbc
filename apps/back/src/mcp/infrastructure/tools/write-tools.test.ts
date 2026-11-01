import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { Match, Tournament, TournamentParticipant } from "../../../tournament/domain/competition";
import { Team } from "../../../roster/domain/roster";
import { BadRequestException } from "@nestjs/common";
import { registerWriteTools, requireNewsUpdateFields } from "./write-tools";

describe("requireNewsUpdateFields", () => {
  it("rejects when no field is provided", () => {
    expect(() => requireNewsUpdateFields({})).toThrow(BadRequestException);
  });

  it("accepts a single optional field", () => {
    expect(() => requireNewsUpdateFields({ title: "Zen joins Karmine Corp" })).not.toThrow();
  });

  it("accepts a null clear for French or image fields", () => {
    expect(() => requireNewsUpdateFields({ titleFr: null, imageUrl: null })).not.toThrow();
  });

  it("accepts a type-only update", () => {
    expect(() => requireNewsUpdateFields({ type: "article" })).not.toThrow();
  });
});

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
    const matchService = { setGameVods: vi.fn().mockResolvedValue(match) };
    const registerTool = vi.fn();
    registerWriteTools(
      { registerTool } as never,
      {
        user: { id: "u1", email: "staff@test.com", role },
        matchService,
      } as never,
    );
    const tool = registerTool.mock.calls.find((call) => call[0] === "set_match_game_vods");
    if (!tool) throw new Error("set_match_game_vods is not registered");
    return { matchService, tool };
  }

  const links = [{ url: "https://youtu.be/g5?t=95", language: "fr" }];

  it("replaces one game's links and returns the match VODs", async () => {
    const { matchService, tool } = setup("admin");
    const result = await tool[2]({ matchId: "m1", game: 5, links });
    expect(matchService.setGameVods).toHaveBeenCalledWith("m1", 5, links);
    expect(JSON.parse(result.content[0].text)).toEqual({
      id: "m1",
      vods: [{ game: 5, url: "https://youtu.be/g5?t=95", language: "fr", source: "youtube" }],
      url: expect.stringMatching(/^https:\/\/sarpbc\.test\/matches\/12\//),
    });
  });

  it("validates its input shape", () => {
    const { tool } = setup("admin");
    const schema = z.object(tool[1].inputSchema);
    expect(schema.safeParse({ matchId: "m1", game: 0, links }).success).toBe(false);
    expect(
      schema.safeParse({ matchId: "m1", game: 1, links: [{ url: "x", language: "fra" }] }).success,
    ).toBe(false);
    expect(schema.safeParse({ matchId: "m1", game: 1, links: [] }).success).toBe(true);
  });

  it("requires tournaments.manage", async () => {
    const { matchService, tool } = setup("journalist");
    expect((await tool[2]({ matchId: "m1", game: 5, links })).isError).toBe(true);
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
    const matchService = { upsertMatch: vi.fn().mockResolvedValue(match) };
    const tournamentService = {
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
    const registerTool = vi.fn();
    registerWriteTools(
      { registerTool } as never,
      {
        user: { id: "u1", email: "staff@test.com", role },
        matchService,
        tournamentService,
        teamService,
        manualTournamentService,
      } as never,
    );
    const registered = (name: string) => {
      const tool = registerTool.mock.calls.find((call) => call[0] === name);
      if (!tool) throw new Error(`${name} is not registered`);
      return tool;
    };
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
      },
    ) => {
      const result = await registered(name)[2](args);
      const text = result.content[0].text as string;
      return { result, text, body: result.isError ? null : JSON.parse(text) };
    };
    return { matchService, tournamentService, registered, call };
  }

  it("resolves team slugs to participant ids and returns them", async () => {
    const { matchService, call } = setup();
    const { body } = await call("create_match", {
      tournamentId: "cup",
      name: "Bo5",
      teams: ["karmine-corp", "gentle-mates"],
    });
    expect(matchService.upsertMatch).toHaveBeenCalledWith("cup", {
      name: "Bo5",
      beginAt: undefined,
      endAt: undefined,
      status: undefined,
      numberOfGames: undefined,
      participantIds: ["p-kc", "p-m8"],
      results: undefined,
    });
    expect(body.participants).toEqual([
      { id: "p-kc", team: { id: "team-kc", slug: "karmine-corp", name: "Karmine Corp" } },
      { id: "p-m8", team: { id: "team-m8", slug: "gentle-mates", name: "Gentle Mates" } },
    ]);
  });

  it("still accepts participant ids", async () => {
    const { matchService, call } = setup();
    await call("create_match", {
      tournamentId: "cup",
      name: "Bo5",
      participantIds: ["p-m8", "p-kc"],
    });
    expect(matchService.upsertMatch).toHaveBeenCalledWith(
      "cup",
      expect.objectContaining({ participantIds: ["p-m8", "p-kc"] }),
    );
  });

  it("reports a missing tournament", async () => {
    const { tournamentService, matchService, call } = setup();
    tournamentService.findById.mockResolvedValue(null);
    const { result, text } = await call("create_match", {
      tournamentId: "missing",
      name: "Bo5",
      participantIds: ["p-kc", "p-m8"],
    });
    expect(result.isError).toBe(true);
    expect(text).toContain('Tournament "missing" was not found');
    expect(matchService.upsertMatch).not.toHaveBeenCalled();
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
    expect(matchService.upsertMatch).not.toHaveBeenCalled();
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

  it("accepts teams without participantIds and requires tournaments.manage", async () => {
    const { registered, matchService, call } = setup("manual", "journalist");
    const schema = z.object(registered("create_match")[1].inputSchema);
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
    expect(matchService.upsertMatch).not.toHaveBeenCalled();
  });
});
