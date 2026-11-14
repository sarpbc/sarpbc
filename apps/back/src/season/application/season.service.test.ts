import type { SeasonDetail } from "@sarpbc/types";
import { beforeEach, describe, expect, it } from "vitest";
import { memorySeasonStore } from "../../../test/season-store.memory";
import { ConflictError } from "../../common/domain/errors/conflict-error";
import { InvalidInputError } from "../../common/domain/errors/invalid-input-error";
import { NotFoundError } from "../../common/domain/errors/not-found-error";
import { SeasonArchiveService } from "./season-archive.service";
import { SeasonService } from "./season.service";

const ANNOUNCEMENT = "https://x.com/RLEsports/status/1";

describe(SeasonService, () => {
  let service: SeasonService;
  let archives: SeasonArchiveService;
  let season: SeasonDetail;

  beforeEach(async () => {
    const { store } = memorySeasonStore();
    service = new SeasonService(store);
    archives = new SeasonArchiveService(store);
    season = await service.create({ name: "  RLCS 2024 " });
  });

  it("creates a season with a trimmed, unique name and an empty archive", async () => {
    expect(season).toMatchObject({
      awards: [],
      format: { phases: [], summary: null },
      name: "RLCS 2024",
      participants: [],
      slug: null,
      winnerTeamId: null,
    });
    await expect(service.create({ name: "RLCS 2024" })).rejects.toBeInstanceOf(ConflictError);
    await expect(service.create({ name: "   " })).rejects.toBeInstanceOf(InvalidInputError);
    await expect(service.update(season.id, { name: "RLCS 2024" })).resolves.toStrictEqual(season);
  });

  it("normalises the public slug and keeps it unique across seasons", async () => {
    const published = await service.update(season.id, { name: "RLCS 2024", slug: " RLCS 2024 " });
    expect(published.slug).toBe("rlcs-2024");
    await expect(service.update(season.id, { name: "RLCS 2024 World" })).resolves.toMatchObject({
      slug: "rlcs-2024",
    });

    await expect(
      service.create({ name: "RLCS 2024 copy", slug: "rlcs-2024" }),
    ).rejects.toBeInstanceOf(ConflictError);
    const other = await service.create({ name: "RLCS 2025", slug: "rlcs-2025" });
    await expect(
      service.update(other.id, { name: "RLCS 2025", slug: "RLCS-2024" }),
    ).rejects.toThrow('A season with the slug "rlcs-2024" already exists.');

    await Promise.all(
      ["!!!", "6e2f3a4b-5c6d-4e7f-8a9b-0c1d2e3f4a5b"].map(async (slug) => {
        await expect(service.update(other.id, { name: "RLCS 2025", slug })).rejects.toBeInstanceOf(
          InvalidInputError,
        );
      }),
    );
    await expect(service.update(other.id, { name: "RLCS 2025", slug: " " })).resolves.toMatchObject(
      {
        slug: null,
      },
    );
  });

  it("stores a trimmed format with ordered phases", async () => {
    const updated = await service.update(season.id, {
      format: {
        phases: [
          { description: " ", name: " Open Qualifiers " },
          { description: "Top teams from every region.", name: "World Championship" },
        ],
        summary: "  Open qualifiers feed two Majors and a World Championship. ",
      },
      name: "RLCS 2024",
    });

    expect(updated.format).toStrictEqual({
      phases: [
        { description: null, name: "Open Qualifiers" },
        { description: "Top teams from every region.", name: "World Championship" },
      ],
      summary: "Open qualifiers feed two Majors and a World Championship.",
    });
    await expect(
      service.update(season.id, {
        format: { phases: [{ description: null, name: "  " }], summary: null },
        name: "RLCS 2024",
      }),
    ).rejects.toThrow("The phase name is required.");
    await expect(
      service.update(season.id, {
        format: {
          phases: Array.from({ length: 13 }, (_, index) => ({
            description: null,
            name: `Phase ${index}`,
          })),
          summary: null,
        },
        name: "RLCS 2024",
      }),
    ).rejects.toThrow("at most 12 phases");
  });

  it("names a winner only among the participants", async () => {
    await expect(
      service.create({ name: "RLCS 2025", winnerTeamId: "vitality" }),
    ).rejects.toBeInstanceOf(InvalidInputError);
    await expect(
      service.update(season.id, { name: "RLCS 2024", winnerTeamId: "vitality" }),
    ).rejects.toThrow("The winner must be one of the season's participants.");

    await archives.addParticipant(season.id, { teamId: "vitality" });

    const crowned = await service.update(season.id, {
      name: "RLCS 2024",
      winnerTeamId: "vitality",
    });

    expect(crowned.winnerTeamId).toBe("vitality");
    await expect(service.update(season.id, { name: "RLCS 2024" })).resolves.toMatchObject({
      winnerTeamId: "vitality",
    });
    await expect(
      service.update(season.id, { name: "RLCS 2024", winnerTeamId: null }),
    ).resolves.toMatchObject({ winnerTeamId: null });
  });

  it("records a Season MVP presented by a partner", async () => {
    const award = await service.addAward(season.id, {
      awardType: "season_mvp",
      playerId: "zen",
      presentedBy: " Ally ",
      sourceUrl: ANNOUNCEMENT,
    });

    expect(award).toMatchObject({
      awardType: "season_mvp",
      presentedBy: "Ally",
      region: null,
      sourceUrl: ANNOUNCEMENT,
    });
    await expect(service.awardsOfPlayer("zen")).resolves.toStrictEqual([
      expect.objectContaining({
        id: award.id,
        season: { id: season.id, name: season.name, slug: null },
      }),
    ]);
  });

  it("holds one Regional MVP per region and one of every other type", async () => {
    const regional = async (playerId: string, region: string) =>
      await service.addAward(season.id, {
        awardType: "regional_mvp",
        playerId,
        region,
        sourceUrl: ANNOUNCEMENT,
      });

    await regional("zen", "Europe");
    await regional("vatira", "North America");
    await expect(regional("vatira", "Europe")).rejects.toThrow(
      "RLCS 2024 already has a Regional MVP for Europe",
    );

    const seasonMvp = async () =>
      await service.addAward(season.id, {
        awardType: "season_mvp",
        playerId: "zen",
        sourceUrl: ANNOUNCEMENT,
      });

    await seasonMvp();
    await expect(seasonMvp()).rejects.toBeInstanceOf(ConflictError);
    const detailResult = await service.detail(season.id);
    expect(detailResult.awards).toHaveLength(3);
  });

  it("requires a region for a Regional MVP and refuses one for a Season MVP", async () => {
    await expect(
      service.addAward(season.id, {
        awardType: "regional_mvp",
        playerId: "zen",
        region: " ",
        sourceUrl: ANNOUNCEMENT,
      }),
    ).rejects.toThrow("A Regional MVP names its region.");
    await expect(
      service.addAward(season.id, {
        awardType: "season_mvp",
        playerId: "zen",
        region: "Europe",
        sourceUrl: ANNOUNCEMENT,
      }),
    ).rejects.toThrow("covers the whole season");
    await expect(
      service.addAward(season.id, {
        awardType: "regular_season_mvp",
        playerId: "zen",
        sourceUrl: ANNOUNCEMENT,
      }),
    ).resolves.toMatchObject({ region: null });
  });

  it("refuses Liquipedia, non-http and overlong sources", async () => {
    await Promise.all(
      [
        `${ANNOUNCEMENT}?${"a".repeat(2048)}`,
        "https://liquipedia.net/rocketleague/Rocket_League_Championship_Series/2024",
        "ftp://rlesports.com/award",
      ].map(async (sourceUrl) => {
        await expect(
          service.addAward(season.id, { awardType: "season_mvp", playerId: "zen", sourceUrl }),
        ).rejects.toBeInstanceOf(InvalidInputError);
      }),
    );
  });

  it("refuses unknown seasons and players and merged player ids", async () => {
    const input = { awardType: "season_mvp" as const, playerId: "zen", sourceUrl: ANNOUNCEMENT };
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
      awardType: "season_mvp",
      playerId: "zen",
      sourceUrl: ANNOUNCEMENT,
    });

    await service.removeAward(season.id, award.id);
    await expect(service.removeAward(season.id, award.id)).rejects.toBeInstanceOf(NotFoundError);
    await service.remove(season.id);
    await expect(service.detail(season.id)).rejects.toBeInstanceOf(NotFoundError);
  });
});
