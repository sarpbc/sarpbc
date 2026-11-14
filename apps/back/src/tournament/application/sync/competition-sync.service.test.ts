import { beforeEach, describe, expect, it, vi } from "vitest";
import { present } from "../../../../test/doubles";
import { CompetitionAfterCommit } from "../after-commit";
import { CompetitionSyncService } from "./competition-sync.service";
import { League } from "../../domain/league";
import type { Match } from "../../domain/match";
import { Tournament } from "../../domain/tournament";
import { TournamentParticipant } from "../../domain/tournament-participant";
import { matchDecided } from "../../domain/match-decided";
import { TournamentEvent, toEventRef } from "../../domain/tournament-event";
import { Team } from "../../../roster/domain/team";
import type {
  CompetitionCache,
  CompetitionDiagnostics,
  CompetitionEvents,
  CompetitionTransaction,
  EventWriter,
  RosterIdentityWriter,
  TournamentWriter,
} from "../ports";
import type {
  CompetitionIncident,
  ProviderDeletion,
  UpsertSerieCommand,
  UpsertTournamentCommand,
} from "../feed";
import {
  competitionScope,
  matchWriter as matchWriterDouble,
  rosterIdentityWriter,
  tournamentWriter as tournamentWriterDouble,
} from "../../../../test/competition-doubles";
import type { MatchTiming } from "../../domain/tournament-end";

const copy = <T extends object>(type: new () => T, value: T): T => Object.assign(new type(), value);

const memoryStore = () => {
  const tournaments = new Map<string, Tournament>();
  const events = new Map<string, TournamentEvent>();
  const leagues = new Map<number, League>();
  const timings = new Map<string, MatchTiming[]>();
  const all = () => [...tournaments.values()];

  const tournamentWriter = {
    byPandascoreId: vi.fn<TournamentWriter["byPandascoreId"]>(async (id) => {
      const found = all().find((t) => t.pandascoreId === id);

      return found ? copy(Tournament, found) : null;
    }),
    leagueByPandascoreId: vi.fn<TournamentWriter["leagueByPandascoreId"]>(
      async (id) => leagues.get(id) ?? null,
    ),
    load: vi.fn<TournamentWriter["load"]>(async (id) => {
      const found = tournaments.get(id);

      return found ? copy(Tournament, found) : null;
    }),
    manualCandidates: vi.fn<TournamentWriter["manualCandidates"]>(async () => []),
    participants: vi.fn<TournamentWriter["participants"]>(async () => []),
    save: vi.fn<TournamentWriter["save"]>(async (tournament) => {
      tournaments.set(tournament.id, copy(Tournament, tournament));
    }),
    saveLeague: vi.fn<TournamentWriter["saveLeague"]>(async (league) => {
      if (league.pandascoreId !== null) {
        leagues.set(league.pandascoreId, copy(League, league));
      }
    }),
    saveParticipant: vi.fn<TournamentWriter["saveParticipant"]>(),
    setPlacements: vi.fn<TournamentWriter["setPlacements"]>(),
  };

  const eventWriter: EventWriter = {
    bySerieId: async (id) => {
      const found = [...events.values()].find((e) => e.pandascoreSerieId === id);

      return found ? copy(TournamentEvent, found) : null;
    },
    load: async (id) => {
      const found = events.get(id);

      return found ? copy(TournamentEvent, found) : null;
    },
    remove: async (id) => {
      events.delete(id);
    },
    save: async (event) => {
      events.set(event.id, copy(TournamentEvent, event));
    },
    slugTaken: async (slug, except) =>
      [...events.values()].some((e) => e.slug === slug && e.id !== except),
    stageSlugTaken: async (eventId, slug, except) =>
      all().some((t) => t.event.id === eventId && t.slug === slug && t.id !== except),
    stages: async (eventId) =>
      all()
        .filter((t) => t.event.id === eventId)
        .map(({ id, name, source }) => ({ id, name, source })),
    unclaimedByName: async () => null,
  };

  const seedEvent = (fields: Partial<TournamentEvent>) => {
    const event = Object.assign(new TournamentEvent(), fields);
    events.set(event.id, event);

    return event;
  };

  const seedStage = (event: TournamentEvent, fields: Partial<Tournament>) => {
    const stage = Object.assign(new Tournament(), { event: toEventRef(event), ...fields });
    tournaments.set(stage.id, stage);

    return stage;
  };

  const eventOf = (tournamentId: string) => {
    const tournament = tournaments.get(tournamentId);

    return tournament ? events.get(tournament.event.id) : undefined;
  };

  const matchWriter = {
    byPandascoreId: async () => null,
    participants: async (): Promise<TournamentParticipant[]> => [],
    save: async ({ tournament, status, beginAt, endAt }: Match) => {
      timings.set(tournament.id, [
        ...(timings.get(tournament.id) ?? []),
        { beginAt, endAt, status },
      ]);
    },
    timings: async (id: string) => timings.get(id) ?? [],
    tournament: async (id: string) => tournaments.get(id) ?? null,
  };

  return {
    eventOf,
    eventWriter,
    events,
    matchWriter,
    seedEvent,
    seedStage,
    timings,
    tournamentWriter,
    tournaments,
  };
};

