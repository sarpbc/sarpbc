import { NotFoundError } from "../../common/domain/errors/not-found-error";
import type { TournamentPlayerStatsService } from "../../match-stats/application/tournament-player-stats.service";
import type { ManualCatalogService } from "../../tournament/application/manual-catalog.service";
import type { MatchService } from "../../tournament/application/match/match.service";
import type { MatchLineupService } from "../../tournament/application/match/match-lineup.service";
import type { MatchListKind } from "../../tournament/application/match/match-list-filters";
import type { EventQueries, TournamentQueries } from "../../tournament/application/ports";
import type { PlayerAwardService } from "../../tournament/application/player-award.service";
import type { TournamentPrizeService } from "../../tournament/application/tournament-prize.service";

export interface CompetitionReadServices {
  tournaments: Pick<TournamentQueries, "find" | "findById">;
  events: Pick<EventQueries, "list">;
  catalogService: Pick<ManualCatalogService, "findEvent">;
  matchService: Pick<MatchService, "list">;
  tournamentPrizeService: Pick<
    TournamentPrizeService,
    "findByTournamentId" | "teamEarnings" | "playerEarnings"
  >;
  playerAwardService: Pick<PlayerAwardService, "findByTournamentId">;
  matchLineupService: Pick<MatchLineupService, "find">;
  tournamentPlayerStatsService: Pick<TournamentPlayerStatsService, "forStages">;
}

export const tournamentNotFound = (id: string) =>
  new NotFoundError(
    `Tournament "${id}" was not found. Use get_tournaments to list available events.`,
  );

/** The competition data read tools reach, with not-found errors that point to the listing tools. */
export const competitionReads = (services: CompetitionReadServices) => {
  const {
    tournaments: tournamentQueries,
    events: eventQueries,
    catalogService,
    matchService,
    tournamentPrizeService,
    playerAwardService,
    matchLineupService,
    tournamentPlayerStatsService,
  } = services;

  const tournament = async (id: string) => {
    const found = await tournamentQueries.findById(id);

    if (!found) {
      throw tournamentNotFound(id);
    }

    return found;
  };

  const event = async (idOrSlug: string) => await catalogService.findEvent(idOrSlug);

  return {
    event,

    async eventPlayerStats(idOrSlug: string) {
      const { stages } = await event(idOrSlug);

      return await tournamentPlayerStatsService.forStages(stages);
    },

    async events(options: { activeOnly: boolean; limit: number; offset: number }) {
      return await eventQueries.list(options);
    },

    async matchLineups(matchId: string) {
      const { lineups } = await matchLineupService.find(matchId);

      return lineups;
    },

    async matches(kind: MatchListKind, limit: number) {
      return await matchService.list(kind, { limit });
    },

    async playerEarnings(playerId: string) {
      return await tournamentPrizeService.playerEarnings(playerId);
    },

    async prizeDistribution(tournamentId: string) {
      return await tournamentPrizeService.findByTournamentId(tournamentId);
    },

    async teamEarnings(teamId: string) {
      return await tournamentPrizeService.teamEarnings(teamId);
    },

    tournament,

    async tournamentAwards(tournamentId: string) {
      await tournament(tournamentId);

      return await playerAwardService.findByTournamentId(tournamentId);
    },

    async tournamentPlayerStats(tournamentId: string) {
      return await tournamentPlayerStatsService.forStages([await tournament(tournamentId)]);
    },

    async tournaments(options: { activeOnly: boolean; limit: number }) {
      const [found] = await tournamentQueries.find({ ...options, offset: 0 });

      return found;
    },
  };
};

export type CompetitionReads = ReturnType<typeof competitionReads>;
