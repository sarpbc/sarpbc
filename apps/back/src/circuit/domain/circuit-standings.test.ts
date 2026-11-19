import type { CircuitScaleTier, TournamentEventRef } from "@sarpbc/types";
import { describe, expect, it } from "vitest";
import { computeCircuitStandings } from "./circuit-standings";
import type { CircuitStageResult } from "./circuit-standings";

const now = new Date("2026-06-01T00:00:00Z");
const past = (day: number) => new Date(`2026-0${day}-01T00:00:00Z`);
const future = new Date("2026-09-01T00:00:00Z");

const scale: CircuitScaleTier[] = [
  { from: 1, points: 10, to: 1 },
  { from: 2, points: 6, to: 2 },
  { from: 3, points: 3, to: 4 },
];

const event = (id: string) => ({ id, name: `Event ${id}`, slug: id });

const team = (id: string) => ({
  darkModeImageUrl: null,
  id,
  imageUrl: null,
  name: id.toUpperCase(),
  slug: id,
});

const stage = (overrides: Partial<CircuitStageResult> & { event: TournamentEventRef }) => ({
  beginAt: past(1),
  endAt: past(2),
  finishes: [],
  placements: [],
  regionTeamIds: [],
  scale,
  sourceUrl: "https://example.org/rules",
  worldwide: false,
  ...overrides,
});

describe(computeCircuitStandings, () => {
  it("adds the points of each placement and breaks the total down by event", () => {
    const { rows, events } = computeCircuitStandings(
      [
        stage({
          event: event("a"),
          placements: [
            { placement: 1, team: team("kc") },
            { placement: 2, team: team("bds") },
          ],
        }),
        stage({
          beginAt: past(3),
          endAt: past(4),
          event: event("b"),
          placements: [
            { placement: 1, team: team("bds") },
            { placement: 3, team: team("kc") },
          ],
        }),
      ],
      null,
      now,
    );

    expect(events.map(({ event: { id }, status }) => [id, status])).toStrictEqual([
      ["a", "counted"],
      ["b", "counted"],
    ]);
    expect(rows).toStrictEqual([
      {
        events: [
          { eventId: "a", placement: 2, points: 6 },
          { eventId: "b", placement: 1, points: 10 },
        ],
        points: 16,
        rank: 1,
        team: team("bds"),
      },
      {
        events: [
          { eventId: "a", placement: 1, points: 10 },
          { eventId: "b", placement: 3, points: 3 },
        ],
        points: 13,
        rank: 2,
        team: team("kc"),
      },
    ]);
  });

  it("gives tied placements the same tier and tied totals the same rank", () => {
    const { rows } = computeCircuitStandings(
      [
        stage({
          event: event("a"),
          placements: [
            { placement: 1, team: team("vit") },
            { placement: 3, team: team("kc") },
            { placement: 3, team: team("bds") },
            { placement: 5, team: team("g2") },
          ],
        }),
      ],
      null,
      now,
    );

    expect(rows.map(({ rank, team: { id }, points }) => [rank, id, points])).toStrictEqual([
      [1, "vit", 10],
      [2, "bds", 3],
      [2, "kc", 3],
    ]);
  });

  it("awards nothing for a stage whose scale is missing", () => {
    const { rows, events } = computeCircuitStandings(
      [stage({ event: event("a"), placements: [{ placement: 1, team: team("kc") }], scale: [] })],
      null,
      now,
    );

    expect(rows).toStrictEqual([]);
    expect(events[0]?.status).toBe("scale_missing");
  });

  it("keeps an ended event without results in the list without awarding points", () => {
    const { rows, events } = computeCircuitStandings([stage({ event: event("a") })], null, now);

    expect(rows).toStrictEqual([]);
    expect(events).toStrictEqual([
      {
        beginAt: past(1).toISOString(),
        endAt: past(2).toISOString(),
        event: event("a"),
        status: "awaiting_results",
      },
    ]);
  });

  it("counts only stages that have ended", () => {
    const placements = [{ placement: 1, team: team("kc") }];

    const { rows, events } = computeCircuitStandings(
      [
        stage({ endAt: future, event: event("live"), placements }),
        stage({ beginAt: future, endAt: null, event: event("next"), placements }),
      ],
      null,
      now,
    );

    expect(rows).toStrictEqual([]);
    expect(events.map(({ event: { id }, status }) => [id, status])).toStrictEqual([
      ["live", "in_progress"],
      ["next", "upcoming"],
    ]);
  });

  it("sums the stages of one event and lists each scale source once", () => {
    const { rows, sourceUrls } = computeCircuitStandings(
      [
        stage({
          event: event("a"),
          placements: [{ placement: 9, team: team("kc") }],
          scale: [{ from: 9, points: 1, to: 16 }],
        }),
        stage({ event: event("a"), placements: [{ placement: 2, team: team("kc") }] }),
      ],
      null,
      now,
    );

    expect(rows[0]?.events).toStrictEqual([{ eventId: "a", placement: 2, points: 7 }]);
    expect(sourceUrls).toStrictEqual(["https://example.org/rules"]);
  });
});

const totals = (stages: CircuitStageResult[], region: string | null) =>
  computeCircuitStandings(stages, region, now).rows.map(({ team: { id }, points }) => [id, points]);

