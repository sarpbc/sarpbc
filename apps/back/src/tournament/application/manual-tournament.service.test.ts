import { beforeEach, describe, expect, it, vi } from "vitest";
import { present } from "../../../test/doubles";
import { ConflictError } from "../../common/domain/errors/conflict-error";
import { InvalidInputError } from "../../common/domain/errors/invalid-input-error";
import { NotFoundError } from "../../common/domain/errors/not-found-error";
import { Tournament } from "../domain/tournament";
import { TournamentParticipant } from "../domain/tournament-participant";
import { TournamentEvent } from "../domain/tournament-event";
import type { ContractRole } from "@sarpbc/types";
import { Player } from "../../roster/domain/player";
import { Team } from "../../roster/domain/team";
import { CompetitionAfterCommit } from "./after-commit";
import { ManualTournamentService } from "./manual-tournament.service";
import type { UpdateTournamentInput } from "./inputs";
import type {
  CompetitionCache,
  CompetitionDiagnostics,
  CompetitionEvents,
  CompetitionTransaction,
  EventWriter,
  MatchWriter,
  TournamentQueries,
  TournamentWriter,
} from "./ports";
import {
  competitionScope,
  eventWriter as eventWriterDouble,
  matchWriter as matchWriterDouble,
  tournamentQueries,
  tournamentWriter as tournamentWriterDouble,
} from "../../../test/competition-doubles";

const member = (id: string, contractRole: ContractRole | null, role: string | null = null) =>
  Object.assign(new Player(), {
    contractRole,
    id,
    role,
    team: Object.assign(new Team(), { id: "vitality" }),
  });

const solo = (id: string, playerId: string) =>
  Object.assign(new TournamentParticipant(), {
    id,
    players: [Object.assign(new Player(), { id: playerId })],
    team: null,
  });

