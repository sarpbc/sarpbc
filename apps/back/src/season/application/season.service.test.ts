import type { SeasonAward, SeasonSummary } from "@sarpbc/types";
import { beforeEach, describe, expect, it } from "vitest";
import { ConflictError, InvalidInputError, NotFoundError } from "../../common/domain/errors";
import type { SeasonAwardFields } from "../domain/season-award";
import type { SeasonAwardPlayer, SeasonStore } from "./ports";
import { SeasonService } from "./season.service";

const ANNOUNCEMENT = "https://x.com/RLEsports/status/1";

interface StoredAward extends SeasonAward {
  seasonId: string;
}

function memoryStore() {
  const seasons = new Map<string, SeasonSummary>();
  const awards: StoredAward[] = [];
  const players = new Map<string, SeasonAwardPlayer>([
    ["zen", { id: "zen", name: "zen", mergedIntoId: null }],
    ["vatira", { id: "vatira", name: "Vatira", mergedIntoId: null }],
    ["old-zen", { id: "old-zen", name: "zen", mergedIntoId: "zen" }],
  ]);
  const strip = (award: StoredAward): SeasonAward => ({
    id: award.id,
    awardType: award.awardType,
    region: award.region,
    presentedBy: award.presentedBy,
    sourceUrl: award.sourceUrl,
    player: award.player,
  });
  const store: SeasonStore = {
    list: async () => [...seasons.values()],
    find: async (id) => seasons.get(id) ?? null,
    nameTaken: async (name, exceptId) =>
      [...seasons.values()].some((season) => season.name === name && season.id !== exceptId),
    save: async (season) => {
      seasons.set(season.id, season);
    },
    remove: async (id) => seasons.delete(id),
    awards: async (seasonId) => awards.filter((award) => award.seasonId === seasonId).map(strip),
    awardsOfPlayer: async (playerId) =>
      awards
        .filter((award) => award.player.id === playerId)
        .flatMap((award) => {
          const season = seasons.get(award.seasonId);
          const { id, awardType, region, presentedBy, sourceUrl } = award;
          return season ? [{ id, awardType, region, presentedBy, sourceUrl, season }] : [];
        }),
    player: async (id) => players.get(id) ?? null,
    awardTaken: async (seasonId, { awardType, region }) =>
      awards.some(
        (award) =>
          award.seasonId === seasonId && award.awardType === awardType && award.region === region,
      ),
    saveAward: async (seasonId, playerId, fields: SeasonAwardFields) => {
      const award: StoredAward = {
        ...fields,
        id: `award-${awards.length + 1}`,
        seasonId,
        player: { id: playerId, name: playerId, slug: playerId },
      };
      awards.push(award);
      return strip(award);
    },
    removeAward: async (seasonId, awardId) => {
      const index = awards.findIndex(
        (award) => award.seasonId === seasonId && award.id === awardId,
      );
      if (index < 0) return false;
      awards.splice(index, 1);
      return true;
    },
  };
  return { store, awards };
}

describe("SeasonService", () => {
  let service: SeasonService;
  let season: SeasonSummary;

  beforeEach(async () => {
    service = new SeasonService(memoryStore().store);
    season = await service.create({ name: "  RLCS 2024 " });
  });

  it("creates a season with a trimmed, unique name", async () => {
    expect(season.name).toBe("RLCS 2024");
    await expect(service.create({ name: "RLCS 2024" })).rejects.toBeInstanceOf(ConflictError);
    await expect(service.create({ name: "   " })).rejects.toBeInstanceOf(InvalidInputError);
    expect(await service.update(season.id, { name: "RLCS 2024" })).toEqual(season);
  });

  it("records a Season MVP presented by a partner", async () => {
    const award = await service.addAward(season.id, {
      playerId: "zen",
      awardType: "season_mvp",
      presentedBy: " Ally ",
      sourceUrl: ANNOUNCEMENT,
    });

    expect(award).toMatchObject({
      awardType: "season_mvp",
      region: null,
      presentedBy: "Ally",
      sourceUrl: ANNOUNCEMENT,
    });
    expect(await service.awardsOfPlayer("zen")).toEqual([
      expect.objectContaining({ id: award.id, season }),
    ]);
  });

  it("holds one Regional MVP per region and one of every other type", async () => {
    const regional = (playerId: string, region: string) =>
      service.addAward(season.id, {
        playerId,
        awardType: "regional_mvp",
        region,
        sourceUrl: ANNOUNCEMENT,
      });
    await regional("zen", "Europe");
    await regional("vatira", "North America");
    await expect(regional("vatira", "Europe")).rejects.toThrow(
      "RLCS 2024 already has a Regional MVP for Europe",
    );

    const seasonMvp = () =>
      service.addAward(season.id, {
        playerId: "zen",
        awardType: "season_mvp",
        sourceUrl: ANNOUNCEMENT,
      });
    await seasonMvp();
    await expect(seasonMvp()).rejects.toBeInstanceOf(ConflictError);
    expect((await service.detail(season.id)).awards).toHaveLength(3);
  });

  it("requires a region for a Regional MVP and refuses one for a Season MVP", async () => {
    await expect(
      service.addAward(season.id, {
        playerId: "zen",
        awardType: "regional_mvp",
        region: " ",
        sourceUrl: ANNOUNCEMENT,
      }),
    ).rejects.toThrow("A Regional MVP names its region.");
    await expect(
      service.addAward(season.id, {
        playerId: "zen",
        awardType: "season_mvp",
        region: "Europe",
        sourceUrl: ANNOUNCEMENT,
      }),
    ).rejects.toThrow("covers the whole season");
    await expect(
      service.addAward(season.id, {
        playerId: "zen",
        awardType: "regular_season_mvp",
        sourceUrl: ANNOUNCEMENT,
      }),
    ).resolves.toMatchObject({ region: null });
  });

  it("refuses Liquipedia and non-http sources", async () => {
    for (const sourceUrl of [
      "https://liquipedia.net/rocketleague/Rocket_League_Championship_Series/2024",
      "ftp://rlesports.com/award",
    ])
      await expect(
        service.addAward(season.id, { playerId: "zen", awardType: "season_mvp", sourceUrl }),
      ).rejects.toBeInstanceOf(InvalidInputError);
  });

  it("refuses unknown seasons and players and merged player ids", async () => {
    const input = { playerId: "zen", awardType: "season_mvp" as const, sourceUrl: ANNOUNCEMENT };
    await expect(service.addAward("missing", input)).rejects.toBeInstanceOf(NotFoundError);
    await expect(
      service.addAward(season.id, { ...input, playerId: "ghost" }),
    ).rejects.toBeInstanceOf(NotFoundError);
    await expect(service.addAward(season.id, { ...input, playerId: "old-zen" })).rejects.toThrow(
      'was merged into "zen"',
    );
  });

  it("removes awards and seasons", async () => {
    const award = await service.addAward(season.id, {
      playerId: "zen",
      awardType: "season_mvp",
      sourceUrl: ANNOUNCEMENT,
    });
    await service.removeAward(season.id, award.id);
    await expect(service.removeAward(season.id, award.id)).rejects.toBeInstanceOf(NotFoundError);
    await service.remove(season.id);
    await expect(service.detail(season.id)).rejects.toBeInstanceOf(NotFoundError);
  });
});
