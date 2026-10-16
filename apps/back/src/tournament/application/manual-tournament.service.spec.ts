import { InvalidInputError } from "../../common/domain/errors";
import { Tournament, TournamentParticipant } from "../domain/competition";
import { Team } from "../../player/domain/roster";
import { ManualTournamentService } from "./manual-tournament.service";
import type { UpdateTournamentInput } from "./inputs";
describe("ManualTournamentService", () => {
  const writer = {
    load: jest.fn(),
    save: jest.fn(),
    bySlug: jest.fn(),
    participants: jest.fn(),
    teamsExist: jest.fn(),
    participantReferences: jest.fn(),
    removeParticipant: jest.fn(),
    saveParticipant: jest.fn(),
    league: jest.fn(),
  };
  const cache = { invalidateTournament: jest.fn() },
    diagnostics = { error: jest.fn() },
    reads = { findById: jest.fn(), leagues: jest.fn() };
  let tournament: Tournament;
  const events: string[] = [];
  const tx = {
    run: async <T>(work: (scope: never) => Promise<T>) => {
      const result = await work({ tournaments: writer } as never);
      events.push("commit");
      return result;
    },
  };
  const service = new ManualTournamentService(reads as never, tx, cache, diagnostics);
  beforeEach(() => {
    jest.clearAllMocks();
    events.length = 0;
    tournament = Object.assign(new Tournament(), {
      id: "ewc",
      source: "pandascore",
      pandascoreId: 123,
      name: "Group A",
      imageUrl: "https://cdn.example/old.png",
    });
    writer.load.mockImplementation(async () => tournament);
    reads.findById.mockImplementation(async () => tournament);
    writer.save.mockResolvedValue(undefined);
    cache.invalidateTournament.mockImplementation(async () => {
      events.push("invalidate");
    });
    writer.participants.mockResolvedValue([]);
    writer.teamsExist.mockResolvedValue(true);
  });
  it("edits artwork and invalidates only after commit", async () => {
    const result = await service.update("ewc", { imageUrl: " https://cdn.example/ewc.png " });
    expect(result).toMatchObject({
      name: "Group A",
      source: "pandascore",
      pandascoreId: 123,
      imageUrl: "https://cdn.example/ewc.png",
    });
    expect(events).toEqual(["commit", "invalidate"]);
    expect(writer.league).not.toHaveBeenCalled();
  });
  it.each([null, ""])("clears synced artwork with %p", async (imageUrl) => {
    expect((await service.update("ewc", { imageUrl })).imageUrl).toBeNull();
  });
  it.each<UpdateTournamentInput>([
    { name: "Changed" },
    { slug: "changed" },
    { tier: null },
    { leagueId: null },
    { beginAt: null },
    { endAt: null },
    { teamIds: [] },
  ])("rejects PandaScore-owned fields %p", async (patch) => {
    await expect(service.update("ewc", { ...patch, imageUrl: null })).rejects.toBeInstanceOf(
      InvalidInputError,
    );
    expect(writer.save).not.toHaveBeenCalled();
    expect(cache.invalidateTournament).not.toHaveBeenCalled();
  });
  it("rejects an empty synced patch", async () => {
    await expect(service.update("ewc", {})).rejects.toBeInstanceOf(InvalidInputError);
  });
  it("allows manual details and artwork together", async () => {
    tournament.source = "manual";
    expect(await service.update("ewc", { name: "Community Cup", imageUrl: null })).toMatchObject({
      name: "Community Cup",
      imageUrl: null,
    });
  });
  it("preserves committed success when optional invalidation fails", async () => {
    cache.invalidateTournament.mockRejectedValue(new Error("Redis down"));
    expect((await service.update("ewc", { imageUrl: null })).imageUrl).toBeNull();
    expect(diagnostics.error).toHaveBeenCalled();
  });
  it.each(["tournamentWinner", "matchParticipant", "matchWinner", "results"])(
    "protects referenced participant %s",
    async (reference) => {
      tournament.source = "manual";
      const team = Object.assign(new Team(), { id: "old" });
      writer.participants.mockResolvedValue([
        Object.assign(new TournamentParticipant(), { id: "p", team }),
      ]);
      writer.participantReferences.mockResolvedValue({ [reference]: true });
      await expect(service.update("ewc", { teamIds: [] })).rejects.toBeInstanceOf(
        InvalidInputError,
      );
      expect(writer.removeParticipant).not.toHaveBeenCalled();
    },
  );
  it("rejects reversed dates", async () => {
    tournament.source = "manual";
    await expect(
      service.update("ewc", { beginAt: "2026-10-20", endAt: "2026-10-19" }),
    ).rejects.toBeInstanceOf(InvalidInputError);
  });
});