describe("computeCircuitStandings in a regional circuit", () => {
  const majorScale: CircuitScaleTier[] = [
    { from: 1, points: 30, to: 1 },
    { from: 2, points: 20, to: 2 },
    { from: 3, points: 14, to: 4 },
    { from: 13, points: 3, to: 16 },
  ];

  const major = (overrides: Partial<CircuitStageResult> = {}) =>
    stage({
      event: event("major"),
      placements: [
        { placement: 1, team: team("nrg") },
        { placement: 2, team: team("kc") },
        { placement: 3, team: team("vit") },
        { placement: 4, team: team("flcn") },
      ],
      regionTeamIds: ["kc", "vit"],
      scale: majorScale,
      worldwide: true,
      ...overrides,
    });

  it("credits only the region teams listed on a worldwide stage", () => {
    expect(totals([major()], "EU")).toStrictEqual([
      ["kc", 20],
      ["vit", 14],
    ]);
  });

  it("credits every team of a worldwide stage in a worldwide circuit", () => {
    for (const region of [null, "Worldwide"]) {
      expect(totals([major()], region)).toStrictEqual([
        ["nrg", 30],
        ["kc", 20],
        ["flcn", 14],
        ["vit", 14],
      ]);
    }
  });

  it("credits nobody from a worldwide stage whose region teams are not entered yet", () => {
    expect(totals([major({ regionTeamIds: [] })], "NA")).toStrictEqual([]);
  });

  it("credits every placed team of a stage of the circuit's own region", () => {
    expect(
      totals(
        [
          stage({
            event: event("open"),
            placements: [
              { placement: 1, team: team("kc") },
              { placement: 2, team: team("vit") },
            ],
          }),
        ],
        "EU",
      ),
    ).toStrictEqual([
      ["kc", 10],
      ["vit", 6],
    ]);
  });

  it("filters staff-entered group finishes by region too", () => {
    expect(
      totals(
        [
          major({
            finishes: [
              { placement: 13, team: team("kc") },
              { placement: 13, team: team("nrg") },
            ],
            placements: [],
          }),
        ],
        "EU",
      ),
    ).toStrictEqual([["kc", 3]]);
  });
});

describe("computeCircuitStandings with places decided in groups", () => {
  const openScale: CircuitScaleTier[] = [
    { from: 1, points: 15, to: 1 },
    { from: 2, points: 10, to: 2 },
    { from: 3, points: 7, to: 4 },
    { from: 5, points: 5, to: 6 },
    { from: 7, points: 3, to: 8 },
    { from: 9, points: 2, to: 12 },
    { from: 13, points: 1, to: 16 },
  ];

  const playoffTeams = ["p1", "p2", "p3", "p4", "p5", "p6", "p7", "p8"];

  const groupFinishes = [
    ...["g9", "g10", "g11", "g12"].map((id) => ({ placement: 9, team: team(id) })),
    ...["g13", "g14", "g15", "g16"].map((id) => ({ placement: 13, team: team(id) })),
  ];

  const playoffs = stage({
    event: event("open"),
    finishes: groupFinishes,
    placements: [1, 2, 3, 3, 5, 5, 7, 7].map((placement, index) => ({
      placement,
      team: team(playoffTeams[index] ?? ""),
    })),
    scale: openScale,
  });

  const playoffStandings = () => {
    const { rows } = computeCircuitStandings([playoffs], null, now);
    const points = Object.fromEntries(rows.map(({ team: { id }, points: total }) => [id, total]));

    return { points, rows };
  };

  it("awards the 9th-12th and 13th-16th bands from staff-entered event placements", () => {
    const { rows, points } = playoffStandings();

    expect(rows).toHaveLength(16);
    expect(["g9", "g10", "g11", "g12"].map((id) => points[id])).toStrictEqual([2, 2, 2, 2]);
    expect(["g13", "g14", "g15", "g16"].map((id) => points[id])).toStrictEqual([1, 1, 1, 1]);
  });

  it("keeps the top placements and records each staff-entered event placement", () => {
    const { rows, points } = playoffStandings();

    expect(points.p1).toBe(15);
    expect(points.p8).toBe(3);
    expect(rows.find(({ team: { id } }) => id === "g9")?.events).toStrictEqual([
      { eventId: "open", placement: 9, points: 2 },
    ]);
  });

  it("lets a staff-entered event placement replace the stage placement of the same team", () => {
    const { rows } = computeCircuitStandings(
      [
        stage({
          event: event("open"),
          finishes: [{ placement: 9, team: team("kc") }],
          placements: [{ placement: 3, team: team("kc") }],
          scale: openScale,
        }),
      ],
      null,
      now,
    );

    expect(rows.map(({ points }) => points)).toStrictEqual([2]);
  });

  it("does not score group-stage placements unless that stage is attached", () => {
    const { rows } = computeCircuitStandings([stage({ ...playoffs, finishes: [] })], null, now);

    expect(rows).toHaveLength(8);
    expect(rows.every(({ team: { id } }) => playoffTeams.includes(id))).toBe(true);
  });

  it("counts a stage whose only placements are entered by staff, such as a manual stage", () => {
    const { rows, events } = computeCircuitStandings(
      [stage({ event: event("manual"), finishes: [{ placement: 1, team: team("kc") }] })],
      null,
      now,
    );

    expect(rows.map(({ team: { id }, points }) => [id, points])).toStrictEqual([["kc", 10]]);
    expect(events[0]?.status).toBe("counted");
  });
});
