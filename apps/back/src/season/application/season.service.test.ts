import type { SeasonDetail } from "@sarpbc/types";
import { beforeEach, describe, expect, it } from "vitest";
import { memorySeasonStore } from "../../../test/season-store.memory";
import { ConflictError, InvalidInputError, NotFoundError } from "../../common/domain/errors";
import { SeasonArchiveService } from "./season-archive.service";
import { SeasonService } from "./season.service";

const ANNOUNCEMENT = "https://x.com/RLEsports/status/1";

describe("SeasonService", () => {
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
      name: "RLCS 2024",
      slug: null,
      format: { summary: null, phases: [] },
      winnerTeamId: null,
      participants: [],
      awards: [],
    });
    await expect(service.create({ name: "RLCS 2024" })).rejects.toBeInstanceOf(ConflictError);
    await expect(service.create({ name: "   " })).rejects.toBeInstanceOf(InvalidInputError);
    expect(await service.update(season.id, { name: "RLCS 2024" })).toEqual(season);
  });

  it("normalises the public slug and keeps it unique across seasons", async () => {
    const published = await service.update(season.id, { name: "RLCS 2024", slug: " RLCS 2024 " });
    expect(published.slug).toBe("rlcs-2024");
    expect(await service.update(season.id, { name: "RLCS 2024 World" })).toMatchObject({
      slug: "rlcs-2024",
    });

    await expect(
      service.create({ name: "RLCS 2024 copy", slug: "rlcs-2024" }),
    ).rejects.toBeInstanceOf(ConflictError);
    const other = await service.create({ name: "RLCS 2025", slug: "rlcs-2025" });
    await expect(
      service.update(other.id, { name: "RLCS 2025", slug: "RLCS-2024" }),
    ).rejects.toThrow('A season with the slug "rlcs-2024" already exists.');

    for (const slug of ["!!!", "6e2f3a4b-5c6d-4e7f-8a9b-0c1d2e3f4a5b"])
      await expect(service.update(other.id, { name: "RLCS 2025", slug })).rejects.toBeInstanceOf(
        InvalidInputError,
      );
    expect(await service.update(other.id, { name: "RLCS 2025", slug: " " })).toMatchObject({
      slug: null,
    });
  });

  it("stores a trimmed format with ordered phases", async () => {
    const updated = await service.update(season.id, {
      name: "RLCS 2024",
      format: {
        summary: "  Open qualifiers feed two Majors and a World Championship. ",
        phases: [
          { name: " Open Qualifiers ", description: " " },
          { name: "World Championship", description: "Top teams from every region." },
        ],
      },
    });
    expect(updated.format).toEqual({
      summary: "Open qualifiers feed two Majors and a World Championship.",
      phases: [
        { name: "Open Qualifiers", description: null },
        { name: "World Championship", description: "Top teams from every region." },
      ],
    });
    await expect(
      service.update(season.id, {
        name: "RLCS 2024",
        format: { summary: null, phases: [{ name: "  ", description: null }] },
      }),
    ).rejects.toThrow("The phase name is required.");
    await expect(
      service.update(season.id, {
        name: "RLCS 2024",
        format: {
          summary: null,
          phases: Array.from({ length: 13 }, (_, index) => ({
            name: `Phase ${index}`,
            description: null,
          })),
        },
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
    expect(await service.update(season.id, { name: "RLCS 2024" })).toMatchObject({
      winnerTeamId: "vitality",
    });
    expect(
      await service.update(season.id, { name: "RLCS 2024", winnerTeamId: null }),
    ).toMatchObject({ winnerTeamId: null });
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
      expect.objectContaining({
        id: award.id,
        season: { id: season.id, name: season.name, slug: null },
      }),
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

  it("refuses Liquipedia, non-http and overlong sources", async () => {
    for (const sourceUrl of [
      `${ANNOUNCEMENT}?${"a".repeat(2048)}`,
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
