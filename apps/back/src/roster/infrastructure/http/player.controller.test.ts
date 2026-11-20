import { beforeEach, describe, expect, it, vi } from "vitest";
import { Contract } from "../../domain/contract";
import { Player } from "../../domain/player";
import { Team } from "../../domain/team";
import { Match } from "../../../tournament/domain/match";
import { TournamentParticipant } from "../../../tournament/domain/tournament-participant";
import { MatchLineupService } from "../../../tournament/application/match/match-lineup.service";
import type {
  LineupQueries,
  PlayerLineupRow,
  TournamentQueries,
} from "../../../tournament/application/ports";
import { SeasonService } from "../../../season/application/season.service";
import { PlayerController } from "./player.controller";
import { PlayerService } from "../../application/player.service";
import { ContractService } from "../../application/contract.service";
import { MatchService } from "../../../tournament/application/match/match.service";
import { PlayerAwardService } from "../../../tournament/application/player-award.service";
import { TournamentPrizeService } from "../../../tournament/application/tournament-prize.service";
import { unconstructed } from "../../../../test/doubles";
import { memorySeasonStore } from "../../../../test/season-store.memory";
import { tournamentQueries } from "../../../../test/competition-doubles";

const standInMatch = (id: string, publicId: number) =>
  Object.assign(new Match(), {
    id,
    name: "Grand Final",
    participants: [
      Object.assign(new TournamentParticipant(), { id: `${id}-a`, players: [] }),
      Object.assign(new TournamentParticipant(), { id: `${id}-b`, players: [] }),
    ],
    publicId,
    source: "manual",
    tournament: {
      beginAt: null,
      event: { id: "fake-event", name: "Fake Cup", slug: "fake-cup" },
      eventStreams: [],
      id: `${id}-stage`,
      league: null,
      name: "Main Stage",
      pandascoreId: null,
      pickemsEnabled: false,
      slug: "main-stage",
      source: "manual",
      streams: [],
    },
  });

const staffContract = (teamId: string, startDate: Date, endDate: Date | null) =>
  Object.assign(new Contract(), {
    endDate,
    startDate,
    team: Object.assign(new Team(), { id: teamId }),
  });

