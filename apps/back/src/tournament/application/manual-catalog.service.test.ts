import { beforeEach, describe, expect, it } from "vitest";
import { present } from "../../../test/doubles";
import { ConflictError } from "../../common/domain/errors/conflict-error";
import { InvalidInputError } from "../../common/domain/errors/invalid-input-error";
import { NotFoundError } from "../../common/domain/errors/not-found-error";
import { League } from "../domain/league";
import { Tournament } from "../domain/tournament";
import { TournamentEvent } from "../domain/tournament-event";
import { CompetitionAfterCommit } from "./after-commit";
import { ManualCatalogService } from "./manual-catalog.service";
import type { EventListing, EventStage } from "./ports";
import {
  memoryEventWriter,
  memoryTournamentWriter,
  recordingCache,
  recordingDiagnostics,
  recordingEvents,
  transactionOver,
} from "./ports.test-utils";
import { eventQueries, tournamentQueries } from "../../../test/competition-doubles";

const event = (id: string, pandascoreSerieId: number | null = null) =>
  Object.assign(new TournamentEvent(), { id, name: id, pandascoreSerieId, slug: id });

describe(ManualCatalogService, () => {
  const eventStore = memoryEventWriter();
  const tournamentStore = memoryTournamentWriter();
  const { events } = eventStore;
  const { leagues } = tournamentStore;
  const cache = recordingCache();
  let stages: EventStage[] = [];
  let unsynced: EventListing[] = [];

  const tx = transactionOver({
    events: { ...eventStore, stages: async () => stages },
    tournaments: tournamentStore,
  });

  const service = new ManualCatalogService(
    tournamentQueries(),
    eventQueries({
      find: async (idOrSlug: string) => {
        const found = events.get(idOrSlug);

        return found ? { event: found, stages: [] } : null;
      },
      unsynced: async () => unsynced,
    }),
    tx,
    new CompetitionAfterCommit(cache, recordingEvents(), recordingDiagnostics()),
  );

  beforeEach(() => {
    events.clear();
    leagues.clear();
    cache.invalidated.length = 0;
    stages = [];
    unsynced = [];
    events.set(
      "cdf",
      Object.assign(new TournamentEvent(), {
        id: "cdf",
        name: "CDF",
        slug: "coupe-de-france-2026",
      }),
    );
    leagues.set(
      "rlcs",
      Object.assign(new League(), { id: "rlcs", name: "RLCS", pandascoreId: 4562, slug: "rlcs" }),
    );
  });

  it("creates an empty event under a generated, deduplicated slug", async () => {
    const created = await service.createEvent({ leagueId: "rlcs", name: "Coupe de France 2026" });
    expect(created.event).toMatchObject({
      league: { id: "rlcs" },
      name: "Coupe de France 2026",
      pandascoreSerieId: null,
      slug: "coupe-de-france-2026-2",
    });
    expect(created.stages).toStrictEqual([]);
  });

  it("rejects a taken explicit slug and an unknown league", async () => {
    await expect(
      service.createEvent({ name: "Other", slug: "coupe-de-france-2026" }),
    ).rejects.toBeInstanceOf(ConflictError);
    await expect(service.createEvent({ leagueId: "nope", name: "Other" })).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it("renames a manual event and refreshes the cache of its stages", async () => {
    stages = [
      { id: "pool", name: "Poule", source: "manual" },
      { id: "finals", name: "Finals", source: "manual" },
    ];

    const updated = await service.updateEvent("cdf", {
      leagueId: null,
      name: "Coupe de France Slash 2026",
      slug: "coupe-de-france-slash-2026",
    });

    expect(updated.event).toMatchObject({
      league: null,
      name: "Coupe de France Slash 2026",
      slug: "coupe-de-france-slash-2026",
    });
    expect(cache.invalidated).toStrictEqual(["pool", "finals"]);
  });

  it.each([
    ["follows a serie", { pandascoreSerieId: 9 }, []],
    ["holds a PandaScore stage", {}, [{ id: "s", name: "Swiss", source: "pandascore" as const }]],
  ])("rejects editing an event that %s", async (_label, patch, synced) => {
    Object.assign(present(events.get("cdf")), patch);
    stages = synced;
    await expect(service.updateEvent("cdf", { name: "Renamed" })).rejects.toBeInstanceOf(
      InvalidInputError,
    );
    expect(events.get("cdf")?.name).toBe("CDF");
  });

  it("lists only events the staff can edit, empty ones included", async () => {
    unsynced = [
      { event: event("empty"), stages: [] },
      {
        event: event("manual"),
        stages: [Object.assign(new Tournament(), { id: "pool", source: "manual" })],
      },
      {
        event: event("mixed"),
        stages: [Object.assign(new Tournament(), { id: "swiss", source: "pandascore" })],
      },
      { event: event("serie", 3), stages: [] },
    ];
    const manualEventsResult = await service.manualEvents();
    expect(manualEventsResult.map((listed) => listed.event.id)).toStrictEqual(["empty", "manual"]);
  });

  it("creates a manual league with a slug from its name", async () => {
    const league = await service.createLeague({ imageUrl: " ", name: "Coupe de France" });
    expect(league).toMatchObject({
      imageUrl: null,
      name: "Coupe de France",
      pandascoreId: null,
      slug: "coupe-de-france",
    });
    expect(leagues.get(league.id)).toMatchObject({ name: "Coupe de France" });
  });

  it("edits only the image of a PandaScore league", async () => {
    await expect(
      service.updateLeague("rlcs", { imageUrl: "https://cdn.example/rlcs.png" }),
    ).resolves.toMatchObject({ imageUrl: "https://cdn.example/rlcs.png", name: "RLCS" });
    await expect(service.updateLeague("rlcs", { name: "RLCS 2026" })).rejects.toBeInstanceOf(
      InvalidInputError,
    );
    await expect(service.updateLeague("ghost", { name: "x" })).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });
});