describe(ManualTournamentService, () => {
  const writer = {
    league: vi.fn<TournamentWriter["league"]>(),
    load: vi.fn<TournamentWriter["load"]>(),
    participantReferences: vi.fn<TournamentWriter["participantReferences"]>(),
    participants: vi.fn<TournamentWriter["participants"]>(),
    playersExist: vi.fn<TournamentWriter["playersExist"]>(),
    removeParticipant: vi.fn<TournamentWriter["removeParticipant"]>(),
    save: vi.fn<TournamentWriter["save"]>(),
    saveParticipant: vi.fn<TournamentWriter["saveParticipant"]>(),
    teamPlayers: vi.fn<TournamentWriter["teamPlayers"]>(),
    teamsExist: vi.fn<TournamentWriter["teamsExist"]>(),
  };

  let tournament: Tournament;

  const stored = new Map<string, TournamentEvent>();

  const eventWriter = {
    load: vi.fn<EventWriter["load"]>(async (id) => {
      const event = stored.get(id);

      return event ? Object.assign(new TournamentEvent(), event) : null;
    }),
    save: vi.fn<EventWriter["save"]>(async (event) => {
      stored.set(event.id, Object.assign(new TournamentEvent(), event));
    }),
    slugTaken: vi.fn<EventWriter["slugTaken"]>(async (slug, except) =>
      [...stored.values()].some((event) => event.slug === slug && event.id !== except),
    ),
    stageSlugTaken: vi.fn<EventWriter["stageSlugTaken"]>(async () => false),
    stages: vi.fn<EventWriter["stages"]>(async (eventId) =>
      tournament.event.id === eventId
        ? [{ id: tournament.id, name: tournament.name, source: tournament.source }]
        : [],
    ),
  };

  const matchWriter = { bracket: vi.fn<MatchWriter["bracket"]>() };

  const cache = { invalidateTournament: vi.fn<CompetitionCache["invalidateTournament"]>() };

  const diagnostics = {
    error: vi.fn<CompetitionDiagnostics["error"]>(),
    warn: vi.fn<CompetitionDiagnostics["warn"]>(),
  };

  const reads = {
    findById: vi.fn<TournamentQueries["findById"]>(),
    leagues: vi.fn<TournamentQueries["leagues"]>(),
  };

  const events: string[] = [];

  const tx: CompetitionTransaction = {
    run: async (work) => {
      const result = await work(
        competitionScope({
          events: eventWriterDouble(eventWriter),
          matches: matchWriterDouble(matchWriter),
          tournaments: tournamentWriterDouble(writer),
        }),
      );

      events.push("commit");

      return result;
    },
  };

  const service = new ManualTournamentService(
    tournamentQueries(reads),
    tx,
    new CompetitionAfterCommit(
      cache,
      { publish: vi.fn<CompetitionEvents["publish"]>() },
      diagnostics,
    ),
  );

  beforeEach(() => {
    vi.clearAllMocks();
    events.length = 0;
    stored.clear();

    const event = Object.assign(new TournamentEvent(), {
      id: "event",
      name: "EWC",
      slug: "ewc-2026",
    });

    stored.set(event.id, event);
    tournament = Object.assign(new Tournament(), {
      event: { id: "event", name: "EWC", slug: "ewc-2026" },
      id: "ewc",
      imageUrl: "https://cdn.example/old.png",
      name: "Group A",
      pandascoreId: 123,
      slug: "group-a",
      source: "pandascore",
    });
    writer.load.mockImplementation(async () => tournament);
    reads.findById.mockImplementation(async () => tournament);
    writer.save.mockResolvedValue(undefined);
    cache.invalidateTournament.mockImplementation(async () => {
      events.push("invalidate");
    });
    writer.participants.mockResolvedValue([]);
    writer.teamsExist.mockResolvedValue(true);
    writer.playersExist.mockResolvedValue(true);
    writer.teamPlayers.mockResolvedValue([]);
    matchWriter.bracket.mockResolvedValue({ hasBracket: false, matches: [] });
  });

  it("snapshots the active players of a team joining a manual tournament", async () => {
    tournament.source = "manual";
    writer.teamPlayers.mockResolvedValue([
      member("diaz", "active"),
      member("legacy", null),
      member("sub", "benched"),
      member("coach", "coach"),
      member("ps-coach", null, "Coach"),
    ]);
    await service.update("ewc", { teamIds: ["vitality"] });
    expect(writer.teamPlayers).toHaveBeenCalledWith("vitality");
    expect(writer.saveParticipant).toHaveBeenCalledWith(
      expect.objectContaining({ playerIds: ["diaz", "legacy"], teamId: "vitality" }),
    );
  });

  it("keeps the roster of a team that is already participating", async () => {
    tournament.source = "manual";
    const team = Object.assign(new Team(), { id: "vitality" });
    writer.participants.mockResolvedValue([
      Object.assign(new TournamentParticipant(), { id: "p", team }),
    ]);
    await service.update("ewc", { teamIds: ["vitality"] });
    expect(writer.teamPlayers).not.toHaveBeenCalled();
    expect(writer.saveParticipant).not.toHaveBeenCalled();
  });

  it("replaces the roster of listed participants only", async () => {
    tournament.source = "manual";
    const team = Object.assign(new Team(), { id: "ikkaku" });
    writer.participants.mockResolvedValue([
      Object.assign(new TournamentParticipant(), { id: "p", team }),
    ]);
    await service.update("ewc", {
      rosters: [{ playerIds: ["exotiik", "rezears", "yujin"], teamId: "ikkaku" }],
    });
    expect(writer.playersExist).toHaveBeenCalledWith(["exotiik", "rezears", "yujin"]);
    expect(writer.saveParticipant).toHaveBeenCalledExactlyOnceWith({
      id: "p",
      playerIds: ["exotiik", "rezears", "yujin"],
      rosterSourceUrl: null,
      teamId: "ikkaku",
      tournamentId: "ewc",
    });
  });

  it("sets, keeps and refuses a roster source", async () => {
    tournament.source = "manual";
    const team = Object.assign(new Team(), { id: "ikkaku" });
    const rules = "https://esportsworldcup.com/en/rules";
    writer.participants.mockResolvedValue([
      Object.assign(new TournamentParticipant(), { id: "p", rosterSourceUrl: rules, team }),
    ]);
    await service.update("ewc", { rosters: [{ playerIds: ["yujin"], teamId: "ikkaku" }] });
    expect(writer.saveParticipant).toHaveBeenLastCalledWith(
      expect.objectContaining({ rosterSourceUrl: rules }),
    );
    await service.update("ewc", {
      rosters: [{ playerIds: ["yujin"], sourceUrl: null, teamId: "ikkaku" }],
    });
    expect(writer.saveParticipant).toHaveBeenLastCalledWith(
      expect.objectContaining({ rosterSourceUrl: null }),
    );
    await expect(
      service.update("ewc", {
        rosters: [{ playerIds: ["yujin"], sourceUrl: "https://blast.tv/rl", teamId: "ikkaku" }],
      }),
    ).rejects.toThrow(/BLAST/u);
  });

  it("rejects a roster for a team that is not participating", async () => {
    tournament.source = "manual";
    await expect(
      service.update("ewc", { rosters: [{ playerIds: [], teamId: "ikkaku" }] }),
    ).rejects.toBeInstanceOf(InvalidInputError);
    expect(writer.save).not.toHaveBeenCalled();
  });

  it("rejects a roster with unknown players", async () => {
    tournament.source = "manual";
    writer.playersExist.mockResolvedValue(false);
    await expect(
      service.update("ewc", { rosters: [{ playerIds: ["ghost"], teamId: "ikkaku" }] }),
    ).rejects.toBeInstanceOf(InvalidInputError);
    expect(writer.saveParticipant).not.toHaveBeenCalled();
  });

  it("edits artwork and invalidates only after commit", async () => {
    const result = await service.update("ewc", { imageUrl: " https://cdn.example/ewc.png " });
    expect(result).toMatchObject({
      imageUrl: "https://cdn.example/ewc.png",
      name: "Group A",
      pandascoreId: 123,
      source: "pandascore",
    });
    expect(events).toStrictEqual(["commit", "invalidate"]);
    expect(writer.league).not.toHaveBeenCalled();
  });

  it.each([null, ""])("clears synced artwork with %p", async (imageUrl) => {
    const updateResult = await service.update("ewc", { imageUrl });
    expect(updateResult.imageUrl).toBeNull();
  });

  it.each<UpdateTournamentInput>([
    { name: "Changed" },
    { slug: "changed" },
    { tier: null },
    { leagueId: null },
    { beginAt: null },
    { teamIds: [] },
    { rosters: [] },
    { eventId: "cdf" },
  ])("rejects PandaScore-owned fields %p", async (patch) => {
    await expect(service.update("ewc", { ...patch, imageUrl: null })).rejects.toBeInstanceOf(
      InvalidInputError,
    );
    expect(writer.save).not.toHaveBeenCalled();
    expect(cache.invalidateTournament).not.toHaveBeenCalled();
  });

  it("marks a synced end date as corrected until staff clear it", async () => {
    const corrected = await service.update("ewc", { endAt: "2025-03-02T20:00:00Z" });
    expect(corrected).toMatchObject({
      endAt: new Date("2025-03-02T20:00:00Z"),
      endAtCorrected: true,
    });
    const cleared = await service.update("ewc", { endAt: null });
    expect(cleared).toMatchObject({ endAt: null, endAtCorrected: false });
  });

  it("rejects an empty synced patch", async () => {
    await expect(service.update("ewc", {})).rejects.toBeInstanceOf(InvalidInputError);
  });

  it("refuses to change the bracket of a PandaScore stage", async () => {
    await expect(service.update("ewc", { hasBracket: true })).rejects.toThrow(/PandaScore/u);
    await expect(service.update("ewc", { hasBracket: false, imageUrl: null })).rejects.toThrow(
      /PandaScore/u,
    );
    expect(writer.save).not.toHaveBeenCalled();
  });

  it("enables the bracket of a manual stage", async () => {
    tournament.source = "manual";
    await expect(service.update("ewc", { hasBracket: true })).resolves.toMatchObject({
      hasBracket: true,
    });
  });

  it("keeps the bracket of a manual stage while its matches are linked", async () => {
    tournament.source = "manual";
    tournament.hasBracket = true;
    matchWriter.bracket.mockResolvedValue({
      hasBracket: true,
      matches: [{ id: "final", previousMatches: [{ previousMatchId: "semi", type: "winner" }] }],
    });
    await expect(service.update("ewc", { hasBracket: false })).rejects.toThrow(/bracket links/u);
    matchWriter.bracket.mockResolvedValue({
      hasBracket: true,
      matches: [{ id: "final", previousMatches: [] }],
    });
    await expect(service.update("ewc", { hasBracket: false })).resolves.toMatchObject({
      hasBracket: false,
    });
  });

  const ownEvent = () => {
    tournament.source = "manual";
    present(stored.get("event")).name = tournament.name;
  };

  it("allows manual details and artwork together and renames the event", async () => {
    ownEvent();
    await expect(
      service.update("ewc", { imageUrl: null, name: "Community Cup" }),
    ).resolves.toMatchObject({
      event: { name: "Community Cup", slug: "ewc-2026" },
      imageUrl: null,
      name: "Community Cup",
      slug: "group-a",
    });
  });

  it("creates a single-stage event with a generated, deduplicated slug", async () => {
    stored.set(
      "taken",
      Object.assign(new TournamentEvent(), { id: "taken", slug: "community-cup" }),
    );
    writer.save.mockImplementation(async (saved: Tournament) => {
      tournament = saved;
    });
    const created = await service.create({ name: "Community Cup" });
    expect(created).toMatchObject({
      event: { name: "Community Cup", slug: "community-cup-2" },
      slug: "community-cup",
      source: "manual",
    });
    expect(stored.get(created.event.id)).toMatchObject({ slug: "community-cup-2" });
  });

  it("uses an explicit staff slug for the event and rejects one that is taken", async () => {
    writer.save.mockImplementation(async (saved: Tournament) => {
      tournament = saved;
    });
    await expect(service.create({ name: "Cup", slug: "My Cup" })).resolves.toMatchObject({
      event: { slug: "my-cup" },
    });
    await expect(service.create({ name: "Other", slug: "ewc-2026" })).rejects.toBeInstanceOf(
      ConflictError,
    );
  });

  it("edits the event slug of a manual tournament", async () => {
    ownEvent();
    stored.set("other", Object.assign(new TournamentEvent(), { id: "other", slug: "taken" }));
    await expect(service.update("ewc", { slug: "ewc-renamed" })).resolves.toMatchObject({
      event: { slug: "ewc-renamed" },
    });
    await expect(service.update("ewc", { slug: "ewc-renamed" })).resolves.toMatchObject({
      event: { slug: "ewc-renamed" },
    });
    await expect(service.update("ewc", { slug: "taken" })).rejects.toBeInstanceOf(ConflictError);
  });

  it.each(["???", "0b6f2d3e-6c1a-4b8e-9a51-2f7c3d4e5a6b"])(
    "rejects the unusable event slug %p",
    async (slug) => {
      ownEvent();
      await expect(service.update("ewc", { slug })).rejects.toBeInstanceOf(InvalidInputError);
    },
  );

  it("leaves a shared event alone when one of its stages changes", async () => {
    tournament.source = "manual";
    await expect(
      service.update("ewc", { name: "Finals", slug: "ewc-2026" }),
    ).resolves.toMatchObject({
      event: { name: "EWC", slug: "ewc-2026" },
      name: "Finals",
    });
    await expect(service.update("ewc", { slug: "finals" })).rejects.toBeInstanceOf(
      InvalidInputError,
    );
    expect(stored.get("event")).toMatchObject({ name: "EWC", slug: "ewc-2026" });
  });

  it("moves a manual tournament into another event under a slug free there", async () => {
    tournament.source = "manual";
    stored.set(
      "cdf",
      Object.assign(new TournamentEvent(), { id: "cdf", name: "CDF", slug: "cdf-2026" }),
    );
    eventWriter.stageSlugTaken.mockImplementationOnce(
      async (_event: string, slug: string) => slug === "group-a",
    );
    await expect(service.update("ewc", { eventId: "cdf" })).resolves.toMatchObject({
      event: { id: "cdf", name: "CDF", slug: "cdf-2026" },
      slug: "group-a-2",
    });
    expect(stored.get("event")).toMatchObject({ name: "EWC", slug: "ewc-2026" });
    await expect(service.update("ewc", { eventId: "event", slug: "x" })).rejects.toBeInstanceOf(
      InvalidInputError,
    );
    await expect(service.update("ewc", { eventId: "missing" })).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it("creates a tournament as a stage of an existing event", async () => {
    writer.save.mockImplementation(async (saved: Tournament) => {
      tournament = saved;
    });
    await expect(service.create({ eventId: "event", name: "Finals" })).resolves.toMatchObject({
      event: { id: "event", name: "EWC", slug: "ewc-2026" },
      slug: "finals",
    });
    expect([...stored.keys()]).toStrictEqual(["event"]);
    await expect(
      service.create({ eventId: "event", name: "Finals", slug: "finals" }),
    ).rejects.toBeInstanceOf(InvalidInputError);
  });

  it("preserves committed success when optional invalidation fails", async () => {
    cache.invalidateTournament.mockRejectedValue(new Error("Redis down"));
    const updateResult2 = await service.update("ewc", { imageUrl: null });
    expect(updateResult2.imageUrl).toBeNull();
    expect(diagnostics.error).toHaveBeenCalledExactlyOnceWith(
      "Tournament cache invalidation failed",
      new Error("Redis down"),
    );
  });

  it.each(["tournamentWinner", "matchParticipant", "matchWinner", "results"])(
    "protects referenced participant %s",
    async (reference) => {
      tournament.source = "manual";
      const team = Object.assign(new Team(), { id: "old" });
      writer.participants.mockResolvedValue([
        Object.assign(new TournamentParticipant(), { id: "p", team }),
      ]);

      const unreferenced = {
        matchParticipant: false,
        matchWinner: false,
        results: false,
        tournamentWinner: false,
      };

      writer.participantReferences.mockResolvedValue({ ...unreferenced, [reference]: true });

      await expect(service.update("ewc", { teamIds: [] })).rejects.toBeInstanceOf(
        InvalidInputError,
      );
      expect(writer.removeParticipant).not.toHaveBeenCalled();
    },
  );

  it("rejects reversed dates", async () => {
    tournament.source = "manual";
    await expect(
      service.update("ewc", { beginAt: "2026-10-20", endAt: "2026-10-19" }),
    ).rejects.toBeInstanceOf(InvalidInputError);
  });

  it.each([
    { endAt: "2026-11-16", expected: "2026-11-16T22:59:59.999Z" },
    { endAt: "2026-07-14", expected: "2026-07-14T21:59:59.999Z" },
    { endAt: "2026-11-16T20:30:00+01:00", expected: "2026-11-16T19:30:00.000Z" },
  ])("ends a stage dated $endAt at $expected", async ({ endAt, expected }) => {
    tournament.source = "manual";
    const updated = await service.update("ewc", { endAt });
    expect(updated.endAt?.toISOString()).toBe(expected);
  });

  describe("player participants", () => {
    beforeEach(() => {
      writer.save.mockImplementation(async (saved: Tournament) => {
        tournament = saved;
      });
    });

    it("creates a 1v1 tournament whose participants are existing players, without a team", async () => {
      const created = await service.create({
        format: "1v1",
        name: "Fake Knockout",
        playerParticipants: [["zen"], ["vatira"]],
      });

      expect(created.format).toBe("1v1");
      expect(writer.playersExist).toHaveBeenCalledWith(["zen", "vatira"]);
      expect(writer.teamsExist).not.toHaveBeenCalled();
      expect(writer.teamPlayers).not.toHaveBeenCalled();
      expect(writer.saveParticipant.mock.calls.map(([participant]) => participant)).toStrictEqual([
        expect.objectContaining({ playerIds: ["zen"], teamId: null }),
        expect.objectContaining({ playerIds: ["vatira"], teamId: null }),
      ]);
    });

    it("creates a 2v2 tournament with a free duo and an official team", async () => {
      await service.create({
        format: "2v2",
        name: "Fake Duo Cup",
        playerParticipants: [["zen", "vatira"]],
        teamIds: ["vitality"],
      });
      expect(writer.saveParticipant).toHaveBeenCalledWith(
        expect.objectContaining({ teamId: "vitality" }),
      );
      expect(writer.saveParticipant).toHaveBeenCalledWith(
        expect.objectContaining({ playerIds: ["zen", "vatira"], teamId: null }),
      );
    });

    it("defaults to a 3v3 team tournament", async () => {
      const createResult = await service.create({ name: "Team Cup" });
      expect(createResult.format).toBe("3v3");
      await expect(
        service.create({ name: "Team Cup", playerParticipants: [["zen"]] }),
      ).rejects.toBeInstanceOf(InvalidInputError);
    });

    it("rejects a team in a 1v1 tournament and an unknown player", async () => {
      await expect(
        service.create({ format: "1v1", name: "Knockout", teamIds: ["vitality"] }),
      ).rejects.toBeInstanceOf(InvalidInputError);
      writer.playersExist.mockResolvedValue(false);
      await expect(
        service.create({ format: "1v1", name: "Knockout", playerParticipants: [["ghost"]] }),
      ).rejects.toBeInstanceOf(InvalidInputError);
      expect(writer.saveParticipant).not.toHaveBeenCalled();
    });

    it("replaces the players of a 1v1 tournament and keeps those still listed", async () => {
      tournament = Object.assign(tournament, { format: "1v1", source: "manual" });
      ownEvent();
      writer.participants.mockResolvedValue([solo("p-zen", "zen"), solo("p-atow", "atow")]);
      writer.participantReferences.mockResolvedValue({
        matchParticipant: false,
        matchWinner: false,
        results: false,
        tournamentWinner: false,
      });
      await service.update("ewc", { playerParticipants: [["zen"], ["vatira"]] });
      expect(writer.removeParticipant).toHaveBeenCalledWith("p-atow");
      expect(writer.saveParticipant).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({ playerIds: ["vatira"], teamId: null }),
      );
    });

    it("refuses a format change the current participants do not fit", async () => {
      tournament = Object.assign(tournament, { format: "1v1", source: "manual" });
      ownEvent();
      writer.participants.mockResolvedValue([solo("p-zen", "zen")]);
      await expect(service.update("ewc", { format: "3v3" })).rejects.toBeInstanceOf(
        InvalidInputError,
      );
      await expect(service.update("ewc", { format: "2v2" })).rejects.toBeInstanceOf(
        InvalidInputError,
      );
    });

    it("refuses to change the format of a PandaScore tournament", async () => {
      await expect(service.update("ewc", { format: "1v1" })).rejects.toBeInstanceOf(
        InvalidInputError,
      );
    });
  });
});
