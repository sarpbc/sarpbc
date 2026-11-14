import { describe, expect, it } from "vitest";
import { InvalidInputError, NotFoundError } from "../../common/domain/errors";
import {
  careerEarnings,
  careerSources,
  vatira,
  zen,
  zenSeasonAward,
} from "../../../test/career-fixtures";
import { PlayerComparisonService } from "./player-comparison.service";

describe("PlayerComparisonService", () => {
  it("compares the two careers without start.gg competition data", async () => {
    const { sources, playerEarnings } = careerSources();
    const comparison = await new PlayerComparisonService(sources).compare("zen", "vatira");

    expect(comparison.a.player).toBe(zen);
    expect(comparison.b.player).toBe(vatira);
    expect(comparison.a.titles.map(({ id }) => id)).toEqual(["rlcs"]);
    expect(comparison.a.awards.map(({ id }) => id)).toEqual(["major-mvp"]);
    expect(comparison.a.seasonAwards).toEqual([zenSeasonAward]);
    expect(comparison.a.contracts.map(({ id }) => id)).toEqual(["zen-kc"]);
    expect(comparison.a.series).toEqual({ wins: 2, losses: 2 });
    expect(comparison.b.series).toEqual({ wins: 1, losses: 2 });
    expect(comparison.headToHead).toEqual({ a: 1, b: 1 });
    expect(comparison.a.earnings).toEqual(careerEarnings(1500));
    expect(playerEarnings).toHaveBeenCalledWith(zen.id, { redistributableOnly: true });
    expect(playerEarnings).toHaveBeenCalledWith(vatira.id, { redistributableOnly: true });
  });

  it("orders the head-to-head record by the requested sides", async () => {
    const { sources } = careerSources();
    const comparison = await new PlayerComparisonService(sources).compare("vatira", "zen");

    expect(comparison.a.player).toBe(vatira);
    expect(comparison.headToHead).toEqual({ a: 1, b: 1 });
    expect(comparison.b.series).toEqual({ wins: 2, losses: 2 });
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