const serieIncident = (
  change:
    | { changeType: "creation" | "update"; command: UpsertSerieCommand }
    | { changeType: "deletion"; deletion: ProviderDeletion },
): CompetitionIncident =>
  change.changeType === "deletion"
    ? { id: 100, kind: "serie", modifiedAt: new Date(), ...change }
    : { id: 100, kind: "serie", modifiedAt: new Date(), ...change };

const finished = (endAt: string): MatchTiming => ({
  beginAt: new Date(endAt),
  endAt: new Date(endAt),
  status: "finished",
});

const matchCommand = (pandascoreId: number, status: string) => ({
  beginAt: new Date("2030-01-01"),
  name: `Match ${pandascoreId}`,
  officialStreams: [],
  opponentPandascoreIds: [1, 2],
  opponentSlugs: [],
  pandascoreId,
  previousMatches: [],
  results: [
    { score: 3, teamPandascoreId: 1 },
    { score: 1, teamPandascoreId: 2 },
  ],
  status,
  tournamentPandascoreId: 1,
});

describe("Competition synchronization", () => {
  const rosters = {
    upsertPlayer: vi.fn<RosterIdentityWriter["upsertPlayer"]>(),
    upsertTeam: vi.fn<RosterIdentityWriter["upsertTeam"]>(),
  };

  const cache = { invalidateTournament: vi.fn<CompetitionCache["invalidateTournament"]>() };
  const published = { publish: vi.fn<CompetitionEvents["publish"]>() };

  const diagnostics = {
    error: vi.fn<CompetitionDiagnostics["error"]>(),
    warn: vi.fn<CompetitionDiagnostics["warn"]>(),
  };

  const log: string[] = [];
  let store: ReturnType<typeof memoryStore>;

  const seedManual = (id: string, name = "RLCS Major Paris 2026 Playoffs") =>
    store.seedStage(store.seedEvent({ id: `event-${id}`, name, slug: id }), {
      beginAt: new Date("2026-03-01T00:00Z"),
      endAt: new Date("2026-03-02T00:00Z"),
      id,
      name,
      pandascoreId: null,
      slug: `manual-${id}`,
      source: "manual",
    });

  const tx: CompetitionTransaction = {
    run: async (work) => {
      const result = await work(
        competitionScope({
          events: store.eventWriter,
          matches: matchWriterDouble(store.matchWriter),
          rosters: rosterIdentityWriter(rosters),
          tournaments: tournamentWriterDouble(store.tournamentWriter),
        }),
      );

      log.push("commit");

      return result;
    },
  };

  const service = new CompetitionSyncService(
    tx,
    new CompetitionAfterCommit(cache, published, diagnostics),
    diagnostics,
  );

  const rlcsMajor = { name: "RLCS Major", pandascoreId: 7, slug: "rlcs-major" };
  const parisSerie = { fullName: "Paris 2026", pandascoreId: 100, year: 2026 };

  const stageCommand = (fields: Partial<UpsertTournamentCommand>): UpsertTournamentCommand => ({
    league: rlcsMajor,
    name: "Playoffs",
    pandascoreId: 1,
    serie: parisSerie,
    ...fields,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    log.length = 0;
    store = memoryStore();
    rosters.upsertTeam.mockResolvedValue({ id: "team" });
    rosters.upsertPlayer.mockImplementation(async (p: { pandascoreId: number }) => ({
      id: String(p.pandascoreId),
    }));
    cache.invalidateTournament.mockImplementation(async (id: string) => {
      log.push(`invalidate ${id}`);
    });
  });

  it("rejects corrupt manual identities", async () => {
    store.seedStage(store.seedEvent({ name: "Cup", slug: "cup" }), {
      id: "manual",
      pandascoreId: 99,
      source: "manual",
    });
    await expect(service.upsertTournament({ name: "Provider", pandascoreId: 99 })).rejects.toThrow(
      /source=manual/u,
    );
    expect(store.tournamentWriter.save).not.toHaveBeenCalled();
  });

  it("creates the event of a new serie with a frozen slug and commits before invalidating", async () => {
    const created = await service.upsertTournament(stageCommand({}));
    expect(created).toMatchObject({ pandascoreId: 1, slug: "playoffs", source: "pandascore" });
    expect(store.eventOf(created.id)).toMatchObject({
      league: { name: "RLCS Major" },
      name: "RLCS Major Paris 2026",
      pandascoreSerieId: 100,
      slug: "rlcs-major-paris-2026",
    });
    expect(log).toStrictEqual(["commit", `invalidate ${created.id}`]);
  });

  it("files every stage of a serie under one event with distinct stage slugs", async () => {
    const first = await service.upsertTournament(stageCommand({ pandascoreId: 1 }));
    const second = await service.upsertTournament(stageCommand({ pandascoreId: 2 }));
    expect(second.event.id).toBe(first.event.id);
    expect([first.slug, second.slug]).toStrictEqual(["playoffs", "playoffs-2"]);
    expect(store.events.size).toBe(1);
  });

  it("keeps the event slug and stage slug when PandaScore renames them", async () => {
    const created = await service.upsertTournament(stageCommand({}));

    const sibling = await service.upsertTournament(
      stageCommand({ name: "Swiss", pandascoreId: 2 }),
    );

    log.length = 0;

    const renamed = await service.upsertTournament(
      stageCommand({
        name: "Grand Finals",
        serie: { ...parisSerie, fullName: "Paris Major 2026" },
      }),
    );

    expect(renamed.slug).toBe("playoffs");
    expect(store.eventOf(created.id)).toMatchObject({
      name: "RLCS Major Paris Major 2026",
      slug: "rlcs-major-paris-2026",
    });
    expect(log).toStrictEqual(["commit", `invalidate ${created.id}`, `invalidate ${sibling.id}`]);
  });

  it("keeps local artwork while updating feed-owned fields", async () => {
    const event = store.seedEvent({ name: "RLCS Major Paris 2026", slug: "rlcs-major-paris-2026" });
    store.seedStage(event, {
      id: "stage",
      imageUrl: "local-art",
      name: "Playoffs",
      pandascoreId: 1,
      slug: "playoffs",
    });
    await expect(
      service.upsertTournament(stageCommand({ name: "Group A" })),
    ).resolves.toMatchObject({
      imageUrl: "local-art",
      name: "Group A",
      slug: "playoffs",
    });
  });

  it("moves a stage to its serie event and deletes the event it leaves empty", async () => {
    const elsewhere = store.seedEvent({ name: "Old", pandascoreSerieId: 200, slug: "old" });
    store.seedStage(elsewhere, {
      id: "stage",
      name: "Playoffs",
      pandascoreId: 1,
      slug: "playoffs",
    });
    const target = await service.upsertTournament(stageCommand({ pandascoreId: 2 }));
    const moved = await service.upsertTournament(stageCommand({ pandascoreId: 1 }));
    expect(moved.event.id).toBe(target.event.id);
    expect(moved.slug).toBe("playoffs-2");
    expect(store.events.has(elsewhere.id)).toBe(false);
  });

  it("gives a stage without serie its own event named after league and stage", async () => {
    const created = await service.upsertTournament(
      stageCommand({ beginAt: new Date("2025-02-01"), name: "Winter Cup", serie: undefined }),
    );

    expect(store.eventOf(created.id)).toMatchObject({
      name: "RLCS Major Winter Cup",
      pandascoreSerieId: null,
      slug: "rlcs-major-winter-cup-2025",
    });
  });

  it("renames the event of a serie and invalidates its stages", async () => {
    const stage = await service.upsertTournament(stageCommand({}));
    log.length = 0;
    await service.applyIncident(
      serieIncident({
        changeType: "update",
        command: { fullName: "Major Paris 2026", pandascoreId: 100 },
      }),
    );
    expect(store.eventOf(stage.id)).toMatchObject({
      name: "RLCS Major Major Paris 2026",
      slug: "rlcs-major-paris-2026",
    });
    expect(log).toStrictEqual(["commit", `invalidate ${stage.id}`]);
  });

  it("ignores a serie update that has no event yet", async () => {
    await service.applyIncident(
      serieIncident({ changeType: "creation", command: { fullName: "Paris", pandascoreId: 100 } }),
    );
    expect(store.events.size).toBe(0);
    expect(cache.invalidateTournament).not.toHaveBeenCalled();
  });

  it("re-keys a merged serie event when the target serie has no event", async () => {
    const stage = await service.upsertTournament(stageCommand({}));
    await service.applyIncident(
      serieIncident({ changeType: "deletion", deletion: { intoId: 300, kind: "merged" } }),
    );
    expect(store.eventOf(stage.id)).toMatchObject({
      pandascoreSerieId: 300,
      slug: "rlcs-major-paris-2026",
    });
  });

  it("moves the stages of a merged serie into the existing target event", async () => {
    const target = await service.upsertTournament(
      stageCommand({ pandascoreId: 9, serie: { fullName: "Paris Major 2026", pandascoreId: 300 } }),
    );

    const merged = await service.upsertTournament(stageCommand({}));
    const oldEventId = merged.event.id;
    log.length = 0;
    await service.applyIncident(
      serieIncident({ changeType: "deletion", deletion: { intoId: 300, kind: "merged" } }),
    );
    expect(store.tournaments.get(merged.id)).toMatchObject({
      event: { id: target.event.id },
      slug: "playoffs-2",
    });
    expect(store.events.has(oldEventId)).toBe(false);
    expect(log).toStrictEqual(["commit", `invalidate ${merged.id}`]);
    await service.applyIncident(
      serieIncident({ changeType: "deletion", deletion: { intoId: 300, kind: "merged" } }),
    );
    expect(store.tournaments.get(merged.id)?.event.id).toBe(target.event.id);
  });

  it.each([{ byId: 300, entity: "serie", kind: "replaced" }, { kind: "deleted" }] as const)(
    "keeps an event on a $kind serie deletion",
    async (deletion) => {
      const stage = await service.upsertTournament(stageCommand({}));
      await service.applyIncident(serieIncident({ changeType: "deletion", deletion }));
      expect(store.eventOf(stage.id)?.pandascoreSerieId).toBe(100);
    },
  );

  const upsertPastCup = async () => {
    await service.upsertTournament({
      expectedRoster: [
        {
          players: [
            { name: "Player", pandascoreId: 1, slug: "player" },
            { name: "Sub", pandascoreId: 3, slug: "sub" },
          ],
          team: { name: "Past team", pandascoreId: 8, slug: "past-team" },
        },
      ],
      name: "Past Cup",
      pandascoreId: 42,
    });
  };

  describe("historical rosters", () => {
    it("registers the players without updating current membership", async () => {
      await upsertPastCup();

      expect(rosters.upsertPlayer).toHaveBeenCalledWith({
        name: "Player",
        pandascoreId: 1,
        slug: "player",
      });
      expect(rosters.upsertPlayer).toHaveBeenCalledWith({
        name: "Sub",
        pandascoreId: 3,
        slug: "sub",
      });
    });

    it("saves the participant with its players", async () => {
      await upsertPastCup();

      expect(store.tournamentWriter.saveParticipant).toHaveBeenCalledWith(
        expect.objectContaining({ playerIds: ["1", "3"], teamId: "team" }),
      );
    });

    it("updates the participant the tournament already has", async () => {
      store.tournamentWriter.participants.mockResolvedValue([
        Object.assign(new TournamentParticipant(), {
          id: "participant",
          team: Object.assign(new Team(), { id: "team" }),
        }),
      ]);

      await upsertPastCup();

      expect(store.tournamentWriter.saveParticipant).toHaveBeenCalledWith(
        expect.objectContaining({ id: "participant", playerIds: ["1", "3"], teamId: "team" }),
      );
    });
  });

  it("stores PandaScore final ranks as participant placements and clears missing ones", async () => {
    store.tournamentWriter.participants.mockResolvedValue([
      Object.assign(new TournamentParticipant(), {
        id: "dropped",
        team: Object.assign(new Team(), { id: "old", pandascoreId: 7 }),
      }),
      Object.assign(new TournamentParticipant(), { id: "unknown-team", team: null }),
    ]);
    await service.upsertTournament({
      expectedRoster: [{ players: [], team: { name: "Winner", pandascoreId: 8, slug: "winner" } }],
      name: "Playoffs",
      pandascoreId: 42,
      standings: [
        { rank: 1, teamPandascoreId: 8 },
        { rank: 2, teamPandascoreId: 99 },
      ],
    });

    const [placements] = store.tournamentWriter.setPlacements.mock.calls[0] ?? [];
    expect(placements?.get("dropped")).toBeNull();
    expect(placements?.has("unknown-team")).toBe(false);
    expect(
      [...(placements?.values() ?? [])].toSorted((a, b) => (a ?? Infinity) - (b ?? Infinity)),
    ).toStrictEqual([1, null]);
  });

  it("leaves placements untouched when the feed carries no standings", async () => {
    await service.upsertTournament({ name: "Playoffs", pandascoreId: 42 });
    expect(store.tournamentWriter.setPlacements).not.toHaveBeenCalled();
  });

  it("preserves success after a committed write when Redis fails", async () => {
    cache.invalidateTournament.mockRejectedValue(new Error("offline"));
    await expect(
      service.upsertTournament({ name: "Cup", pandascoreId: 42 }),
    ).resolves.toMatchObject({ name: "Cup" });
    expect(diagnostics.error).toHaveBeenCalledExactlyOnceWith(
      "Tournament cache invalidation failed",
      expect.any(Error),
    );
  });

  describe("end date", () => {
    it("closes a stage once every match is finished and PandaScore has no end date", async () => {
      const event = store.seedEvent({ name: "E", slug: "e" });
      store.seedStage(event, { id: "stage", name: "Playoffs", pandascoreId: 1, slug: "playoffs" });
      store.timings.set("stage", [finished("2025-03-01T10:00Z"), finished("2025-03-02T18:00Z")]);
      const upsertTournamentResult = await service.upsertTournament(stageCommand({}));
      expect(upsertTournamentResult.endAt).toStrictEqual(new Date("2025-03-02T18:00Z"));
    });

    it("keeps the stage open while a match remains", async () => {
      const event = store.seedEvent({ name: "E", slug: "e" });
      store.seedStage(event, { id: "stage", name: "Playoffs", pandascoreId: 1, slug: "playoffs" });
      store.timings.set("stage", [
        finished("2025-03-01T10:00Z"),
        { beginAt: new Date("2025-03-03T10:00Z"), endAt: null, status: "not_started" },
      ]);
      const upsertTournamentResult2 = await service.upsertTournament(stageCommand({}));
      expect(upsertTournamentResult2.endAt).toBeNull();
    });

    it("keeps the stage open when the sync adds a match to a finished stage", async () => {
      const event = store.seedEvent({ name: "E", slug: "e" });
      store.seedStage(event, { id: "stage", name: "Playoffs", pandascoreId: 1, slug: "playoffs" });
      store.timings.set("stage", [finished("2025-03-01T10:00Z")]);

      const synced = await service.upsertTournament(stageCommand({}), [
        {
          beginAt: new Date("2025-03-03T10:00Z"),
          name: "Tiebreaker",
          officialStreams: [],
          opponentSlugs: [],
          pandascoreId: 10,
          previousMatches: [],
          results: [],
          status: "not_started",
          tournamentPandascoreId: 1,
        },
      ]);

      expect(synced.endAt).toBeNull();
    });

    it("closes a finished stage from a tournament incident", async () => {
      const event = store.seedEvent({ name: "E", slug: "e" });
      store.seedStage(event, { id: "stage", name: "Playoffs", pandascoreId: 1, slug: "playoffs" });
      store.timings.set("stage", [finished("2025-03-02T18:00Z")]);
      await service.applyIncident({
        changeType: "update",
        command: stageCommand({}),
        id: 1,
        kind: "tournament",
        modifiedAt: new Date(),
      });
      expect(store.tournaments.get("stage")?.endAt).toStrictEqual(new Date("2025-03-02T18:00Z"));
    });

    it("keeps a staff-corrected end date over PandaScore", async () => {
      const event = store.seedEvent({ name: "E", slug: "e" });
      store.seedStage(event, {
        endAt: new Date("2025-03-05"),
        endAtCorrected: true,
        id: "stage",
        name: "Playoffs",
        pandascoreId: 1,
        slug: "playoffs",
      });

      const synced = await service.upsertTournament(
        stageCommand({ endAt: new Date("2025-04-01") }),
      );

      expect(synced.endAt).toStrictEqual(new Date("2025-03-05"));
    });
  });

  describe("manual counterparts", () => {
    const beginAt = new Date("2026-03-01T12:00Z");

    it("links the manual tournament staff chose even when names differ", async () => {
      seedManual("manual", "MENA qualifier");
      const linked = await service.upsertTournament(stageCommand({ beginAt }), [], "manual");
      expect(linked).toMatchObject({ id: "manual", pandascoreId: 1, source: "pandascore" });
    });

    it("refuses a link when PandaScore already has its own stage", async () => {
      await service.upsertTournament(stageCommand({}));
      seedManual("manual", "MENA qualifier");
      await expect(
        service.upsertTournament(stageCommand({ beginAt }), [], "manual"),
      ).rejects.toThrow("already imported");
    });
  });

  describe("MatchDecided", () => {
    const teams = [1, 2].map((pandascoreId) =>
      Object.assign(new TournamentParticipant(), {
        id: `participant-${pandascoreId}`,
        team: Object.assign(new Team(), { id: `team-${pandascoreId}`, pandascoreId }),
      }),
    );

    const saved: Match[] = [];
    beforeEach(() => {
      saved.length = 0;
      store.tournamentWriter.participants.mockResolvedValue(teams);
      store.matchWriter.participants = async () => teams;
      const { save } = store.matchWriter;
      store.matchWriter.save = async (match: Match) => {
        saved.push(match);
        await save(match);
      };
    });

    it("publishes MatchDecided for decided matches only", async () => {
      await service.upsertTournament(stageCommand({}), [
        matchCommand(10, "finished"),
        matchCommand(11, "running"),
      ]);
      const decided = saved.find((match) => match.pandascoreId === 10);
      expect(published.publish).toHaveBeenCalledExactlyOnceWith(matchDecided(present(decided).id));
    });

    it("keeps the write when publication fails", async () => {
      published.publish.mockRejectedValue(new Error("listener"));
      await expect(
        service.upsertTournament(stageCommand({}), [matchCommand(10, "finished")]),
      ).resolves.toMatchObject({ name: "Playoffs" });
      expect(diagnostics.error).toHaveBeenCalledWith(
        "MatchDecided publication failed",
        expect.any(Error),
      );
    });
  });
});