describe(PlayerController, () => {
  const kept = Object.assign(new Player(), { id: "kept", name: "Kept" });
  let staffContracts: Contract[] = [];

  const playerQueries: Pick<PlayerService, "findById"> = { findById: async () => kept };

  const contractQueries: Pick<
    ContractService,
    "getContractsByPlayer" | "getOldTeamsByPlayer" | "getStaffContractsByPlayer"
  > = {
    getContractsByPlayer: async () => [],
    getOldTeamsByPlayer: async () => [],
    getStaffContractsByPlayer: async () => staffContracts,
  };

  const matchQueries: Pick<MatchService, "getMatchesByPlayer"> = {
    getMatchesByPlayer: async () => [],
  };

  const awardQueries: Pick<PlayerAwardService, "findByPlayerId"> = {
    findByPlayerId: async () => [],
  };

  const prizeQueries: Pick<TournamentPrizeService, "playerEarnings"> = {
    playerEarnings: async () => ({ totals: [], years: [] }),
  };

  const tournaments: TournamentQueries = tournamentQueries({
    getTournamentsByPlayer: async () => [],
    getTournamentsByTeamTenures: async () => [],
    getTournamentsWonByPlayer: async () => [],
  });

  const { store: seasonStore } = memorySeasonStore();

  const getContractsByPlayer = vi.spyOn(contractQueries, "getContractsByPlayer");
  const getOldTeamsByPlayer = vi.spyOn(contractQueries, "getOldTeamsByPlayer");
  const getStaffContractsByPlayer = vi.spyOn(contractQueries, "getStaffContractsByPlayer");
  const getMatchesByPlayer = vi.spyOn(matchQueries, "getMatchesByPlayer");
  const getTournamentsWonByPlayer = vi.spyOn(tournaments, "getTournamentsWonByPlayer");
  const getTournamentsByPlayer = vi.spyOn(tournaments, "getTournamentsByPlayer");
  const getTournamentsByTeamTenures = vi.spyOn(tournaments, "getTournamentsByTeamTenures");
  const findByPlayerId = vi.spyOn(awardQueries, "findByPlayerId");
  const awardsOfPlayer = vi.spyOn(seasonStore, "awardsOfPlayer");
  const playerEarnings = vi.spyOn(prizeQueries, "playerEarnings");

  const prizes = Object.assign(unconstructed(TournamentPrizeService), prizeQueries);

  const standInMatches = [standInMatch("open-final", 7), standInMatch("cup-final", 8)];

  const lineupRows: PlayerLineupRow[] = [
    { matchId: "open-final", participantId: "open-final-a", rosterIds: [] },
    { matchId: "cup-final", participantId: "cup-final-b", rosterIds: ["kept"] },
  ];

  const lineupQueries: LineupQueries = {
    byMatch: async () => [],
    byPlayer: async () => lineupRows,
  };

  const byPlayer = vi.spyOn(lineupQueries, "byPlayer");

  const lineups = new MatchLineupService(
    lineupQueries,
    { byIds: async () => standInMatches },
    { run: async () => await Promise.reject(new Error("unused")) },
  );

  const controller = new PlayerController(
    Object.assign(unconstructed(PlayerService), playerQueries),
    Object.assign(unconstructed(ContractService), contractQueries),
    Object.assign(unconstructed(MatchService), matchQueries),
    tournaments,
    Object.assign(unconstructed(PlayerAwardService), awardQueries),
    new SeasonService(seasonStore),
    prizes,
    lineups,
  );

  beforeEach(() => {
    vi.clearAllMocks();
    staffContracts = [];
  });

  describe("with a merged player id", () => {
    beforeEach(async () => {
      await controller.getContracts("merged");
      await controller.getOldTeams("merged");
      await controller.getTrophies("merged");
      await controller.getAwards("merged");
      await controller.getEarnings("merged");
      await controller.getTournaments("merged");
      await controller.getMatches("merged");
      await controller.getStaffTournaments("merged");
      await controller.getStandIns("merged");
    });

    it("reads the contracts of the resolved player", () => {
      expect(getContractsByPlayer).toHaveBeenCalledExactlyOnceWith("kept");
    });

    it("reads the former teams of the resolved player", () => {
      expect(getOldTeamsByPlayer).toHaveBeenCalledExactlyOnceWith("kept");
    });

    it("reads the trophies of the resolved player", () => {
      expect(getTournamentsWonByPlayer).toHaveBeenCalledExactlyOnceWith("kept");
    });

    it("reads the awards of the resolved player", () => {
      expect(findByPlayerId).toHaveBeenCalledExactlyOnceWith("kept");
      expect(awardsOfPlayer).toHaveBeenCalledExactlyOnceWith("kept");
    });

    it("reads the earnings of the resolved player", () => {
      expect(playerEarnings).toHaveBeenCalledExactlyOnceWith("kept");
    });

    it("reads the tournaments of the resolved player", () => {
      expect(getTournamentsByPlayer).toHaveBeenCalledExactlyOnceWith("kept");
    });

    it("reads the matches of the resolved player", () => {
      expect(getMatchesByPlayer).toHaveBeenCalledExactlyOnceWith("kept");
    });

    it("reads the staff contracts of the resolved player", () => {
      expect(getStaffContractsByPlayer).toHaveBeenCalledExactlyOnceWith("kept");
    });

    it("reads the stand-in lineups of the resolved player", () => {
      expect(byPlayer).toHaveBeenCalledExactlyOnceWith("kept");
    });
  });

  it("lists stand-in series for the site", async () => {
    const { standIns } = await controller.getStandIns("kept");

    expect(
      standIns.map(({ participantId, match }) => ({
        id: match.id,
        participantId,
        publicId: match.publicId,
      })),
    ).toStrictEqual([{ id: "open-final", participantId: "open-final-a", publicId: 7 }]);
  });

  it("looks up tournaments over each staff tenure", async () => {
    const from = new Date("2024-01-01");
    const to = new Date("2024-12-31");
    staffContracts = [staffContract("kc", from, to), staffContract("vit", to, null)];

    await controller.getStaffTournaments("kept");

    expect(getTournamentsByTeamTenures).toHaveBeenCalledExactlyOnceWith([
      { from, teamId: "kc", to },
      { from: to, teamId: "vit", to: null },
    ]);
  });
});
