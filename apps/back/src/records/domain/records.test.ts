import { describe, expect, it } from "vitest";
import { ageOn, countTitles, longestWinStreaks, rankTop } from "./records";

const day = (year: number, month: number, dayOfMonth: number) => ({
  day: dayOfMonth,
  month,
  year,
});

describe(rankTop, () => {
  const candidates = [
    { holder: "c", name: "Charlie", value: 3 },
    { holder: "a", name: "Alpha", value: 5 },
    { holder: "b", name: "Bravo", value: 3 },
    { holder: "d", name: "Delta", value: 1 },
  ];

  it("ranks the most first, shares a rank on equal values and orders ties by name", () => {
    expect(rankTop(candidates, "most", 10)).toStrictEqual([
      { holder: "a", rank: 1, value: 5 },
      { holder: "b", rank: 2, value: 3 },
      { holder: "c", rank: 2, value: 3 },
      { holder: "d", rank: 4, value: 1 },
    ]);
  });

  it("ranks the fewest first and keeps the table size", () => {
    expect(rankTop(candidates, "fewest", 2)).toStrictEqual([
      { holder: "d", rank: 1, value: 1 },
      { holder: "b", rank: 2, value: 3 },
    ]);
  });
});

describe(countTitles, () => {
  it("counts each holder once per title", () => {
    const vatira = { id: "p1", name: "Vatira" };
    const zen = { id: "p2", name: "zen" };

    expect(countTitles([[vatira, zen], [vatira, vatira], []])).toStrictEqual([
      { holder: vatira, name: "Vatira", value: 2 },
      { holder: zen, name: "zen", value: 1 },
    ]);
  });
});

const series = (
  at: string,
  order: number,
  winnerTeamId: string | null,
  loserTeamId: string | null,
) => ({ endAt: new Date(at), loserTeamId, order, winnerTeamId });

describe(longestWinStreaks, () => {
  it("keeps each team's longest run of series wins in chronological order", () => {
    const streaks = longestWinStreaks([
      series("2024-01-04T00:00:00Z", 4, "a", "b"),
      series("2024-01-01T00:00:00Z", 1, "a", "b"),
      series("2024-01-02T00:00:00Z", 2, "a", "c"),
      series("2024-01-03T00:00:00Z", 3, "c", "a"),
      series("2024-01-05T00:00:00Z", 5, "b", null),
    ]);

    expect(streaks).toStrictEqual([
      {
        from: new Date("2024-01-01T00:00:00Z"),
        series: 2,
        teamId: "a",
        to: new Date("2024-01-02T00:00:00Z"),
      },
      {
        from: new Date("2024-01-03T00:00:00Z"),
        series: 1,
        teamId: "c",
        to: new Date("2024-01-03T00:00:00Z"),
      },
      {
        from: new Date("2024-01-05T00:00:00Z"),
        series: 1,
        teamId: "b",
        to: new Date("2024-01-05T00:00:00Z"),
      },
    ]);
  });

  it("orders series ending together by their public order and keeps the first longest run", () => {
    const streaks = longestWinStreaks([
      series("2024-01-01T00:00:00Z", 2, "b", "a"),
      series("2024-01-01T00:00:00Z", 1, "a", "b"),
      series("2024-01-02T00:00:00Z", 3, "a", "b"),
    ]);

    expect(streaks.find(({ teamId }) => teamId === "a")).toMatchObject({
      from: new Date("2024-01-01T00:00:00Z"),
      series: 1,
    });
    expect(streaks.find(({ teamId }) => teamId === "b")).toMatchObject({
      from: new Date("2024-01-01T00:00:00Z"),
      series: 1,
    });
  });

  it("lets a loss against a mixed side break the run", () => {
    const streaks = longestWinStreaks([
      series("2024-01-01T00:00:00Z", 1, "a", null),
      series("2024-01-02T00:00:00Z", 2, null, "a"),
      series("2024-01-03T00:00:00Z", 3, "a", null),
    ]);

    expect(streaks).toMatchObject([{ series: 1, teamId: "a" }]);
  });
});

describe(ageOn, () => {
  it("counts whole years and the days since the last birthday", () => {
    expect(ageOn(day(2004, 6, 10), day(2021, 6, 9))).toStrictEqual({
      days: 364,
      totalDays: 6208,
      years: 16,
    });
    expect(ageOn(day(2004, 6, 10), day(2021, 6, 10))).toMatchObject({ days: 0, years: 17 });
  });

  it("celebrates a February 29 birthday on March 1 in a common year", () => {
    expect(ageOn(day(2004, 2, 29), day(2021, 2, 28))).toMatchObject({ years: 16 });
    expect(ageOn(day(2004, 2, 29), day(2021, 3, 1))).toMatchObject({ days: 0, years: 17 });
  });
});
