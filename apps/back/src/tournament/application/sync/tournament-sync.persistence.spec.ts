import { CompetitionSyncService } from "./competition-sync.service";
import { Tournament, TournamentParticipant } from "../../domain/competition";
import { Team } from "../../../player/domain/roster";
import type { CompetitionWriteScope } from "../ports";
describe("Competition synchronization", () => {
  const tournaments = {
    byPandascoreId: jest.fn(),
    save: jest.fn(),
    participants: jest.fn(),
    saveParticipant: jest.fn(),
    leagueByPandascoreId: jest.fn(),
    saveLeague: jest.fn(),
  };
  const rosters = { upsertTeam: jest.fn(), upsertPlayer: jest.fn() };
  const cache = { invalidateTournament: jest.fn() },
    scoring = { autoScoreMatch: jest.fn() },
    diagnostics = { error: jest.fn() };
  const events: string[] = [];
  const tx = {
    run: async <T>(work: (scope: CompetitionWriteScope) => Promise<T>) => {
      const result = await work({ tournaments, rosters } as never);
      events.push("commit");
      return result;
    },
  };
  const service = new CompetitionSyncService({} as never, tx, cache, scoring, diagnostics);
  beforeEach(() => {
    jest.clearAllMocks();
    events.length = 0;
    tournaments.byPandascoreId.mockResolvedValue(null);
    tournaments.participants.mockResolvedValue([]);
    tournaments.save.mockResolvedValue(undefined);
    rosters.upsertTeam.mockResolvedValue({ id: "team" });
    rosters.upsertPlayer.mockImplementation(async (p) => ({ id: String(p.pandascoreId) }));
    cache.invalidateTournament.mockImplementation(async () => {
      events.push("invalidate");
    });
  });
  it("rejects corrupt manual identities", async () => {
    tournaments.byPandascoreId.mockResolvedValue(
      Object.assign(new Tournament(), { id: "manual", source: "manual" }),
    );
    await expect(service.upsertTournament({ pandascoreId: 99, name: "Provider" })).rejects.toThrow(
      /source=manual/,
    );
    expect(tournaments.save).not.toHaveBeenCalled();
  });
  it("creates a provider tournament and commits before invalidating", async () => {
    expect(await service.upsertTournament({ pandascoreId: 42, name: "RLCS" })).toMatchObject({
      source: "pandascore",
      pandascoreId: 42,
      name: "RLCS",
    });
    expect(events).toEqual(["commit", "invalidate"]);
  });
  it("keeps local slug and artwork while updating feed-owned fields", async () => {
    tournaments.byPandascoreId.mockResolvedValue(
      Object.assign(new Tournament(), {
        source: "pandascore",
        pandascoreId: 42,
        slug: "local-slug",
        imageUrl: "local-art",
      }),
    );
    expect(
      await service.upsertTournament({ pandascoreId: 42, name: "Group A", slug: "provider-slug" }),
    ).toMatchObject({ name: "Group A", slug: "local-slug", imageUrl: "local-art" });
  });
  it.each([false, true])(
    "historical rosters never update current membership (existing=%s)",
    async (existing) => {
      if (existing)
        tournaments.participants.mockResolvedValue([
          Object.assign(new TournamentParticipant(), {
            id: "participant",
            team: Object.assign(new Team(), { id: "team" }),
          }),
        ]);
      await service.upsertTournament({
        pandascoreId: 42,
        name: "Past Cup",
        expectedRoster: [
          {
            team: { pandascoreId: 8, name: "Past team", slug: "past-team" },
            players: [
              { pandascoreId: 1, name: "Player", slug: "player" },
              { pandascoreId: 3, name: "Sub", slug: "sub" },
            ],
          },
        ],
      });
      expect(rosters.upsertPlayer).toHaveBeenNthCalledWith(1, {
        pandascoreId: 1,
        name: "Player",
        slug: "player",
      });
      expect(rosters.upsertPlayer).toHaveBeenNthCalledWith(2, {
        pandascoreId: 3,
        name: "Sub",
        slug: "sub",
      });
      expect(tournaments.saveParticipant).toHaveBeenCalledWith(
        expect.objectContaining({
          teamId: "team",
          playerIds: ["1", "3"],
        }),
      );
      if (existing)
        expect(tournaments.saveParticipant).toHaveBeenCalledWith(
          expect.objectContaining({ id: "participant" }),
        );
    },
  );
  it("preserves success after a committed write when Redis fails", async () => {
    cache.invalidateTournament.mockRejectedValue(new Error("offline"));
    await expect(
      service.upsertTournament({ pandascoreId: 42, name: "Cup" }),
    ).resolves.toMatchObject({ name: "Cup" });
    expect(diagnostics.error).toHaveBeenCalled();
  });
});
