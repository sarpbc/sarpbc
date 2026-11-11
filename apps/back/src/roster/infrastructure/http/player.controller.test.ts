import { beforeEach, describe, expect, it, vi } from "vitest";
import { Player } from "../../domain/roster";
import { Match, TournamentParticipant } from "../../../tournament/domain/competition";
import { MatchLineupService } from "../../../tournament/application/match/match-lineup.service";
import type { PlayerLineupRow } from "../../../tournament/application/ports";
import { PlayerController } from "./player.controller";

describe("PlayerController", () => {
  const kept = Object.assign(new Player(), { id: "kept", name: "Kept" });
  const players = { findById: vi.fn() };
  const contracts = {
    getContractsByPlayer: vi.fn(),
    getOldTeamsByPlayer: vi.fn(),
    getStaffContractsByPlayer: vi.fn(),
  };
  const matches = { getMatchesByPlayer: vi.fn() };
  const tournaments = {
    getTournamentsWonByPlayer: vi.fn(),
    getTournamentsByPlayer: vi.fn(),
    getTournamentsByTeamTenures: vi.fn(),
  };
  const awards = { findByPlayerId: vi.fn() };
  const playerEarnings = vi.fn();
  const prizes = { playerEarnings } as never;
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
    { run: () => Promise.reject(new Error("unused")) },
  );
  const controller = new PlayerController(
    players as never,
    contracts as never,
    matches as never,
    tournaments as never,
    awards as never,
    prizes,
    lineups,
  );

  beforeEach(() => {
    vi.resetAllMocks();
    players.findById.mockResolvedValue(kept);
    contracts.getContractsByPlayer.mockResolvedValue([]);
    contracts.getOldTeamsByPlayer.mockResolvedValue([]);
    contracts.getStaffContractsByPlayer.mockResolvedValue([]);
    matches.getMatchesByPlayer.mockResolvedValue([]);
    tournaments.getTournamentsWonByPlayer.mockResolvedValue([]);
    tournaments.getTournamentsByPlayer.mockResolvedValue([]);
    tournaments.getTournamentsByTeamTenures.mockResolvedValue([]);
    awards.findByPlayerId.mockResolvedValue([]);
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

    expect(contracts.getContractsByPlayer).toHaveBeenCalledWith("kept");
    expect(contracts.getOldTeamsByPlayer).toHaveBeenCalledWith("kept");
    expect(tournaments.getTournamentsWonByPlayer).toHaveBeenCalledWith("kept");
    expect(awards.findByPlayerId).toHaveBeenCalledWith("kept");
    expect(playerEarnings).toHaveBeenCalledWith("kept", { redistributableOnly: false });
    expect(tournaments.getTournamentsByPlayer).toHaveBeenCalledWith("kept");
    expect(matches.getMatchesByPlayer).toHaveBeenCalledWith("kept");
    expect(contracts.getStaffContractsByPlayer).toHaveBeenCalledWith("kept");
    expect(byPlayer).toHaveBeenCalledWith("kept");
  });

  it("lists stand-in series for the site, keeping start.gg ones with their credit flag", async () => {
    const { standIns } = await controller.getStandIns("kept");

    expect(standIns).toEqual([
      {
        participantId: "startgg-final-a",
        startgg: true,
        match: expect.objectContaining({ id: "startgg-final", publicId: 7 }),
      },
    ]);
  });

  it("looks up tournaments over each staff tenure", async () => {
    const from = new Date("2024-01-01");
    const to = new Date("2024-12-31");
    contracts.getStaffContractsByPlayer.mockResolvedValue([
      { team: { id: "kc" }, startDate: from, endDate: to },
      { team: { id: "vit" }, startDate: to, endDate: null },
    ]);

    await controller.getStaffTournaments("kept");

    expect(tournaments.getTournamentsByTeamTenures).toHaveBeenCalledWith([
      { teamId: "kc", from, to },
      { teamId: "vit", from: to, to: null },
    ]);
  });
});
