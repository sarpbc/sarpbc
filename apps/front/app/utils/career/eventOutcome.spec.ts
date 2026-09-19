import { describe, expect, it } from "vitest";
import { CAREER_EVENTS } from "~/data/career/events";
import {
  WORLD_STRENGTH_BASELINE,
  computeEventFailureChance,
  resolveEventOutcome,
  type EventOutcomeContext,
} from "~/utils/career/eventOutcome";

const alwaysFail = (): number => 0;
const neverFail = (): number => 1;

function context(overrides: Partial<EventOutcomeContext> = {}): EventOutcomeContext {
  return {
    careerId: "career-test",
    eventId: "split-11",
    choiceId: "a",
    season: 1,
    authoredDelta: { rating: 2, form: -1 },
    teamStrength: WORLD_STRENGTH_BASELINE,
    teammateRatings: [WORLD_STRENGTH_BASELINE, WORLD_STRENGTH_BASELINE],
    lastSplitPoints: null,
    missedWorldsLastSeason: false,
    quitLeaning: 0,
    ...overrides,
  };
}

const youngStar = context({
  season: 1,
  teamStrength: 91,
  teammateRatings: [88, 90],
});

const peakWeak = context({
  season: 5,
  teamStrength: 62,
  teammateRatings: [58, 60],
  lastSplitPoints: 10,
});

const pastPeakStruggling = context({
  season: 9,
  teamStrength: 60,
  teammateRatings: [54, 56],
  lastSplitPoints: 8,
  missedWorldsLastSeason: true,
});

describe("computeEventFailureChance", () => {
  it("keeps a young star on a top team near the floor", () => {
    expect(computeEventFailureChance(youngStar)).toBeLessThan(0.08);
  });

  it("raises risk at peak on a weak, struggling roster", () => {
    const chance = computeEventFailureChance(peakWeak);
    expect(chance).toBeGreaterThanOrEqual(0.12);
    expect(chance).toBeLessThanOrEqual(0.35);
    expect(chance).toBeGreaterThan(computeEventFailureChance(youngStar));
  });

  it("fails more often past peak with weak results", () => {
    const pastPeak = computeEventFailureChance(pastPeakStruggling);
    expect(pastPeak).toBeGreaterThan(computeEventFailureChance(peakWeak));
    expect(pastPeak).toBeGreaterThanOrEqual(0.28);
    expect(pastPeak).toBeLessThanOrEqual(0.45);
  });
});

describe("resolveEventOutcome", () => {
  it("leaves the authored delta alone when the roll misses", () => {
    const resolved = resolveEventOutcome(peakWeak, neverFail);
    expect(resolved.failed).toBe(false);
    expect(resolved.delta).toEqual({ rating: 2, form: -1 });
  });

  it("worsens rating below the raw authored delta when malus hits", () => {
    const authored = { rating: 2, form: -1 };
    const resolved = resolveEventOutcome(context({ authoredDelta: authored }), alwaysFail);
    expect(resolved.failed).toBe(true);
    expect(resolved.delta.rating ?? 0).toBeLessThan(authored.rating);
    expect((authored.rating ?? 0) - (resolved.delta.rating ?? 0)).toBeGreaterThanOrEqual(1);
    expect((authored.rating ?? 0) - (resolved.delta.rating ?? 0)).toBeLessThanOrEqual(3);
  });

  it("does not turn a +3 rating into a disaster by default", () => {
    const resolved = resolveEventOutcome(
      context({ authoredDelta: { rating: 3, form: -1 } }),
      alwaysFail,
    );
    expect(resolved.delta.rating ?? 0).toBeGreaterThanOrEqual(0);
  });

  it("is deterministic for the same career, event, and season", () => {
    const first = resolveEventOutcome(pastPeakStruggling);
    const second = resolveEventOutcome(pastPeakStruggling);
    expect(second).toEqual(first);
  });

  it("triggers malus rarely for a young star and often past peak", () => {
    const trials = 400;
    let youngHits = 0;
    let pastPeakHits = 0;
    for (let i = 0; i < trials; i++) {
      const id = `run-${i}`;
      if (resolveEventOutcome(context({ ...youngStar, careerId: id })).failed) {
        youngHits += 1;
      }
      if (resolveEventOutcome(context({ ...pastPeakStruggling, careerId: id })).failed) {
        pastPeakHits += 1;
      }
    }
    expect(youngHits / trials).toBeLessThan(0.12);
    expect(pastPeakHits / trials).toBeGreaterThan(0.25);
    expect(pastPeakHits).toBeGreaterThan(youngHits * 2);
  });
});

describe("authored event deltas", () => {
  it("keeps most deltas at ±1–2, with ±3 and ±5 for heavy training", () => {
    const abs3: string[] = [];
    const abs5: string[] = [];
    const over5: string[] = [];
    for (const event of CAREER_EVENTS) {
      for (const choice of event.choices) {
        for (const key of ["rating", "form", "morale"] as const) {
          const magnitude = Math.abs(choice.delta[key] ?? 0);
          const label = `${event.id}.${choice.id}.${key}`;
          if (magnitude > 5) over5.push(label);
          if (magnitude === 5) abs5.push(label);
          if (magnitude === 3) abs3.push(label);
        }
      }
    }
    expect(over5).toEqual([]);
    expect(abs5).toEqual([
      "split-01.a.rating",
      "split-03.a.rating",
      "split-10.a.rating",
      "split-19.a.rating",
      "split-20.a.rating",
    ]);
    expect(abs3).toEqual(["worlds-03.a.morale", "worlds-04.a.rating", "worlds-06.a.rating"]);
  });

  it("only the all-nighter choice sits the player for regionals", () => {
    const skips = CAREER_EVENTS.flatMap((event) =>
      event.choices
        .filter((choice) => (choice.skipRegionals ?? 0) > 0 || choice.skipMajor)
        .map((choice) => `${event.id}.${choice.id}`),
    );
    expect(skips).toEqual(["split-19.a"]);
  });

  it("charges form on long-hour grinds and restores it on rest", () => {
    const byId = (eventId: string, choiceId: string) => {
      const event = CAREER_EVENTS.find((entry) => entry.id === eventId);
      const choice = event?.choices.find((entry) => entry.id === choiceId);
      return choice?.delta.form ?? 0;
    };

    expect(byId("split-01", "c")).toBeLessThan(0);
    expect(byId("split-03", "a")).toBeLessThan(0);
    expect(byId("split-14", "b")).toBeLessThan(0);
    expect(byId("split-16", "a")).toBeLessThan(0);
    expect(byId("split-19", "a")).toBeLessThan(0);
    expect(byId("split-20", "a")).toBeLessThan(0);
    expect(byId("worlds-01", "a")).toBeLessThan(0);
    expect(byId("worlds-04", "a")).toBeLessThan(0);

    expect(byId("split-03", "c")).toBeGreaterThan(0);
    expect(byId("split-14", "a")).toBeGreaterThan(0);
    expect(byId("split-19", "b")).toBeGreaterThan(0);
    expect(byId("worlds-02", "a")).toBeGreaterThan(0);
  });
});
