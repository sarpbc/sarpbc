import { beforeEach, describe, expect, it, vi } from "vitest";
import { CompetitionAfterCommit } from "../after-commit";
import { CompetitionSyncService } from "./competition-sync.service";
import { League, Match, Tournament, TournamentParticipant } from "../../domain/competition";
import { matchDecided } from "../../domain/match-decided";
import { TournamentEvent, toEventRef } from "../../domain/tournament-event";
import { Team } from "../../../roster/domain/roster";
import type { CompetitionTransaction, EventWriter, TournamentWriter } from "../ports";
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

function memoryStore() {
  const tournaments = new Map<string, Tournament>();
  const events = new Map<string, TournamentEvent>();
  const leagues = new Map<number, League>();
  const timings = new Map<string, MatchTiming[]>();
  const all = () => [...tournaments.values()];

  const tournamentWriter = {
    byPandascoreId: vi.fn(async (id: number) => {
      const found = all().find((t) => t.pandascoreId === id);

      return found ? copy(Tournament, found) : null;
    }),
    load: vi.fn(async (id: string) => {
      const found = tournaments.get(id);

      return found ? copy(Tournament, found) : null;
    }),
    manualCandidates: vi.fn(async () => []),
    save: vi.fn(async (tournament: Tournament) => {
      tournaments.set(tournament.id, copy(Tournament, tournament));
    }),
    participants: vi.fn(async (): Promise<TournamentParticipant[]> => []),
    saveParticipant: vi.fn<TournamentWriter["saveParticipant"]>(),
    setPlacements: vi.fn<TournamentWriter["setPlacements"]>(),
    leagueByPandascoreId: vi.fn(async (id: number) => leagues.get(id) ?? null),
    saveLeague: vi.fn(async (league: League) => {
      if (league.pandascoreId !== null) leagues.set(league.pandascoreId, copy(League, league));
    }),
  };

  const eventWriter: EventWriter = {
    load: async (id) => {
      const found = events.get(id);

      return found ? copy(TournamentEvent, found) : null;
    },
    bySerieId: async (id) => {
      const found = [...events.values()].find((e) => e.pandascoreSerieId === id);

      return found ? copy(TournamentEvent, found) : null;
    },
    unclaimedByName: async () => null,
    slugTaken: async (slug, except) =>
      [...events.values()].some((e) => e.slug === slug && e.id !== except),
    stageSlugTaken: async (eventId, slug, except) =>
      all().some((t) => t.event.id === eventId && t.slug === slug && t.id !== except),
    stages: async (eventId) =>
      all()
        .filter((t) => t.event.id === eventId)
        .map(({ id, name, source }) => ({ id, name, source })),
    save: async (event) => {
      events.set(event.id, copy(TournamentEvent, event));
    },
    remove: async (id) => {
      events.delete(id);
    },
  };

  function seedEvent(fields: Partial<TournamentEvent>) {
    const event = Object.assign(new TournamentEvent(), fields);
    events.set(event.id, event);

    return event;
  }

  function seedStage(event: TournamentEvent, fields: Partial<Tournament>) {
    const stage = Object.assign(new Tournament(), { event: toEventRef(event), ...fields });
    tournaments.set(stage.id, stage);

    return stage;
  }

  const eventOf = (tournamentId: string) => {
    const tournament = tournaments.get(tournamentId);

    return tournament ? events.get(tournament.event.id) : undefined;
  };

  const matchWriter = {
    timings: async (id: string) => timings.get(id) ?? [],
    tournament: async (id: string) => tournaments.get(id) ?? null,
    participants: async (): Promise<TournamentParticipant[]> => [],
    byPandascoreId: async () => null,
    save: async ({ tournament, status, beginAt, endAt }: Match) => {
      timings.set(tournament.id, [
        ...(timings.get(tournament.id) ?? []),
        { status, beginAt, endAt },
      ]);
    },
  };

  return {
    tournaments,
    events,
    timings,
    matchWriter,
    tournamentWriter,
    eventWriter,
    seedEvent,
    seedStage,
    eventOf,
  };
}

