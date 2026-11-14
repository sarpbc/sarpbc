import type { CircuitEventTeam, CircuitScaleTier, CircuitSummary } from "@sarpbc/types";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ConflictError, InvalidInputError, NotFoundError } from "../../common/domain/errors";
import type { CircuitStageSettings } from "../domain/circuit-scale";
import { CircuitService } from "./circuit.service";
import type { CircuitStore, StoredStageResult } from "./ports";

const SOURCE = "https://example.org/official-rules";
const scale: CircuitScaleTier[] = [{ from: 1, to: 1, points: 10 }];

const team = (id: string) => ({
  id,
  name: id.toUpperCase(),
  slug: id,
  imageUrl: null,
  darkModeImageUrl: null,
});

function setup() {
  const circuits = new Map<string, CircuitSummary>();

  const eventTeams = new Map<string, CircuitEventTeam[]>(
    ["ps-stage", "startgg-stage", "manual-stage"].map((id) => [
      id,
      [
        { team: team("kc"), placement: 1 },
        { team: team("nrg"), placement: null },
      ],
    ]),
  );

  const saved = new Map<string, CircuitStageSettings>();
  const results: StoredStageResult[] = [];

  const store: CircuitStore = {
    list: vi.fn(async () => [...circuits.values()]),
    find: vi.fn(
      async (ref: string) =>
        [...circuits.values()].find(({ id, slug }) => id === ref || slug === ref) ?? null,
    ),
    slugTaken: vi.fn(async (slug: string, exceptId: string | null) =>
      [...circuits.values()].some((c) => c.slug === slug && c.id !== exceptId),
    ),
    withSeason: vi.fn(async (season: number | null) =>
      [...circuits.values()].filter((c) => c.season === season),
    ),
    save: vi.fn(async (circuit: CircuitSummary) => {
      circuits.set(circuit.id, circuit);
    }),
    remove: vi.fn(async (id: string) => circuits.delete(id)),
    stages: vi.fn(async () => []),
    stageResults: vi.fn(async () => results),
    eventTeams: vi.fn(async (id: string) => eventTeams.get(id) ?? null),
    saveStage: vi.fn(
      async (circuitId: string, tournamentId: string, stage: CircuitStageSettings) => {
        saved.set(`${circuitId}:${tournamentId}`, stage);
      },
    ),
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
    circuitId = (
      await service.create({ name: "  Season Circuit  ", season: 2025, sourceUrl: SOURCE })
    ).id;
  });

  it("creates a circuit with a slug from its name and refuses a taken slug", async () => {
    expect(await service.detail("season-circuit")).toMatchObject({
      name: "Season Circuit",
      slug: "season-circuit",
      qualificationSpots: null,
      stages: [],
    });
    await expect(
      service.create({ name: "Season circuit", season: 2026, sourceUrl: SOURCE }),
    ).rejects.toThrow(ConflictError);
    await expect(
      service.create({ name: "x", season: 2026, sourceUrl: SOURCE, qualificationSpots: 0 }),
    ).rejects.toThrow(InvalidInputError);
  });

  it("stores season, region and rules source, and refuses the same name, season and region", async () => {
    const rlcs = await service.create({
      name: "RLCS 2026",
      slug: "season-2026",
      season: 2026,
      region: " Worldwide ",
      description: "",
      sourceUrl: ` ${SOURCE} `,
    });

    expect(await service.detail("season-2026")).toMatchObject({
      id: rlcs.id,
      season: 2026,
      region: "Worldwide",
      description: null,
      sourceUrl: SOURCE,
    });

    const sourced = { sourceUrl: SOURCE };
    await expect(
      service.create({
        name: "rlcs 2026",
        slug: "other",
        season: 2026,
        region: "worldwide",
        ...sourced,
      }),
    ).rejects.toThrow(ConflictError);
    await expect(
      service.create({ name: "Other", slug: "season-2026", season: 2027, ...sourced }),
    ).rejects.toThrow(ConflictError);

    const europe = await service.create({
      name: "RLCS 2026",
      slug: "season-2026-eu",
      season: 2026,
      region: "EU",
      ...sourced,
    });

    await service.create({ name: "RLCS 2026", slug: "season-2027", season: 2027, ...sourced });
    await expect(
      service.create({
        name: "rlcs 2026",
        slug: "season-2027-copy",
        season: 2027,
        region: " ",
        ...sourced,
      }),
    ).rejects.toThrow(ConflictError);

    await expect(service.update(europe.id, { region: "Worldwide" })).rejects.toThrow(ConflictError);
    expect(await service.update("season-2026-eu", { region: "NA", season: 2026 })).toMatchObject({
      id: europe.id,
      region: "NA",
    });
    expect(await service.update(rlcs.id, { name: "RLCS 2026" })).toMatchObject({ id: rlcs.id });
    expect(await service.update(rlcs.id, { region: null, description: null })).toMatchObject({
      season: 2026,
      region: null,
      sourceUrl: SOURCE,
    });
  });

  it("validates the season and the rules source", async () => {
    const valid = { name: "x", season: 2026, sourceUrl: SOURCE };
    await expect(service.create({ ...valid, season: 1999 })).rejects.toThrow(InvalidInputError);
    await expect(service.create({ ...valid, season: 2026.5 })).rejects.toThrow(InvalidInputError);

    for (const sourceUrl of [
      "",
      " ",
      "ftp://example.org",
      "https://liquipedia.net/rocketleague/RLCS",
      "https://liquipedia-mirror.example/rocketleague/RLCS",
      "https://blast.tv/rl/leaderboard/2026/world-championship/eu",
    ])
      await expect(service.create({ ...valid, sourceUrl })).rejects.toThrow(InvalidInputError);
    await expect(service.update(circuitId, { season: 3000 })).rejects.toThrow(InvalidInputError);
    await expect(service.update(circuitId, { sourceUrl: "" })).rejects.toThrow(InvalidInputError);
  });

  it("stores a PandaScore stage scale with its source, sorted", async () => {
    await service.setStageScale(circuitId, "ps-stage", {
      scale: [{ from: 2, to: 2, points: 6 }, ...scale],
      sourceUrl: SOURCE,
    });

    expect(saved.get(`${circuitId}:ps-stage`)).toEqual({
      scale: [...scale, { from: 2, to: 2, points: 6 }],
      sourceUrl: SOURCE,
      worldwide: false,
      regionTeamIds: [],
      finishes: [],
    });
  });

  it("accepts manual and start.gg stages", async () => {
    for (const id of ["manual-stage", "startgg-stage"])
      await service.setStageScale(circuitId, id, { scale, sourceUrl: SOURCE });

    expect([...saved.keys()]).toEqual([`${circuitId}:manual-stage`, `${circuitId}:startgg-stage`]);
  });

  it("stores the worldwide flag, the region teams and the final placements sorted", async () => {
    await service.setStageScale(circuitId, "ps-stage", {
      scale,
      sourceUrl: SOURCE,
      worldwide: true,
      regionTeamIds: ["kc", "nrg"],
      finishes: [
        { teamId: "nrg", placement: 13 },
        { teamId: "kc", placement: 9 },
      ],
    });

    expect(saved.get(`${circuitId}:ps-stage`)).toMatchObject({
      worldwide: true,
      regionTeamIds: ["kc", "nrg"],
      finishes: [
        { teamId: "kc", placement: 9 },
        { teamId: "nrg", placement: 13 },
      ],
    });
  });

  it("refuses teams outside the event, repeated teams and invalid final placements", async () => {
    const stage = { scale, sourceUrl: SOURCE };

    for (const refused of [
      { regionTeamIds: ["bds"] },
      { regionTeamIds: ["kc", "kc"] },
      { finishes: [{ teamId: "bds", placement: 9 }] },
      {
        finishes: [
          { teamId: "kc", placement: 9 },
          { teamId: "kc", placement: 13 },
        ],
      },
      { finishes: [{ teamId: "kc", placement: 0 }] },
      { finishes: [{ teamId: "kc", placement: 9.5 }] },
    ])
      await expect(
        service.setStageScale(circuitId, "ps-stage", { ...stage, ...refused }),
      ).rejects.toThrow(InvalidInputError);
    expect(saved.size).toBe(0);
  });

  it("requires an accepted source URL and an existing circuit and tournament", async () => {
    for (const sourceUrl of ["", "https://www.blast.tv/rl/leaderboard/2026"])
      await expect(
        service.setStageScale(circuitId, "ps-stage", { scale, sourceUrl }),
      ).rejects.toThrow(InvalidInputError);
    await expect(
      service.setStageScale(circuitId, "missing", { scale, sourceUrl: SOURCE }),
    ).rejects.toThrow(NotFoundError);
    await expect(
      service.setStageScale("missing", "ps-stage", { scale, sourceUrl: SOURCE }),
    ).rejects.toThrow(NotFoundError);
    expect(saved.size).toBe(0);
  });

  it("lists the teams of the stage's event for staff", async () => {
    expect(await service.stageTeams(circuitId, "ps-stage")).toHaveLength(2);
    await expect(service.stageTeams(circuitId, "missing")).rejects.toThrow(NotFoundError);
  });

  const result = (overrides: Partial<StoredStageResult>): StoredStageResult => ({
    source: "pandascore",
    event: { id: "e1", slug: "e1", name: "Event 1" },
    beginAt: new Date("2026-01-01T00:00:00Z"),
    endAt: new Date("2026-01-05T00:00:00Z"),
    scale,
    sourceUrl: SOURCE,
    worldwide: false,
    regionTeamIds: [],
    placements: [{ placement: 1, team: team("t1") }],
    finishes: [],
    ...overrides,
  });

  it("returns standings computed from the stored stage results", async () => {
    results.push(result({}));

    const standings = await service.standings("season-circuit");

    expect(standings).toMatchObject({
      id: circuitId,
      sourceUrls: [SOURCE],
      rows: [{ rank: 1, points: 10, team: { id: "t1" } }],
    });
  });

  it("counts manual stages and leaves start.gg stages out of the public standings", async () => {
    const startgg = "https://www.start.gg/tournament/fake-open/event/3v3/overview/prizing";
    results.push(
      result({
        source: "manual",
        event: { id: "manual", slug: "manual", name: "Manual Cup" },
        placements: [],
        finishes: [{ placement: 1, team: team("manual-winner") }],
      }),
      result({
        source: "startgg",
        event: { id: "sgg", slug: "sgg", name: "start.gg Open" },
        sourceUrl: startgg,
        placements: [{ placement: 1, team: team("startgg-winner") }],
      }),
    );

    const standings = await service.standings("season-circuit");

    expect(standings.rows.map(({ team: { id } }) => id)).toEqual(["manual-winner"]);
    expect(standings.events.map(({ event: { id } }) => id)).toEqual(["manual"]);
    expect(standings.sourceUrls).not.toContain(startgg);
  });

  it("credits only the circuit region's teams from a worldwide stage", async () => {
    const major = {
      worldwide: true,
      regionTeamIds: ["eu-team"],
      placements: [
        { placement: 1, team: team("na-team") },
        { placement: 2, team: team("eu-team") },
      ],
      scale: [
        { from: 1, to: 1, points: 30 },
        { from: 2, to: 2, points: 20 },
      ],
    };

    results.push(result(major));

    const europe = await service.create({
      name: "RLCS 2026 EU",
      season: 2026,
      region: "EU",
      sourceUrl: SOURCE,
    });

    expect((await service.standings(europe.id)).rows.map(({ team: { id } }) => id)).toEqual([
      "eu-team",
    ]);
    expect((await service.standings(circuitId)).rows.map(({ team: { id } }) => id)).toEqual([
      "na-team",
      "eu-team",
    ]);
  });

  it("reports a missing circuit or stage", async () => {
    await expect(service.standings("nope")).rejects.toThrow(NotFoundError);
    await expect(service.removeStage(circuitId, "ps-stage")).rejects.toThrow(NotFoundError);
    await service.remove(circuitId);
    await expect(service.remove(circuitId)).rejects.toThrow(NotFoundError);
  });
});
