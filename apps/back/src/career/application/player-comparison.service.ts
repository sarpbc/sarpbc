import type {
  HeadToHead,
  PlayerProfileAward,
  PlayerSeasonAward,
  ProfileEarnings,
  SeriesRecord,
} from "@sarpbc/types";
import { isRedistributable } from "../../common/domain/data-source";
import { InvalidInputError } from "../../common/domain/errors/invalid-input-error";
import { NotFoundError } from "../../common/domain/errors/not-found-error";
import type { ContractService } from "../../roster/application/contract.service";
import type { PlayerService } from "../../roster/application/player.service";
import type { Contract } from "../../roster/domain/contract";
import type { Player } from "../../roster/domain/player";
import type { SeasonService } from "../../season/application/season.service";
import type { MatchService } from "../../tournament/application/match/match.service";
import type { PlayerAwardService } from "../../tournament/application/player-award.service";
import type { TournamentQueries } from "../../tournament/application/ports";
import type { TournamentPrizeService } from "../../tournament/application/tournament-prize.service";
import type { Match } from "../../tournament/domain/match";
import type { Tournament } from "../../tournament/domain/tournament";
import { headToHead, seriesRecord } from "../domain/series-record";

export interface PlayerComparisonSources {
  players: Pick<PlayerService, "findBySlug">;
  contracts: Pick<ContractService, "getContractsByPlayer">;
  tournaments: Pick<TournamentQueries, "getTournamentsWonByPlayer">;
  matches: Pick<MatchService, "getMatchesByPlayer">;
  prizes: Pick<TournamentPrizeService, "playerEarnings">;
  awards: Pick<PlayerAwardService, "findByPlayerId">;
  seasons: Pick<SeasonService, "awardsOfPlayer">;
}

export interface Career {
  player: Player;
  titles: Tournament[];
  contracts: Contract[];
  series: SeriesRecord;
  earnings: ProfileEarnings;
  awards: PlayerProfileAward[];
  seasonAwards: PlayerSeasonAward[];
}

export interface Comparison {
  a: Career;
  b: Career;
  headToHead: HeadToHead;
}

function isRedistributableMatch(match: Match): boolean {
  return isRedistributable(match.source) && isRedistributable(match.tournament.source);
}

export class PlayerComparisonService {
  constructor(private readonly sources: PlayerComparisonSources) {}

  async compare(slugA: string, slugB: string): Promise<Comparison> {
    const [playerA, playerB] = await Promise.all([this.player(slugA), this.player(slugB)]);

    if (playerA.id === playerB.id) {
      throw new InvalidInputError("Choose two different players to compare.");
    }

    const [a, b] = await Promise.all([this.career(playerA), this.career(playerB)]);

    return { a: a.career, b: b.career, headToHead: headToHead(a.matches, playerA.id, playerB.id) };
  }

  private async player(slug: string): Promise<Player> {
    const player = await this.sources.players.findBySlug(slug);

    if (!player) {
      throw new NotFoundError(`Player with slug "${slug}" not found`);
    }

    return player;
  }

  private async career(player: Player): Promise<{ career: Career; matches: Match[] }> {
    const { contracts, tournaments, matches, prizes, awards, seasons } = this.sources;

    const [contractList, titles, matchList, earnings, awardList, seasonAwards] = await Promise.all([
      contracts.getContractsByPlayer(player.id),
      tournaments.getTournamentsWonByPlayer(player.id),
      matches.getMatchesByPlayer(player.id),
      prizes.playerEarnings(player.id, { redistributableOnly: true }),
      awards.findByPlayerId(player.id),
      seasons.awardsOfPlayer(player.id),
    ]);

    const redistributableMatches = matchList.filter(isRedistributableMatch);

    return {
      career: {
        player,
        titles: titles.filter(({ source }) => isRedistributable(source)),
        contracts: contractList,
        series: seriesRecord(redistributableMatches, player.id),
        earnings,
        awards: awardList.filter(({ tournament }) => isRedistributable(tournament.source)),
        seasonAwards,
      },
      matches: redistributableMatches,
    };
  }
}
