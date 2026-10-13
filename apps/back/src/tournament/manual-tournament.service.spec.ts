import { BadRequestException } from "@nestjs/common";
import { UpdateTournamentDto } from "./dto/create-tournament.dto";
import { parseDto } from "./dto/parse-tournament-dto";
import { ManualTournamentService } from "./manual-tournament.service";
import { Tournament } from "./tournament.entities";

describe("ManualTournamentService.update", () => {
  const repository = { findOne: jest.fn() };
  const leagues = { findById: jest.fn() };
  const redis = { delete: jest.fn() };
  const em = { findOne: jest.fn(), flush: jest.fn(), transactional: jest.fn() };
  let tournament: Tournament;
  let service: ManualTournamentService;

  beforeEach(() => {
    jest.clearAllMocks();
    tournament = Object.assign(new Tournament(), {
      id: "ewc",
      name: "Group A",
      source: "pandascore",
      pandascoreId: 123,
      imageUrl: "https://cdn.example/old.png",
    });
    em.findOne.mockResolvedValue(tournament);
    em.transactional.mockImplementation((callback) => callback(em));
    service = new ManualTournamentService(
      repository as never,
      leagues as never,
      redis as never,
      em as never,
    );
  });

  it("saves artwork on a synced tournament using a parsed DTO and invalidates its cache", async () => {
    const patch = await parseDto(UpdateTournamentDto, {
      imageUrl: " https://cdn.example/ewc.png ",
    });
    const updated = await service.update("ewc", patch);

    expect(updated.imageUrl).toBe("https://cdn.example/ewc.png");
    expect(updated).toMatchObject({ name: "Group A", source: "pandascore", pandascoreId: 123 });
    expect(em.flush).toHaveBeenCalledTimes(1);
    expect(redis.delete).toHaveBeenCalledWith("tournament:ewc");
    expect(leagues.findById).not.toHaveBeenCalled();
  });

  it.each([null, ""])("clears synced artwork with %p", async (imageUrl) => {
    await service.update("ewc", { imageUrl });
    expect(tournament.imageUrl).toBeNull();
    expect(em.flush).toHaveBeenCalled();
  });

  it.each<UpdateTournamentDto>([
    { name: "Changed" },
    { slug: "changed" },
    { tier: null },
    { leagueId: null },
    { beginAt: null },
    { endAt: null },
    { teamIds: [] },
  ])("rejects synced fields even when sent alongside an image: %p", async (patch) => {
    await expect(
      service.update("ewc", { ...patch, imageUrl: "https://cdn.example/ewc.png" }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(tournament.imageUrl).toBe("https://cdn.example/old.png");
    expect(em.flush).not.toHaveBeenCalled();
    expect(redis.delete).not.toHaveBeenCalled();
  });

  it("rejects an empty synced patch", async () => {
    await expect(service.update("ewc", {})).rejects.toBeInstanceOf(BadRequestException);
  });

  it("still allows manual tournament details and artwork to be edited together", async () => {
    tournament.source = "manual";
    await service.update("ewc", { name: "Community Cup", imageUrl: null });
    expect(tournament).toMatchObject({ name: "Community Cup", imageUrl: null });
  });
});
