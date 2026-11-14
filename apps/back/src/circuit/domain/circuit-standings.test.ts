import type { CircuitScaleTier, TournamentEventRef } from "@sarpbc/types";
import { describe, expect, it } from "vitest";
import { computeCircuitStandings } from "./circuit-standings";
import type { CircuitStageResult } from "./circuit-standings";

const now = new Date("2026-06-01T00:00:00Z");
const past = (day: number) => new Date(`2026-0${day}-01T00:00:00Z`);
const future = new Date("2026-09-01T00:00:00Z");

const scale: CircuitScaleTier[] = [
  { from: 1, to: 1, points: 10 },
  { from: 2, to: 2, points: 6 },
  { from: 3, to: 4, points: 3 },
];

const event = (id: string): TournamentEventRef => ({ id, slug: id, name: `Event ${id}` });

const team = (id: string) => ({
  id,
  name: id.toUpperCase(),
  slug: id,
  imageUrl: null,
  darkModeImageUrl: null,
});

const stage = (overrides: Partial<CircuitStageResult> & { event: TournamentEventRef }) => ({
  beginAt: past(1),
  endAt: past(2),
  scale,
  sourceUrl: "https://example.org/rules",
  worldwide: false,
  regionTeamIds: [],
  placements: [],
  finishes: [],
  ...overrides,
});

describe(computeCircuitStandings, () => {
  it("adds the points of each placement and breaks the total down by event", () => {
    const { rows, events } = computeCircuitStandings(
      [
        stage({
          event: event("a"),
          placements: [
            { team: team("kc"), placement: 1 },
            { team: team("bds"), placement: 2 },
          ],
        }),
        stage({
          event: event("b"),
          beginAt: past(3),
          endAt: past(4),
          placements: [
            { team: team("bds"), placement: 1 },
            { team: team("kc"), placement: 3 },
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
        rank: 1,
        points: 16,
        team: team("bds"),
        events: [
          { eventId: "a", points: 6, placement: 2 },
          { eventId: "b", points: 10, placement: 1 },
        ],
      },
      {
        rank: 2,
        points: 13,
        team: team("kc"),
        events: [
          { eventId: "a", points: 10, placement: 1 },
          { eventId: "b", points: 3, placement: 3 },
        ],
      },
    ]);
  });

  it("gives tied placements the same tier and tied totals the same rank", () => {
    const { rows } = computeCircuitStandings(
      [
        stage({
          event: event("a"),
          placements: [
            { team: team("vit"), placement: 1 },
            { team: team("kc"), placement: 3 },
            { team: team("bds"), placement: 3 },
            { team: team("g2"), placement: 5 },
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
      [stage({ event: event("a"), scale: [], placements: [{ team: team("kc"), placement: 1 }] })],
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
        event: event("a"),
        beginAt: past(1).toISOString(),
        endAt: past(2).toISOString(),
        status: "awaiting_results",
      },
    ]);
  });

  it("counts only stages that have ended", () => {
    const placements = [{ team: team("kc"), placement: 1 }];

    const { rows, events } = computeCircuitStandings(
      [
        stage({ event: event("live"), endAt: future, placements }),
        stage({ event: event("next"), beginAt: future, endAt: null, placements }),
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
          scale: [{ from: 9, to: 16, points: 1 }],
          placements: [{ team: team("kc"), placement: 9 }],
        }),
        stage({ event: event("a"), placements: [{ team: team("kc"), placement: 2 }] }),
      ],
      null,
      now,
    );

    expect(rows[0]?.events).toStrictEqual([{ eventId: "a", points: 7, placement: 2 }]);
    expect(sourceUrls).toStrictEqual(["https://example.org/rules"]);
  });
});

const totals = (stages: CircuitStageResult[], region: string | null) =>
  computeCircuitStandings(stages, region, now).rows.map(({ team: { id }, points }) => [id, points]);

describe("computeCircuitStandings in a regional circuit", () => {
  const majorScale: CircuitScaleTier[] = [
    { from: 1, to: 1, points: 30 },
    { from: 2, to: 2, points: 20 },
    { from: 3, to: 4, points: 14 },
    { from: 13, to: 16, points: 3 },
  ];

  const major = (overrides: Partial<CircuitStageResult> = {}) =>
    stage({
      event: event("major"),
      scale: majorScale,
      worldwide: true,
      regionTeamIds: ["kc", "vit"],
      placements: [
        { team: team("nrg"), placement: 1 },
        { team: team("kc"), placement: 2 },
        { team: team("vit"), placement: 3 },
        { team: team("flcn"), placement: 4 },
      ],
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
              { team: team("kc"), placement: 1 },
              { team: team("vit"), placement: 2 },
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
            placements: [],
            finishes: [
              { team: team("kc"), placement: 13 },
              { team: team("nrg"), placement: 13 },
            ],
          }),
        ],
        "EU",
      ),
    ).toStrictEqual([["kc", 3]]);
  });
});

describe("computeCircuitStandings with places decided in groups", () => {
  const openScale: CircuitScaleTier[] = [
    { from: 1, to: 1, points: 15 },
    { from: 2, to: 2, points: 10 },
    { from: 3, to: 4, points: 7 },
    { from: 5, to: 6, points: 5 },
    { from: 7, to: 8, points: 3 },
    { from: 9, to: 12, points: 2 },
    { from: 13, to: 16, points: 1 },
  ];

  const playoffTeams = ["p1", "p2", "p3", "p4", "p5", "p6", "p7", "p8"];

  const groupFinishes = [
    ...["g9", "g10", "g11", "g12"].map((id) => ({ team: team(id), placement: 9 })),
    ...["g13", "g14", "g15", "g16"].map((id) => ({ team: team(id), placement: 13 })),
  ];

  const playoffs = stage({
    event: event("open"),
    scale: openScale,
    placements: [1, 2, 3, 3, 5, 5, 7, 7].map((placement, index) => ({
      team: team(playoffTeams[index] ?? ""),
      placement,
    })),
    finishes: groupFinishes,
  });

  const playoffStandings = () => {
    const { rows } = computeCircuitStandings([playoffs], null, now);
    const points = Object.fromEntries(rows.map(({ team: { id }, points: total }) => [id, total]));

    return { rows, points };
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
      { eventId: "open", points: 2, placement: 9 },
    ]);
  });

  it("lets a staff-entered event placement replace the stage placement of the same team", () => {
    const { rows } = computeCircuitStandings(
      [
        stage({
          event: event("open"),
          scale: openScale,
          placements: [{ team: team("kc"), placement: 3 }],
          finishes: [{ team: team("kc"), placement: 9 }],
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
      [stage({ event: event("manual"), finishes: [{ team: team("kc"), placement: 1 }] })],
      null,
      now,
    );

    expect(rows.map(({ team: { id }, points }) => [id, points])).toStrictEqual([["kc", 10]]);
    expect(events[0]?.status).toBe("counted");
  });
});
