import { describe, expect, it } from "vitest";
import { InvalidInputError } from "../../common/domain/errors/invalid-input-error";
import { NotFoundError } from "../../common/domain/errors/not-found-error";
import {
  careerEarnings,
  careerSources,
  vatira,
  zen,
  zenSeasonAward,
} from "../../../test/career-fixtures";
import { PlayerComparisonService } from "./player-comparison.service";

async function compareZenWithVatira() {
  const { sources, playerEarnings } = careerSources();
  const comparison = await new PlayerComparisonService(sources).compare("zen", "vatira");

  return { comparison, playerEarnings };
}

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

    expect(comparison.a.series).toStrictEqual({ wins: 2, losses: 2 });
    expect(comparison.b.series).toStrictEqual({ wins: 1, losses: 2 });
  });

  it("totals earnings from redistributable prizes only", async () => {
    const { comparison, playerEarnings } = await compareZenWithVatira();

    expect(comparison.a.earnings).toStrictEqual(careerEarnings(1500));
    expect(playerEarnings).toHaveBeenCalledWith(zen.id, { redistributableOnly: true });
    expect(playerEarnings).toHaveBeenCalledWith(vatira.id, { redistributableOnly: true });
  });

  it("orders the head-to-head record by the requested sides", async () => {
    const { sources } = careerSources();
    const comparison = await new PlayerComparisonService(sources).compare("vatira", "zen");

    expect(comparison.a.player).toBe(vatira);
    expect(comparison.headToHead).toStrictEqual({ a: 1, b: 1 });
    expect(comparison.b.series).toStrictEqual({ wins: 2, losses: 2 });
  });

  it("rejects a player compared with themselves", async () => {
    const { sources } = careerSources();

    await expect(new PlayerComparisonService(sources).compare("zen", "zen")).rejects.toThrow(
      InvalidInputError,
    );
  });

  it("rejects two slugs that resolve to the same merged player", async () => {
    const { sources } = careerSources();

    const merged = {
      ...sources,
      players: { findBySlug: async () => zen },
    };

    await expect(new PlayerComparisonService(merged).compare("zen", "zen-old")).rejects.toThrow(
      InvalidInputError,
    );
  });

  it("reports an unknown player", async () => {
    const { sources } = careerSources();

    await expect(new PlayerComparisonService(sources).compare("zen", "ghost")).rejects.toThrow(
      NotFoundError,
    );
  });
});
