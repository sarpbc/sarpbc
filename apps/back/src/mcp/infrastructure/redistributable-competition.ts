import { isRedistributable } from "../../common/domain/data-source";
import { NotFoundError } from "../../common/domain/errors";
import type { Tournament } from "../../tournament/domain/competition";
import type { ManualCatalogService } from "../../tournament/application/manual-catalog.service";
import type { MatchService } from "../../tournament/application/match/match.service";
import type { MatchListKind } from "../../tournament/application/match/match-list-filters";
import type {
  EventListing,
  EventQueries,
  TournamentQueries,
} from "../../tournament/application/ports";
import type { TournamentPrizeService } from "../../tournament/application/tournament-prize.service";

export interface RedistributableCompetitionServices {
  tournaments: Pick<TournamentQueries, "find" | "findById">;
  events: Pick<EventQueries, "list">;
  catalogService: Pick<ManualCatalogService, "findEvent">;
  matchService: Pick<MatchService, "list">;
  tournamentPrizeService: Pick<
    TournamentPrizeService,
    "findByTournamentId" | "teamEarnings" | "playerEarnings"
  >;
}

/**
 * An event whose stages all come from start.gg may not be redistributed, so it is hidden.
 * An event without stages stays visible: staff reuse it once its stages have moved elsewhere.
 */
function isHiddenEvent({ stages }: EventListing): boolean {
  return stages.length > 0 && !stages.some((stage) => isRedistributable(stage.source));
}

export function tournamentNotFound(id: string): NotFoundError {
  return new NotFoundError(
    `Tournament "${id}" was not found. Use get_tournaments to list available events.`,
  );
}

/** The only way read tools reach competition data: every query already excludes start.gg. */
export function redistributableCompetition(services: RedistributableCompetitionServices) {
  const {
    tournaments: tournamentQueries,
    events: eventQueries,
    catalogService,
    matchService,
    tournamentPrizeService,
  } = services;
  return {
    async tournaments(options: { activeOnly: boolean; limit: number }): Promise<Tournament[]> {
      const [found] = await tournamentQueries.find({
        ...options,
        redistributableOnly: true,
        offset: 0,
      });
      return found;
    },

    async tournament(id: string): Promise<Tournament> {
      const tournament = await tournamentQueries.findById(id);
      if (!tournament || !isRedistributable(tournament.source)) throw tournamentNotFound(id);
      return tournament;
    },

    matches(kind: MatchListKind, limit: number) {
      return matchService.list(kind, { limit, redistributableOnly: true });
    },

    async prizeDistribution(tournamentId: string) {
      const distribution = await tournamentPrizeService.findByTournamentId(tournamentId);
      if (!isRedistributable(distribution.source)) throw tournamentNotFound(tournamentId);
      return distribution;
    },

    teamEarnings(teamId: string) {
      return tournamentPrizeService.teamEarnings(teamId, { redistributableOnly: true });
    },

    playerEarnings(playerId: string) {
      return tournamentPrizeService.playerEarnings(playerId, { redistributableOnly: true });
    },

    events(options: { activeOnly: boolean; limit: number; offset: number }) {
      return eventQueries.list({ ...options, redistributableOnly: true });
    },

    async event(idOrSlug: string): Promise<EventListing> {
      const listing = await catalogService.findEvent(idOrSlug);
      if (isHiddenEvent(listing)) throw new NotFoundError(`Event "${idOrSlug}" was not found.`);
      return listing;
    },
  };
}

export type RedistributableCompetition = ReturnType<typeof redistributableCompetition>;
