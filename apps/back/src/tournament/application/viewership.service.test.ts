import type { DataSource, Viewership } from "@sarpbc/types";
import { beforeEach, describe, expect, it } from "vitest";
import { InvalidInputError } from "../../common/domain/errors/invalid-input-error";
import { NotFoundError } from "../../common/domain/errors/not-found-error";
import { Match } from "../domain/match";
import { TournamentEvent } from "../domain/tournament-event";
import { ViewershipService } from "./viewership.service";
import type { ViewershipScope } from "./viewership.service";

const VIEWERSHIP: Viewership = {
  averageViewers: 40_000,
  measuredAt: "2026-05-24T18:00:00Z",
  peakViewers: 64_000,
  scope: "with_costreams",
  sourceName: " Esports Charts ",
  sourceUrl: "https://escharts.com/tournaments/rl/fake-open",
};

const stage = (source: DataSource) => ({
  beginAt: null,
  event: { id: "event", name: "Fake Open", slug: "fake-open" },
  eventStreams: [],
  id: `stage-${source}`,
  league: null,
  name: "Main Event",
  pandascoreId: null,
  pickemsEnabled: false,
  slug: "main-event",
  source,
  streams: [],
});

describe(ViewershipService, () => {
  const events = new Map<string, TournamentEvent>();
  const matches = new Map<string, Match>();

  const scope: ViewershipScope = {
    events: {
      load: async (id) => events.get(id) ?? null,
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
    events.set("event", Object.assign(new TournamentEvent(), { id: "event" }));
    matches.set(
      "manual",
      Object.assign(new Match(), { id: "manual", tournament: stage("manual") }),
    );
  });

  it("stores a staff entry with its normalized credit and clears it with null", async () => {
    const saved = await service.set({ id: "manual", kind: "match" }, VIEWERSHIP);

    expect(saved.viewership).toStrictEqual({
      ...VIEWERSHIP,
      measuredAt: "2026-05-24T18:00:00.000Z",
      sourceName: "Esports Charts",
    });
    await expect(service.find({ id: "manual", kind: "match" })).resolves.toStrictEqual(saved);

    await service.set({ id: "manual", kind: "match" }, null);
    expect(matches.get("manual")?.viewership).toBeNull();
  });

  it("refuses an entry without a source to credit", async () => {
    await expect(
      service.set({ id: "event", kind: "event" }, { ...VIEWERSHIP, sourceName: "" }),
    ).rejects.toThrow(InvalidInputError);
    await expect(
      service.set({ id: "event", kind: "event" }, { ...VIEWERSHIP, sourceUrl: "escharts.com" }),
    ).rejects.toThrow("not a valid URL");
    expect(events.get("event")?.viewership).toBeNull();
  });

  it("accepts a proposal for an existing match or event without writing", async () => {
    await expect(
      service.requireProposable({ id: "manual", kind: "match" }, VIEWERSHIP),
    ).resolves.toBeUndefined();
    await expect(
      service.requireProposable({ id: "event", kind: "event" }, VIEWERSHIP),
    ).resolves.toBeUndefined();
    expect(matches.get("manual")?.viewership).toBeNull();
    await expect(
      service.requireProposable({ id: "missing", kind: "match" }, VIEWERSHIP),
    ).rejects.toThrow(NotFoundError);
  });

  it("reports a missing owner", async () => {
    await expect(service.find({ id: "missing", kind: "match" })).rejects.toThrow(NotFoundError);
  });
});
