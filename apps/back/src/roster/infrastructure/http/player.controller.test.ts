import { beforeEach, describe, expect, it, vi } from "vitest";
import { Player } from "../../domain/roster";
import { Match, TournamentParticipant } from "../../../tournament/domain/competition";
import { MatchLineupService } from "../../../tournament/application/match/match-lineup.service";
import type { PlayerLineupRow, TournamentQueries } from "../../../tournament/application/ports";
import type { SeasonStore } from "../../../season/application/ports";
import { SeasonService } from "../../../season/application/season.service";
import { PlayerController } from "./player.controller";
import { PlayerService } from "../../application/player.service";
import { ContractService } from "../../application/contract.service";
import { MatchService } from "../../../tournament/application/match/match.service";
import { PlayerAwardService } from "../../../tournament/application/player-award.service";
import { TournamentPrizeService } from "../../../tournament/application/tournament-prize.service";
import { unconstructed } from "../../../../test/doubles";
import { unusedTournamentQueries } from "../../../../test/unused-tournament-queries";

describe("PlayerController", () => {
  const kept = Object.assign(new Player(), { id: "kept", name: "Kept" });
  const findPlayerById = vi.fn();
  const getContractsByPlayer = vi.fn();
  const getOldTeamsByPlayer = vi.fn();
  const getStaffContractsByPlayer = vi.fn();
  const getMatchesByPlayer = vi.fn();
  const getTournamentsWonByPlayer = vi.fn();
  const getTournamentsByPlayer = vi.fn();
  const getTournamentsByTeamTenures = vi.fn();
  const findByPlayerId = vi.fn();
  const awardsOfPlayer = vi.fn();

  const tournaments: TournamentQueries = {
    ...unusedTournamentQueries,
    getTournamentsWonByPlayer,
    getTournamentsByPlayer,
    getTournamentsByTeamTenures,
  };

  const seasonStore: SeasonStore = {
    list: vi.fn(),
    find: vi.fn(),
    nameTaken: vi.fn(),
    save: vi.fn(),
    remove: vi.fn(),
    awards: vi.fn(),
    awardsOfPlayer,
    player: vi.fn(),
    awardTaken: vi.fn(),
    saveAward: vi.fn(),
    removeAward: vi.fn(),
    published: vi.fn(),
    findBySlug: vi.fn(),
    slugTaken: vi.fn(),
    team: vi.fn(),
    tournamentExists: vi.fn(),
    participants: vi.fn(),
    participant: vi.fn(),
    participantTaken: vi.fn(),
    saveParticipant: vi.fn(),
    updatePathNote: vi.fn(),
    removeParticipant: vi.fn(),
    savePathEntry: vi.fn(),
    removePathEntry: vi.fn(),
  };

  const playerEarnings = vi.fn();
  const prizes = Object.assign(unconstructed(TournamentPrizeService), { playerEarnings });

  const standInMatch = (id: string, source: "manual" | "startgg", publicId: number) =>
    Object.assign(new Match(), {
      id,
      publicId,
      name: "Grand Final",
      source,
      participants: [
        Object.assign(new TournamentParticipant(), { id: `${id}-a`, players: [] }),
        Object.assign(new TournamentParticipant(), { id: `${id}-b`, players: [] }),
      ],
      tournament: {
        id: `${id}-stage`,
        name: "Main Stage",
        slug: "main-stage",
        event: { id: "fake-event", slug: "fake-cup", name: "Fake Cup" },
        beginAt: null,
        league: null,
        pickemsEnabled: false,
        source,
        pandascoreId: null,
        streams: [],
        eventStreams: [],
      },
    });

  const standInMatches = [
    standInMatch("startgg-final", "startgg", 7),
    standInMatch("cup-final", "manual", 8),
  ];

  const lineupRows: PlayerLineupRow[] = [
    { matchId: "startgg-final", participantId: "startgg-final-a", rosterIds: [] },
    { matchId: "cup-final", participantId: "cup-final-b", rosterIds: ["kept"] },
  ];

  const byPlayer = vi.fn(async () => lineupRows);

  const lineups = new MatchLineupService(
    { byMatch: async () => [], byPlayer },
    { byIds: async () => standInMatches },
    { run: async () => await Promise.reject(new Error("unused")) },
  );

  const controller = new PlayerController(
    Object.assign(unconstructed(PlayerService), { findById: findPlayerById }),
    Object.assign(unconstructed(ContractService), {
      getContractsByPlayer,
      getOldTeamsByPlayer,
      getStaffContractsByPlayer,
    }),
    Object.assign(unconstructed(MatchService), { getMatchesByPlayer }),
    tournaments,
    Object.assign(unconstructed(PlayerAwardService), { findByPlayerId }),
    new SeasonService(seasonStore),
    prizes,
    lineups,
  );

  beforeEach(() => {
    vi.resetAllMocks();
    findPlayerById.mockResolvedValue(kept);
    getContractsByPlayer.mockResolvedValue([]);
    getOldTeamsByPlayer.mockResolvedValue([]);
    getStaffContractsByPlayer.mockResolvedValue([]);
    getMatchesByPlayer.mockResolvedValue([]);
    getTournamentsWonByPlayer.mockResolvedValue([]);
    getTournamentsByPlayer.mockResolvedValue([]);
    getTournamentsByTeamTenures.mockResolvedValue([]);
    findByPlayerId.mockResolvedValue([]);
    playerEarnings.mockResolvedValue({ totals: [], years: [] });
  });

  it("reads the sub-resources of the player a merged id resolves to", async () => {
    await controller.getContracts("merged");
    await controller.getOldTeams("merged");
    await controller.getTrophies("merged");
    await controller.getAwards("merged");
    await controller.getEarnings("merged");
    await controller.getTournaments("merged");
    await controller.getMatches("merged");
    await controller.getStaffTournaments("merged");
    await controller.getStandIns("merged");

    expect(getContractsByPlayer).toHaveBeenCalledWith("kept");
    expect(getOldTeamsByPlayer).toHaveBeenCalledWith("kept");
    expect(getTournamentsWonByPlayer).toHaveBeenCalledWith("kept");
    expect(findByPlayerId).toHaveBeenCalledWith("kept");
    expect(awardsOfPlayer).toHaveBeenCalledWith("kept");
    expect(playerEarnings).toHaveBeenCalledWith("kept", { redistributableOnly: false });
    expect(getTournamentsByPlayer).toHaveBeenCalledWith("kept");
    expect(getMatchesByPlayer).toHaveBeenCalledWith("kept");
    expect(getStaffContractsByPlayer).toHaveBeenCalledWith("kept");
    expect(byPlayer).toHaveBeenCalledWith("kept");
  });

  it("lists stand-in series for the site, keeping start.gg ones with their credit flag", async () => {
    const { standIns } = await controller.getStandIns("kept");

    expect(
      standIns.map(({ participantId, startgg, match }) => ({
        participantId,
        startgg,
        id: match.id,
        publicId: match.publicId,
      })),
    ).toEqual([
      { participantId: "startgg-final-a", startgg: true, id: "startgg-final", publicId: 7 },
    ]);
  });

  it("looks up tournaments over each staff tenure", async () => {
    const from = new Date("2024-01-01");
    const to = new Date("2024-12-31");
    getStaffContractsByPlayer.mockResolvedValue([
      { team: { id: "kc" }, startDate: from, endDate: to },
      { team: { id: "vit" }, startDate: to, endDate: null },
    ]);

    await controller.getStaffTournaments("kept");

    expect(getTournamentsByTeamTenures).toHaveBeenCalledWith([
      { teamId: "kc", from, to },
      { teamId: "vit", from: to, to: null },
    ]);
  });
});
