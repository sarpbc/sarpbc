import type { CircuitScaleTier, CircuitSummary, DataSource } from "@sarpbc/types";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ConflictError, InvalidInputError, NotFoundError } from "../../common/domain/errors";
import type { CircuitStageResult } from "../domain/circuit-standings";
import { CircuitService } from "./circuit.service";
import type { CircuitStore } from "./ports";

const SOURCE = "https://example.org/official-rules";
const scale: CircuitScaleTier[] = [{ from: 1, to: 1, points: 10 }];

function setup() {
  const circuits = new Map<string, CircuitSummary>();
  const sources = new Map<string, DataSource>([
    ["ps-stage", "pandascore"],
    ["startgg-stage", "startgg"],
    ["manual-stage", "manual"],
  ]);
  const saved = new Map<string, { scale: CircuitScaleTier[]; sourceUrl: string }>();
  const results: CircuitStageResult[] = [];
  const store: CircuitStore = {
    list: vi.fn(async () => [...circuits.values()]),
    find: vi.fn(
      async (ref: string) =>
        [...circuits.values()].find(({ id, slug }) => id === ref || slug === ref) ?? null,
    ),
    slugTaken: vi.fn(async (slug: string, exceptId: string | null) =>
      [...circuits.values()].some((c) => c.slug === slug && c.id !== exceptId),
    ),
    save: vi.fn(async (circuit: CircuitSummary) => {
      circuits.set(circuit.id, circuit);
    }),
    remove: vi.fn(async (id: string) => circuits.delete(id)),
    stages: vi.fn(async () => []),
    stageResults: vi.fn(async () => results),
    tournamentSource: vi.fn(async (id: string) => sources.get(id) ?? null),
    saveStage: vi.fn(async (circuitId: string, tournamentId: string, stage) => {
      saved.set(`${circuitId}:${tournamentId}`, stage);
    }),
    removeStage: vi.fn(async (circuitId: string, tournamentId: string) =>
      saved.delete(`${circuitId}:${tournamentId}`),
    ),
  };
  const service = new CircuitService(store, () => new Date("2026-06-01T00:00:00Z"));
  return { service, saved, results };
}

describe("CircuitService", () => {
  let service: CircuitService;
  let saved: ReturnType<typeof setup>["saved"];
  let results: ReturnType<typeof setup>["results"];
  let circuitId: string;

  beforeEach(async () => {
    ({ service, saved, results } = setup());
    circuitId = (await service.create({ name: "  Season Circuit  " })).id;
  });

  it("creates a circuit with a slug from its name and refuses a taken slug", async () => {
    expect(await service.detail("season-circuit")).toMatchObject({
      name: "Season Circuit",
      slug: "season-circuit",
      qualificationSpots: null,
      stages: [],
    });
    await expect(service.create({ name: "Season circuit" })).rejects.toThrow(ConflictError);
    await expect(service.create({ name: "x", qualificationSpots: 0 })).rejects.toThrow(
      InvalidInputError,
    );
  });

  it("stores a PandaScore stage scale with its source, sorted", async () => {
    await service.setStageScale(
      circuitId,
      "ps-stage",
      [{ from: 2, to: 2, points: 6 }, ...scale],
      SOURCE,
    );

    expect(saved.get(`${circuitId}:ps-stage`)).toEqual({
      scale: [...scale, { from: 2, to: 2, points: 6 }],
      sourceUrl: SOURCE,
    });
  });

  it("refuses start.gg and manual tournaments so they never count", async () => {
    for (const id of ["startgg-stage", "manual-stage"]) {
      await expect(service.setStageScale(circuitId, id, scale, SOURCE)).rejects.toThrow(
        "Only PandaScore tournaments count",
      );
      await expect(service.requireStageScale(circuitId, id, scale)).rejects.toThrow(
        InvalidInputError,
      );
    }
    expect(saved.size).toBe(0);
  });

  it("requires a source URL and an existing circuit and tournament", async () => {
    await expect(service.setStageScale(circuitId, "ps-stage", scale, "")).rejects.toThrow(
      "http(s)",
    );
    await expect(service.setStageScale(circuitId, "missing", scale, SOURCE)).rejects.toThrow(
      NotFoundError,
    );
    await expect(service.setStageScale("missing", "ps-stage", scale, SOURCE)).rejects.toThrow(
      NotFoundError,
    );
    expect(saved.size).toBe(0);
  });

  it("returns standings computed from the stored stage results", async () => {
    results.push({
      event: { id: "e1", slug: "e1", name: "Event 1" },
      beginAt: new Date("2026-01-01T00:00:00Z"),
      endAt: new Date("2026-01-05T00:00:00Z"),
      scale,
      sourceUrl: SOURCE,
      placements: [
        {
          placement: 1,
          team: { id: "t1", name: "Team", slug: "team", imageUrl: null, darkModeImageUrl: null },
        },
      ],
    });

    const standings = await service.standings("season-circuit");

    expect(standings).toMatchObject({
      id: circuitId,
      sourceUrls: [SOURCE],
      rows: [{ rank: 1, points: 10, team: { id: "t1" } }],
    });
  });

  it("reports a missing circuit or stage", async () => {
    await expect(service.standings("nope")).rejects.toThrow(NotFoundError);
    await expect(service.removeStage(circuitId, "ps-stage")).rejects.toThrow(NotFoundError);
    await service.remove(circuitId);
    await expect(service.remove(circuitId)).rejects.toThrow(NotFoundError);
  });
});
