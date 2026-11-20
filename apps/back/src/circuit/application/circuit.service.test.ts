import type { CircuitEventTeam, CircuitScaleTier } from "@sarpbc/types";
import { beforeEach, describe, expect, it } from "vitest";
import { ConflictError } from "../../common/domain/errors/conflict-error";
import { InvalidInputError } from "../../common/domain/errors/invalid-input-error";
import { NotFoundError } from "../../common/domain/errors/not-found-error";
import { CircuitService } from "./circuit.service";
import { MemoryCircuitStore } from "./circuit-store.test-utils";
import type { CircuitStageResult } from "../domain/circuit-standings";
import { mapSequentially } from "../../common/application/sequentially";

const SOURCE = "https://example.org/official-rules";
const scale: CircuitScaleTier[] = [{ from: 1, points: 10, to: 1 }];

const team = (id: string) => ({
  darkModeImageUrl: null,
  id,
  imageUrl: null,
  name: id.toUpperCase(),
  slug: id,
});

const setup = () => {
  const eventTeams = new Map<string, CircuitEventTeam[]>(
    ["ps-stage", "manual-stage"].map((id) => [
      id,
      [
        { placement: 1, team: team("kc") },
        { placement: null, team: team("nrg") },
      ],
    ]),
  );

  const store = new MemoryCircuitStore(eventTeams);
  const service = new CircuitService(store, () => new Date("2026-06-01T00:00:00Z"));

  return { results: store.results, saved: store.saved, service };
};

const result = (overrides: Partial<CircuitStageResult>) => {
  const base = {
    beginAt: new Date("2026-01-01T00:00:00Z"),
    endAt: new Date("2026-01-05T00:00:00Z"),
    event: { id: "e1", name: "Event 1", slug: "e1" },
    finishes: [],
    placements: [{ placement: 1, team: team("t1") }],
    regionTeamIds: [],
    scale,
    sourceUrl: SOURCE,
    worldwide: false,
  } satisfies CircuitStageResult;

  return { ...base, ...overrides };
};

