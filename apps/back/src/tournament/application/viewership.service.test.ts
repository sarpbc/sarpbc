import type { DataSource, Viewership } from "@sarpbc/types";
import { beforeEach, describe, expect, it } from "vitest";
import { InvalidInputError } from "../../common/domain/errors/invalid-input-error";
import { NotFoundError } from "../../common/domain/errors/not-found-error";
import { Match, type TournamentSummary } from "../domain/match";
import { TournamentEvent } from "../domain/tournament-event";
import type { EventStage } from "./ports";
import { ViewershipService, type ViewershipScope } from "./viewership.service";

const VIEWERSHIP: Viewership = {
  peakViewers: 64_000,
  averageViewers: 40_000,
  scope: "with_costreams",
  measuredAt: "2026-05-24T18:00:00Z",
  sourceName: " Esports Charts ",
  sourceUrl: "https://escharts.com/tournaments/rl/fake-open",
};

function stage(source: DataSource): TournamentSummary {
  return {
    id: `stage-${source}`,
    name: "Main Event",
    slug: "main-event",
    event: { id: "event", slug: "fake-open", name: "Fake Open" },
    beginAt: null,
    league: null,
    pickemsEnabled: false,
    source,
    pandascoreId: null,
    streams: [],
    eventStreams: [],
  };
}

describe(ViewershipService, () => {
  const events = new Map<string, TournamentEvent>();
  const matches = new Map<string, Match>();
  let stages: EventStage[] = [];

  const scope: ViewershipScope = {
    events: {
      load: async (id) => events.get(id) ?? null,
      stages: async () => stages,
      save: async (event) => {
        events.set(event.id, event);
      },
    },
    matches: {
      load: async (id) => matches.get(id) ?? null,
      save: async (match) => {
        matches.set(match.id, match);
      },
    },
  };

  const service = new ViewershipService({ run: async (work) => await work(scope) });

  beforeEach(() => {
    events.clear();
    matches.clear();
    stages = [];
    events.set("event", Object.assign(new TournamentEvent(), { id: "event" }));
    matches.set(
      "manual",
      Object.assign(new Match(), { id: "manual", tournament: stage("manual") }),
    );
    matches.set(
      "startgg",
      Object.assign(new Match(), {
        id: "startgg",
        source: "startgg",
        tournament: stage("startgg"),
      }),
    );
  });

  it("stores a staff entry with its normalized credit and clears it with null", async () => {
    const saved = await service.set({ kind: "match", id: "manual" }, VIEWERSHIP);

    expect(saved.viewership).toEqual({
      ...VIEWERSHIP,
      measuredAt: "2026-05-24T18:00:00.000Z",
      sourceName: "Esports Charts",
    });
    await expect(service.find({ kind: "match", id: "manual" })).resolves.toEqual(saved);

    await service.set({ kind: "match", id: "manual" }, null);
    expect(matches.get("manual")?.viewership).toBeNull();
  });

  it("refuses an entry without a source to credit", async () => {
    await expect(
      service.set({ kind: "event", id: "event" }, { ...VIEWERSHIP, sourceName: "" }),
    ).rejects.toThrow(InvalidInputError);
    await expect(
      service.set({ kind: "event", id: "event" }, { ...VIEWERSHIP, sourceUrl: "escharts.com" }),
    ).rejects.toThrow("not a valid URL");
    expect(events.get("event")?.viewership).toBeNull();
  });

  it("lets staff enter start.gg numbers for the site but refuses them as proposals", async () => {
    await service.set({ kind: "match", id: "startgg" }, VIEWERSHIP);
    expect(matches.get("startgg")?.viewership?.peakViewers).toBe(64_000);

    await expect(
      service.requireProposable({ kind: "match", id: "startgg" }, VIEWERSHIP),
    ).rejects.toThrow("start.gg match");
    stages = [{ id: "s1", name: "Swiss", source: "startgg" }];
    await expect(
      service.requireProposable({ kind: "event", id: "event" }, VIEWERSHIP),
    ).rejects.toThrow("start.gg event");
    stages = [...stages, { id: "s2", name: "Playoffs", source: "manual" }];
    await expect(
      service.requireProposable({ kind: "event", id: "event" }, VIEWERSHIP),
    ).resolves.toBeUndefined();
  });

  it("reports a missing owner", async () => {
    await expect(service.find({ kind: "match", id: "missing" })).rejects.toThrow(NotFoundError);
  });
});