describe("Competition synchronization", () => {
  const rosters = { upsertTeam: vi.fn(), upsertPlayer: vi.fn() };

  const cache = { invalidateTournament: vi.fn() };
  const published = { publish: vi.fn() };
  const diagnostics = { error: vi.fn(), warn: vi.fn() };

  const log: string[] = [];
  let store: ReturnType<typeof memoryStore>;

  const tx: CompetitionTransaction = {
    run: async (work) => {
      const result = await work(
        competitionScope({
          tournaments: tournamentWriterDouble(store.tournamentWriter),
          events: store.eventWriter,
          matches: matchWriterDouble(store.matchWriter),
          rosters: rosterIdentityWriter(rosters),
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

  const rlcsMajor = { pandascoreId: 7, name: "RLCS Major", slug: "rlcs-major" };
  const parisSerie = { pandascoreId: 100, fullName: "Paris 2026", year: 2026 };

  const stageCommand = (fields: Partial<UpsertTournamentCommand>): UpsertTournamentCommand => ({
    pandascoreId: 1,
    name: "Playoffs",
    league: rlcsMajor,
    serie: parisSerie,
    ...fields,
  });

  const serieIncident = (
    change:
      | { changeType: "creation" | "update"; command: UpsertSerieCommand }
      | { changeType: "deletion"; deletion: ProviderDeletion },
  ): CompetitionIncident =>
    change.changeType === "deletion"
      ? { id: 100, modifiedAt: new Date(), kind: "serie", ...change }
      : { id: 100, modifiedAt: new Date(), kind: "serie", ...change };

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
    store.seedStage(store.seedEvent({ slug: "cup", name: "Cup" }), {
      id: "manual",
      source: "manual",
      pandascoreId: 99,
    });
    await expect(service.upsertTournament({ pandascoreId: 99, name: "Provider" })).rejects.toThrow(
      /source=manual/,
    );
    expect(store.tournamentWriter.save).not.toHaveBeenCalled();
  });

  it("creates the event of a new serie with a frozen slug and commits before invalidating", async () => {
    const created = await service.upsertTournament(stageCommand({}));
    expect(created).toMatchObject({ source: "pandascore", pandascoreId: 1, slug: "playoffs" });
    expect(store.eventOf(created.id)).toMatchObject({
      pandascoreSerieId: 100,
      slug: "rlcs-major-paris-2026",
      name: "RLCS Major Paris 2026",
      league: { name: "RLCS Major" },
    });
    expect(log).toEqual(["commit", `invalidate ${created.id}`]);
  });

  it("files every stage of a serie under one event with distinct stage slugs", async () => {
    const first = await service.upsertTournament(stageCommand({ pandascoreId: 1 }));
    const second = await service.upsertTournament(stageCommand({ pandascoreId: 2 }));
    expect(second.event.id).toBe(first.event.id);
    expect([first.slug, second.slug]).toEqual(["playoffs", "playoffs-2"]);
    expect(store.events.size).toBe(1);
  });

  it("keeps the event slug and stage slug when PandaScore renames them", async () => {
    const created = await service.upsertTournament(stageCommand({}));

    const sibling = await service.upsertTournament(
      stageCommand({ pandascoreId: 2, name: "Swiss" }),
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
      slug: "rlcs-major-paris-2026",
      name: "RLCS Major Paris Major 2026",
    });
    expect(log).toEqual(["commit", `invalidate ${created.id}`, `invalidate ${sibling.id}`]);
  });

  it("keeps local artwork while updating feed-owned fields", async () => {
    const event = store.seedEvent({ slug: "rlcs-major-paris-2026", name: "RLCS Major Paris 2026" });
    store.seedStage(event, {
      id: "stage",
      pandascoreId: 1,
      name: "Playoffs",
      slug: "playoffs",
      imageUrl: "local-art",
    });
    expect(await service.upsertTournament(stageCommand({ name: "Group A" }))).toMatchObject({
      name: "Group A",
      slug: "playoffs",
      imageUrl: "local-art",
    });
  });

  it("moves a stage to its serie event and deletes the event it leaves empty", async () => {
    const elsewhere = store.seedEvent({ pandascoreSerieId: 200, slug: "old", name: "Old" });
    store.seedStage(elsewhere, {
      id: "stage",
      pandascoreId: 1,
      name: "Playoffs",
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
      stageCommand({ serie: undefined, name: "Winter Cup", beginAt: new Date("2025-02-01") }),
    );

    expect(store.eventOf(created.id)).toMatchObject({
      pandascoreSerieId: null,
      slug: "rlcs-major-winter-cup-2025",
      name: "RLCS Major Winter Cup",
    });
  });

  it("renames the event of a serie and invalidates its stages", async () => {
    const stage = await service.upsertTournament(stageCommand({}));
    log.length = 0;
    await service.applyIncident(
      serieIncident({
        changeType: "update",
        command: { pandascoreId: 100, fullName: "Major Paris 2026" },
      }),
    );
    expect(store.eventOf(stage.id)).toMatchObject({
      slug: "rlcs-major-paris-2026",
      name: "RLCS Major Major Paris 2026",
    });
    expect(log).toEqual(["commit", `invalidate ${stage.id}`]);
  });

  it("ignores a serie update that has no event yet", async () => {
    await service.applyIncident(
      serieIncident({ changeType: "creation", command: { pandascoreId: 100, fullName: "Paris" } }),
    );
    expect(store.events.size).toBe(0);
    expect(cache.invalidateTournament).not.toHaveBeenCalled();
  });

  it("re-keys a merged serie event when the target serie has no event", async () => {
    const stage = await service.upsertTournament(stageCommand({}));
    await service.applyIncident(
      serieIncident({ changeType: "deletion", deletion: { kind: "merged", intoId: 300 } }),
    );
    expect(store.eventOf(stage.id)).toMatchObject({
      pandascoreSerieId: 300,
      slug: "rlcs-major-paris-2026",
    });
  });

  it("moves the stages of a merged serie into the existing target event", async () => {
    const target = await service.upsertTournament(
      stageCommand({ pandascoreId: 9, serie: { pandascoreId: 300, fullName: "Paris Major 2026" } }),
    );

    const merged = await service.upsertTournament(stageCommand({}));
    const oldEventId = merged.event.id;
    log.length = 0;
    await service.applyIncident(
      serieIncident({ changeType: "deletion", deletion: { kind: "merged", intoId: 300 } }),
    );
    expect(store.tournaments.get(merged.id)).toMatchObject({
      slug: "playoffs-2",
      event: { id: target.event.id },
    });
    expect(store.events.has(oldEventId)).toBe(false);
    expect(log).toEqual(["commit", `invalidate ${merged.id}`]);
    await service.applyIncident(
      serieIncident({ changeType: "deletion", deletion: { kind: "merged", intoId: 300 } }),
    );
    expect(store.tournaments.get(merged.id)?.event.id).toBe(target.event.id);
  });

  it.each([{ kind: "replaced", entity: "serie", byId: 300 }, { kind: "deleted" }] as const)(
    "keeps an event on a $kind serie deletion",
    async (deletion) => {
      const stage = await service.upsertTournament(stageCommand({}));
      await service.applyIncident(serieIncident({ changeType: "deletion", deletion }));
      expect(store.eventOf(stage.id)?.pandascoreSerieId).toBe(100);
    },
  );

  it.each([false, true])(
    "historical rosters never update current membership (existing=%s)",
    async (existing) => {
      if (existing)
        store.tournamentWriter.participants.mockResolvedValue([
          Object.assign(new TournamentParticipant(), {
            id: "participant",
            team: Object.assign(new Team(), { id: "team" }),
          }),
        ]);
      await service.upsertTournament({
        pandascoreId: 42,
        name: "Past Cup",
        expectedRoster: [
          {
            team: { pandascoreId: 8, name: "Past team", slug: "past-team" },
            players: [
              { pandascoreId: 1, name: "Player", slug: "player" },
              { pandascoreId: 3, name: "Sub", slug: "sub" },
            ],
          },
        ],
      });
      expect(rosters.upsertPlayer).toHaveBeenCalledWith({
        pandascoreId: 1,
        name: "Player",
        slug: "player",
      });
      expect(rosters.upsertPlayer).toHaveBeenCalledWith({
        pandascoreId: 3,
        name: "Sub",
        slug: "sub",
      });
      expect(store.tournamentWriter.saveParticipant).toHaveBeenCalledWith(
        expect.objectContaining({ teamId: "team", playerIds: ["1", "3"] }),
      );

      if (existing)
        expect(store.tournamentWriter.saveParticipant).toHaveBeenCalledWith(
          expect.objectContaining({ id: "participant" }),
        );
    },
  );

  it("stores PandaScore final ranks as participant placements and clears missing ones", async () => {
    store.tournamentWriter.participants.mockResolvedValue([
      Object.assign(new TournamentParticipant(), {
        id: "dropped",
        team: Object.assign(new Team(), { id: "old", pandascoreId: 7 }),
      }),
      Object.assign(new TournamentParticipant(), { id: "unknown-team", team: null }),
    ]);
    await service.upsertTournament({
      pandascoreId: 42,
      name: "Playoffs",
      expectedRoster: [{ team: { pandascoreId: 8, name: "Winner", slug: "winner" }, players: [] }],
      standings: [
        { teamPandascoreId: 8, rank: 1 },
        { teamPandascoreId: 99, rank: 2 },
      ],
    });

    const [placements] = store.tournamentWriter.setPlacements.mock.calls[0] ?? [];
    expect(placements?.get("dropped")).toBeNull();
    expect(placements?.has("unknown-team")).toBe(false);
    expect(
      [...(placements?.values() ?? [])].sort((a, b) => (a ?? Infinity) - (b ?? Infinity)),
    ).toEqual([1, null]);
  });

  it("leaves placements untouched when the feed carries no standings", async () => {
    await service.upsertTournament({ pandascoreId: 42, name: "Playoffs" });
    expect(store.tournamentWriter.setPlacements).not.toHaveBeenCalled();
  });

  it("preserves success after a committed write when Redis fails", async () => {
    cache.invalidateTournament.mockRejectedValue(new Error("offline"));
    await expect(
      service.upsertTournament({ pandascoreId: 42, name: "Cup" }),
    ).resolves.toMatchObject({ name: "Cup" });
    expect(diagnostics.error).toHaveBeenCalled();
  });

  describe("end date", () => {
    const finished = (endAt: string): MatchTiming => ({
      status: "finished",
      beginAt: new Date(endAt),
      endAt: new Date(endAt),
    });

    it("closes a stage once every match is finished and PandaScore has no end date", async () => {
      const event = store.seedEvent({ slug: "e", name: "E" });
      store.seedStage(event, { id: "stage", pandascoreId: 1, name: "Playoffs", slug: "playoffs" });
      store.timings.set("stage", [finished("2025-03-01T10:00Z"), finished("2025-03-02T18:00Z")]);
      expect((await service.upsertTournament(stageCommand({}))).endAt).toEqual(
        new Date("2025-03-02T18:00Z"),
      );
    });

    it("keeps the stage open while a match remains", async () => {
      const event = store.seedEvent({ slug: "e", name: "E" });
      store.seedStage(event, { id: "stage", pandascoreId: 1, name: "Playoffs", slug: "playoffs" });
      store.timings.set("stage", [
        finished("2025-03-01T10:00Z"),
        { status: "not_started", beginAt: new Date("2025-03-03T10:00Z"), endAt: null },
      ]);
      expect((await service.upsertTournament(stageCommand({}))).endAt).toBeNull();
    });

    it("keeps the stage open when the sync adds a match to a finished stage", async () => {
      const event = store.seedEvent({ slug: "e", name: "E" });
      store.seedStage(event, { id: "stage", pandascoreId: 1, name: "Playoffs", slug: "playoffs" });
      store.timings.set("stage", [finished("2025-03-01T10:00Z")]);

      const synced = await service.upsertTournament(stageCommand({}), [
        {
          pandascoreId: 10,
          tournamentPandascoreId: 1,
          name: "Tiebreaker",
          beginAt: new Date("2025-03-03T10:00Z"),
          status: "not_started",
          opponentSlugs: [],
          results: [],
          previousMatches: [],
          officialStreams: [],
        },
      ]);

      expect(synced.endAt).toBeNull();
    });

    it("closes a finished stage from a tournament incident", async () => {
      const event = store.seedEvent({ slug: "e", name: "E" });
      store.seedStage(event, { id: "stage", pandascoreId: 1, name: "Playoffs", slug: "playoffs" });
      store.timings.set("stage", [finished("2025-03-02T18:00Z")]);
      await service.applyIncident({
        id: 1,
        modifiedAt: new Date(),
        kind: "tournament",
        changeType: "update",
        command: stageCommand({}),
      });
      expect(store.tournaments.get("stage")?.endAt).toEqual(new Date("2025-03-02T18:00Z"));
    });

    it("keeps a staff-corrected end date over PandaScore", async () => {
      const event = store.seedEvent({ slug: "e", name: "E" });
      store.seedStage(event, {
        id: "stage",
        pandascoreId: 1,
        name: "Playoffs",
        slug: "playoffs",
        endAt: new Date("2025-03-05"),
        endAtCorrected: true,
      });

      const synced = await service.upsertTournament(
        stageCommand({ endAt: new Date("2025-04-01") }),
      );

      expect(synced.endAt).toEqual(new Date("2025-03-05"));
    });
  });

  describe("manual counterparts", () => {
    const beginAt = new Date("2026-03-01T12:00Z");

    const seedManual = (id: string, name = "RLCS Major Paris 2026 Playoffs") =>
      store.seedStage(store.seedEvent({ id: `event-${id}`, slug: id, name }), {
        id,
        source: "manual",
        pandascoreId: null,
        name,
        slug: `manual-${id}`,
        beginAt: new Date("2026-03-01T00:00Z"),
        endAt: new Date("2026-03-02T00:00Z"),
      });

    it("links the manual tournament staff chose even when names differ", async () => {
      seedManual("manual", "MENA qualifier");
      const linked = await service.upsertTournament(stageCommand({ beginAt }), [], "manual");
      expect(linked).toMatchObject({ id: "manual", source: "pandascore", pandascoreId: 1 });
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

    const matchCommand = (pandascoreId: number, status: string) => ({
      pandascoreId,
      tournamentPandascoreId: 1,
      name: `Match ${pandascoreId}`,
      beginAt: new Date("2030-01-01"),
      status,
      opponentSlugs: [],
      opponentPandascoreIds: [1, 2],
      results: [
        { teamPandascoreId: 1, score: 3 },
        { teamPandascoreId: 2, score: 1 },
      ],
      previousMatches: [],
      officialStreams: [],
    });

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
      expect(published.publish).toHaveBeenCalledTimes(1);
      expect(published.publish).toHaveBeenCalledWith(matchDecided(decided!.id));
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
