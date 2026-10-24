import { beforeEach, describe, expect, it, vi } from "vitest";
import { CompetitionSyncService } from "./competition-sync.service";
import { League, Match, Tournament, TournamentParticipant } from "../../domain/competition";
import { TournamentEvent, toEventRef } from "../../domain/tournament-event";
import { Team } from "../../../player/domain/roster";
import type { CompetitionWriteScope, EventWriter } from "../ports";
import type { UpsertTournamentCommand } from "../../../pandascore/application/commands/upsert-tournament.command";
import type { CompetitionIncident } from "../../../pandascore/application/models/competition-feed";
import type { MatchTiming } from "../../domain/tournament-end";

const copy = <T extends object>(value: T): T =>
  Object.assign(Object.create(Object.getPrototypeOf(value) as object) as T, value);

function memoryStore() {
  const tournaments = new Map<string, Tournament>();
  const events = new Map<string, TournamentEvent>();
  const leagues = new Map<number, League>();
  const timings = new Map<string, MatchTiming[]>();
  const all = () => [...tournaments.values()];
  const tournamentWriter = {
    byPandascoreId: vi.fn(async (id: number) => {
      const found = all().find((t) => t.pandascoreId === id);
      return found ? copy(found) : null;
    }),
    load: vi.fn(async (id: string) => {
      const found = tournaments.get(id);
      return found ? copy(found) : null;
    }),
    manualCandidates: vi.fn(async ({ from, to }: { from: Date; to: Date }) =>
      all()
        .filter(
          (t) =>
            t.source === "manual" &&
            t.pandascoreId === null &&
            t.beginAt !== null &&
            t.beginAt >= from &&
            t.beginAt <= to,
        )
        .map((t) => ({
          id: t.id,
          name: t.name,
          leagueId: t.league?.id ?? null,
          beginAt: t.beginAt,
          endAt: t.endAt,
        })),
    ),
    save: vi.fn(async (tournament: Tournament) => {
      tournaments.set(tournament.id, copy(tournament));
    }),
    participants: vi.fn(async (): Promise<TournamentParticipant[]> => []),
    saveParticipant: vi.fn(),
    leagueByPandascoreId: vi.fn(async (id: number) => leagues.get(id) ?? null),
    saveLeague: vi.fn(async (league: League) => {
      leagues.set(league.pandascoreId, copy(league));
    }),
  };
  const eventWriter: EventWriter = {
    load: async (id) => {
      const found = events.get(id);
      return found ? copy(found) : null;
    },
    bySerieId: async (id) => {
      const found = [...events.values()].find((e) => e.pandascoreSerieId === id);
      return found ? copy(found) : null;
    },
    unclaimedByName: async (leagueId, name) => {
      const found = [...events.values()].find(
        (e) =>
          e.pandascoreSerieId === null &&
          (e.league?.id ?? null) === leagueId &&
          e.name === name &&
          !all().some((t) => t.event.id === e.id && t.source === "manual"),
      );
      return found ? copy(found) : null;
    },
    slugTaken: async (slug, except) =>
      [...events.values()].some((e) => e.slug === slug && e.id !== except),
    stageSlugTaken: async (eventId, slug, except) =>
      all().some((t) => t.event.id === eventId && t.slug === slug && t.id !== except),
    stages: async (eventId) =>
      all()
        .filter((t) => t.event.id === eventId)
        .map(({ id, name }) => ({ id, name })),
    save: async (event) => {
      events.set(event.id, copy(event));
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
  const cache = { invalidateTournament: vi.fn() },
    scoring = { autoScoreMatch: vi.fn() },
    diagnostics = { error: vi.fn(), warn: vi.fn() };
  const log: string[] = [];
  let store: ReturnType<typeof memoryStore>;
  const tx = {
    run: async <T>(work: (scope: CompetitionWriteScope) => Promise<T>) => {
      const scope = {
        tournaments: store.tournamentWriter,
        events: store.eventWriter,
        matches: store.matchWriter,
        rosters,
      };
      const result = await work(scope as never);
      log.push("commit");
      return result;
    },
  };
  const service = new CompetitionSyncService({} as never, tx, cache, scoring, diagnostics);
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
    change: Partial<CompetitionIncident> & Pick<CompetitionIncident, "changeType">,
  ) => ({ id: 100, modifiedAt: new Date(), kind: "serie", ...change }) as CompetitionIncident;

  beforeEach(() => {
    vi.clearAllMocks();
    log.length = 0;
    store = memoryStore();
    rosters.upsertTeam.mockResolvedValue({ id: "team" });
    rosters.upsertPlayer.mockImplementation(async (p: { pandascoreId: number }) => ({
      id: String(p.pandascoreId),
    }));
    cache.invalidateTournament.mockImplementation(async (id: string) => {
      log.push("invalidate " + id);
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
    expect(log).toEqual(["commit", "invalidate " + created.id]);
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
    expect(log).toEqual(["commit", "invalidate " + created.id, "invalidate " + sibling.id]);
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

  it("lets a backfilled stage claim its own event for the serie", async () => {
    const event = store.seedEvent({ slug: "rlcs-major-paris-2026", name: "RLCS Major Paris" });
    store.seedStage(event, { id: "stage", pandascoreId: 1, name: "Playoffs", slug: "playoffs" });
    const synced = await service.upsertTournament(stageCommand({}));
    expect(synced.event.id).toBe(event.id);
    expect(store.events.get(event.id)).toMatchObject({
      pandascoreSerieId: 100,
      slug: "rlcs-major-paris-2026",
      name: "RLCS Major Paris 2026",
    });
  });

  it("files a new stage under the unclaimed league event with the same name", async () => {
    await service.upsertTournament({ pandascoreId: 50, name: "Other", league: rlcsMajor });
    const leagueId = [...store.events.values()][0].league?.id ?? null;
    const event = store.seedEvent({
      slug: "rlcs-major-paris-2026",
      name: "RLCS Major Paris 2026",
      league: Object.assign(new League(), { id: leagueId, name: "RLCS Major" }),
    });
    store.seedStage(event, { id: "group-a", pandascoreId: 3, name: "Group A", slug: "group-a" });
    const synced = await service.upsertTournament(stageCommand({ pandascoreId: 4 }));
    expect(synced.event).toMatchObject({ id: event.id, slug: "rlcs-major-paris-2026" });
    expect(store.events.get(event.id)?.pandascoreSerieId).toBe(100);
  });

  it("never files a provider stage under a manual event", async () => {
    await service.upsertTournament({ pandascoreId: 50, name: "Other", league: rlcsMajor });
    const leagueId = [...store.events.values()][0].league?.id ?? null;
    const manual = store.seedEvent({
      slug: "rlcs-major-paris-2026",
      name: "RLCS Major Paris 2026",
      league: Object.assign(new League(), { id: leagueId, name: "RLCS Major" }),
    });
    store.seedStage(manual, { id: "manual", source: "manual", name: "Watch party", slug: "x" });
    const synced = await service.upsertTournament(stageCommand({ pandascoreId: 4 }));
    expect(synced.event.id).not.toBe(manual.id);
    expect(synced.event.slug).toBe("rlcs-major-paris-2026-2");
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
    expect(log).toEqual(["commit", "invalidate " + stage.id]);
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
    expect(log).toEqual(["commit", "invalidate " + merged.id]);
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
      expect(rosters.upsertPlayer).toHaveBeenNthCalledWith(1, {
        pandascoreId: 1,
        name: "Player",
        slug: "player",
      });
      expect(rosters.upsertPlayer).toHaveBeenNthCalledWith(2, {
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
      } as CompetitionIncident);
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
      store.seedStage(store.seedEvent({ id: "event-" + id, slug: id, name }), {
        id,
        source: "manual",
        pandascoreId: null,
        name,
        slug: "manual-" + id,
        beginAt: new Date("2026-03-01T00:00Z"),
        endAt: new Date("2026-03-02T00:00Z"),
      });

    it("turns the single matching manual tournament into the synced stage", async () => {
      seedManual("manual");
      const synced = await service.upsertTournament(stageCommand({ beginAt }));
      expect(synced).toMatchObject({
        id: "manual",
        source: "pandascore",
        pandascoreId: 1,
        name: "Playoffs",
        endAt: new Date("2026-03-02T00:00Z"),
        endAtCorrected: true,
      });
      expect(store.tournaments.size).toBe(1);
      expect(store.eventOf("manual")).toMatchObject({ slug: "manual", pandascoreSerieId: 100 });
    });

    it("creates a separate stage and warns when several manual tournaments match", async () => {
      seedManual("first");
      seedManual("second");
      const synced = await service.upsertTournament(stageCommand({ beginAt }));
      expect(synced.id).not.toMatch(/first|second/);
      expect(diagnostics.warn).toHaveBeenCalledWith(
        expect.stringContaining("Several manual tournaments"),
        { pandascoreId: 1, tournamentIds: ["first", "second"] },
      );
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
});