describe(CircuitService, () => {
  let service: CircuitService;
  let saved: ReturnType<typeof setup>["saved"];
  let results: ReturnType<typeof setup>["results"];
  let circuitId: string;

  beforeEach(async () => {
    ({ service, saved, results } = setup());

    const createResult = await service.create({
      name: "  Season Circuit  ",
      season: 2025,
      sourceUrl: SOURCE,
    });

    circuitId = createResult.id;
  });

  it("creates a circuit with a slug from its name and refuses a taken slug", async () => {
    await expect(service.detail("season-circuit")).resolves.toMatchObject({
      name: "Season Circuit",
      qualificationSpots: null,
      slug: "season-circuit",
      stages: [],
    });
    await expect(
      service.create({ name: "Season circuit", season: 2026, sourceUrl: SOURCE }),
    ).rejects.toThrow(ConflictError);
    await expect(
      service.create({ name: "x", qualificationSpots: 0, season: 2026, sourceUrl: SOURCE }),
    ).rejects.toThrow(InvalidInputError);
  });

  describe("with a worldwide and a regional circuit of the same name", () => {
    const sourced = { sourceUrl: SOURCE };
    let rlcs: { id: string };
    let europe: { id: string };

    beforeEach(async () => {
      rlcs = await service.create({
        description: "",
        name: "RLCS 2026",
        region: " Worldwide ",
        season: 2026,
        slug: "season-2026",
        sourceUrl: ` ${SOURCE} `,
      });
      europe = await service.create({
        name: "RLCS 2026",
        region: "EU",
        season: 2026,
        slug: "season-2026-eu",
        ...sourced,
      });
    });

    it("stores season, region and rules source", async () => {
      await expect(service.detail("season-2026")).resolves.toMatchObject({
        description: null,
        id: rlcs.id,
        region: "Worldwide",
        season: 2026,
        sourceUrl: SOURCE,
      });
    });

    it("refuses the same name, season and region", async () => {
      await expect(
        service.create({
          name: "rlcs 2026",
          region: "worldwide",
          season: 2026,
          slug: "other",
          ...sourced,
        }),
      ).rejects.toThrow(ConflictError);
    });

    it("refuses a taken slug", async () => {
      await expect(
        service.create({ name: "Other", season: 2027, slug: "season-2026", ...sourced }),
      ).rejects.toThrow(ConflictError);
    });

    it("treats a blank region as no region", async () => {
      await service.create({ name: "RLCS 2026", season: 2027, slug: "season-2027", ...sourced });

      await expect(
        service.create({
          name: "rlcs 2026",
          region: " ",
          season: 2027,
          slug: "season-2027-copy",
          ...sourced,
        }),
      ).rejects.toThrow(ConflictError);
    });

    it("refuses moving a circuit onto another circuit's name, season and region", async () => {
      await expect(service.update(europe.id, { region: "Worldwide" })).rejects.toThrow(
        ConflictError,
      );
    });

    it("moves a circuit to a free region", async () => {
      await expect(
        service.update("season-2026-eu", { region: "NA", season: 2026 }),
      ).resolves.toMatchObject({
        id: europe.id,
        region: "NA",
      });
    });

    it("lets a circuit keep its own name", async () => {
      await expect(service.update(rlcs.id, { name: "RLCS 2026" })).resolves.toMatchObject({
        id: rlcs.id,
      });
    });

    it("clears the region and the description", async () => {
      await expect(
        service.update(rlcs.id, { description: null, region: null }),
      ).resolves.toMatchObject({
        region: null,
        season: 2026,
        sourceUrl: SOURCE,
      });
    });
  });

  it("validates the season and the rules source", async () => {
    const valid = { name: "x", season: 2026, sourceUrl: SOURCE };
    await expect(service.create({ ...valid, season: 1999 })).rejects.toThrow(InvalidInputError);
    await expect(service.create({ ...valid, season: 2026.5 })).rejects.toThrow(InvalidInputError);

    await Promise.all(
      [
        "",
        " ",
        "ftp://example.org",
        "https://liquipedia.net/rocketleague/RLCS",
        "https://liquipedia-mirror.example/rocketleague/RLCS",
        "https://blast.tv/rl/leaderboard/2026/world-championship/eu",
      ].map(async (sourceUrl) => {
        await expect(service.create({ ...valid, sourceUrl })).rejects.toThrow(InvalidInputError);
      }),
    );
    await expect(service.update(circuitId, { season: 3000 })).rejects.toThrow(InvalidInputError);
    await expect(service.update(circuitId, { sourceUrl: "" })).rejects.toThrow(InvalidInputError);
  });

  it("stores a PandaScore stage scale with its source, sorted", async () => {
    await service.setStageScale(circuitId, "ps-stage", {
      scale: [{ from: 2, points: 6, to: 2 }, ...scale],
      sourceUrl: SOURCE,
    });

    expect(saved.get(`${circuitId}:ps-stage`)).toStrictEqual({
      finishes: [],
      regionTeamIds: [],
      scale: [...scale, { from: 2, points: 6, to: 2 }],
      sourceUrl: SOURCE,
      worldwide: false,
    });
  });

  it("accepts PandaScore and manual stages", async () => {
    await mapSequentially(["ps-stage", "manual-stage"], async (id) => {
      await service.setStageScale(circuitId, id, { scale, sourceUrl: SOURCE });
    });

    expect([...saved.keys()]).toStrictEqual([`${circuitId}:ps-stage`, `${circuitId}:manual-stage`]);
  });

  it("stores the worldwide flag, the region teams and the final placements sorted", async () => {
    await service.setStageScale(circuitId, "ps-stage", {
      finishes: [
        { placement: 13, teamId: "nrg" },
        { placement: 9, teamId: "kc" },
      ],
      regionTeamIds: ["kc", "nrg"],
      scale,
      sourceUrl: SOURCE,
      worldwide: true,
    });

    expect(saved.get(`${circuitId}:ps-stage`)).toMatchObject({
      finishes: [
        { placement: 9, teamId: "kc" },
        { placement: 13, teamId: "nrg" },
      ],
      regionTeamIds: ["kc", "nrg"],
      worldwide: true,
    });
  });

  it("refuses teams outside the event, repeated teams and invalid final placements", async () => {
    const stage = { scale, sourceUrl: SOURCE };

    await Promise.all(
      [
        { regionTeamIds: ["bds"] },
        { regionTeamIds: ["kc", "kc"] },
        { finishes: [{ placement: 9, teamId: "bds" }] },
        {
          finishes: [
            { placement: 9, teamId: "kc" },
            { placement: 13, teamId: "kc" },
          ],
        },
        { finishes: [{ placement: 0, teamId: "kc" }] },
        { finishes: [{ placement: 9.5, teamId: "kc" }] },
      ].map(async (refused) => {
        await expect(
          service.setStageScale(circuitId, "ps-stage", { ...stage, ...refused }),
        ).rejects.toThrow(InvalidInputError);
      }),
    );
    expect(saved.size).toBe(0);
  });

  it("requires an accepted source URL and an existing circuit and tournament", async () => {
    await Promise.all(
      ["", "https://www.blast.tv/rl/leaderboard/2026"].map(async (sourceUrl) => {
        await expect(
          service.setStageScale(circuitId, "ps-stage", { scale, sourceUrl }),
        ).rejects.toThrow(InvalidInputError);
      }),
    );
    await expect(
      service.setStageScale(circuitId, "missing", { scale, sourceUrl: SOURCE }),
    ).rejects.toThrow(NotFoundError);
    await expect(
      service.setStageScale("missing", "ps-stage", { scale, sourceUrl: SOURCE }),
    ).rejects.toThrow(NotFoundError);
    expect(saved.size).toBe(0);
  });

  it("lists the teams of the stage's event for staff", async () => {
    await expect(service.stageTeams(circuitId, "ps-stage")).resolves.toHaveLength(2);
    await expect(service.stageTeams(circuitId, "missing")).rejects.toThrow(NotFoundError);
  });

  it("returns standings computed from the stored stage results", async () => {
    results.push(result({}));

    const standings = await service.standings("season-circuit");

    expect(standings).toMatchObject({
      id: circuitId,
      rows: [{ points: 10, rank: 1, team: { id: "t1" } }],
      sourceUrls: [SOURCE],
    });
  });

  it("counts a manual stage from its staff-entered finishes", async () => {
    results.push(
      result({
        event: { id: "manual", name: "Manual Cup", slug: "manual" },
        finishes: [{ placement: 1, team: team("manual-winner") }],
        placements: [],
      }),
    );

    const standings = await service.standings("season-circuit");

    expect(standings.rows.map(({ team: { id } }) => id)).toStrictEqual(["manual-winner"]);
    expect(standings.events.map(({ event: { id } }) => id)).toStrictEqual(["manual"]);
  });

  it("credits only the circuit region's teams from a worldwide stage", async () => {
    const major = {
      placements: [
        { placement: 1, team: team("na-team") },
        { placement: 2, team: team("eu-team") },
      ],
      regionTeamIds: ["eu-team"],
      scale: [
        { from: 1, points: 30, to: 1 },
        { from: 2, points: 20, to: 2 },
      ],
      worldwide: true,
    };

    results.push(result(major));

    const europe = await service.create({
      name: "RLCS 2026 EU",
      region: "EU",
      season: 2026,
      sourceUrl: SOURCE,
    });

    const standingsResult = await service.standings(europe.id);
    expect(standingsResult.rows.map(({ team: { id } }) => id)).toStrictEqual(["eu-team"]);
    const standingsResult2 = await service.standings(circuitId);
    expect(standingsResult2.rows.map(({ team: { id } }) => id)).toStrictEqual([
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
