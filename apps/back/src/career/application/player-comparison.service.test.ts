import { describe, expect, it } from "vitest";
import { InvalidInputError } from "../../common/domain/errors/invalid-input-error";
import { NotFoundError } from "../../common/domain/errors/not-found-error";
import {
  careerEarnings,
  careerMatch,
  careerSources,
  vatira,
  zen,
  zenSeasonAward,
} from "../../../test/career.fixture";
import { PlayerComparisonService } from "./player-comparison.service";

const compareZenWithVatira = async () => {
  const { sources } = careerSources();

  return { comparison: await new PlayerComparisonService(sources).compare("zen", "vatira", null) };
};

describe(PlayerComparisonService, () => {
  it("compares the two players", async () => {
    const { comparison } = await compareZenWithVatira();

    expect(comparison.a.player).toBe(zen);
    expect(comparison.b.player).toBe(vatira);
    expect(comparison.headToHead).toStrictEqual({ a: 1, b: 1 });
  });

  it("lists the first player's titles, awards and contracts", async () => {
    const { comparison } = await compareZenWithVatira();

    expect(comparison.a.titles.map(({ id }) => id)).toStrictEqual(["rlcs"]);
    expect(comparison.a.awards.map(({ id }) => id)).toStrictEqual(["major-mvp"]);
    expect(comparison.a.seasonAwards).toStrictEqual([zenSeasonAward]);
    expect(comparison.a.contracts.map(({ id }) => id)).toStrictEqual(["zen-kc"]);
  });

  it("counts each player's series record", async () => {
    const { comparison } = await compareZenWithVatira();

    expect(comparison.a.series).toStrictEqual({ losses: 2, wins: 2 });
    expect(comparison.b.series).toStrictEqual({ losses: 2, wins: 1 });
  });

  it("totals earnings from redistributable prizes only", async () => {
    const { comparison } = await compareZenWithVatira();

    expect(comparison.a.earnings).toStrictEqual(careerEarnings(1500));
  });

  it("orders the head-to-head record by the requested sides", async () => {
    const { sources } = careerSources();
    const comparison = await new PlayerComparisonService(sources).compare("vatira", "zen", null);

    expect(comparison.a.player).toBe(vatira);
    expect(comparison.headToHead).toStrictEqual({ a: 1, b: 1 });
    expect(comparison.b.series).toStrictEqual({ losses: 2, wins: 2 });
  });

  it("keeps only the Open era titles, series, awards and teams", async () => {
    const { sources } = careerSources();
    const comparison = await new PlayerComparisonService(sources).compare("zen", "vatira", "open");

    expect(comparison.a.titles.map(({ id }) => id)).toStrictEqual(["rlcs"]);
    expect(comparison.a.series).toStrictEqual({ losses: 2, wins: 2 });
    expect(comparison.headToHead).toStrictEqual({ a: 1, b: 1 });
    expect(comparison.a.awards.map(({ id }) => id)).toStrictEqual(["major-mvp"]);
    expect(comparison.a.contracts.map(({ id }) => id)).toStrictEqual(["zen-kc"]);
  });

  it("leaves undated season awards out of an era", async () => {
    const { sources } = careerSources();
    const comparison = await new PlayerComparisonService(sources).compare("zen", "vatira", "open");

    expect(comparison.a.seasonAwards).toStrictEqual([]);
  });

  it("counts only the series played before the Open era", async () => {
    const { sources } = careerSources();

    const season9 = careerMatch({
      id: "season-9",
      playedAt: "2020-03-01T00:00:00.000Z",
      sides: [[vatira], [zen]],
      winner: 0,
    });

    const before = {
      ...sources,
      matches: {
        getMatchesByPlayer: async (playerId: string) => [
          ...(await sources.matches.getMatchesByPlayer(playerId)),
          season9,
        ],
      },
    };

    const comparison = await new PlayerComparisonService(before).compare(
      "zen",
      "vatira",
      "pre-open",
    );

    expect(comparison.a.series).toStrictEqual({ losses: 1, wins: 0 });
    expect(comparison.headToHead).toStrictEqual({ a: 0, b: 1 });
    expect(comparison.a.titles).toStrictEqual([]);
    expect(comparison.a.awards).toStrictEqual([]);
    expect(comparison.a.contracts).toStrictEqual([]);
  });

  it.each([
    ["open" as const, { era: "open", redistributableOnly: true }],
    [null, { era: null, redistributableOnly: true }],
  ])("reads the earnings of the %s era", async (era, scope) => {
    const { earningsScopes, sources } = careerSources();
    await new PlayerComparisonService(sources).compare("zen", "vatira", era);

    expect(earningsScopes).toContainEqual(scope);
  });

  it("rejects a player compared with themselves", async () => {
    const { sources } = careerSources();

    await expect(new PlayerComparisonService(sources).compare("zen", "zen", null)).rejects.toThrow(
      InvalidInputError,
    );
  });

  it("rejects two slugs that resolve to the same merged player", async () => {
    const { sources } = careerSources();

    const merged = {
      ...sources,
      players: { findBySlug: async () => zen },
    };

    await expect(
      new PlayerComparisonService(merged).compare("zen", "zen-old", null),
    ).rejects.toThrow(InvalidInputError);
  });

  it("reports an unknown player", async () => {
    const { sources } = careerSources();

    await expect(
      new PlayerComparisonService(sources).compare("zen", "ghost", null),
    ).rejects.toThrow(NotFoundError);
  });
});
