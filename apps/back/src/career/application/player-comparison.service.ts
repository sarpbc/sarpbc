import type {
  HeadToHead,
  PlayerProfileAward,
  PlayerSeasonAward,
  ProfileEarnings,
  SeriesRecord,
  StatsEra,
} from "@sarpbc/types";
import { isRedistributable } from "../../common/domain/data-source";
import { InvalidInputError } from "../../common/domain/errors/invalid-input-error";
import { NotFoundError } from "../../common/domain/errors/not-found-error";
import { isInEra, overlapsEra } from "../../common/domain/stats-era";
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

const isRedistributableMatch = (match: Match) =>
  isRedistributable(match.source) && isRedistributable(match.tournament.source);

const playedOn = (match: Match) => match.beginAt ?? match.endAt ?? match.tournament.beginAt;

const keepInEra = <T>(
  items: T[],
  era: StatsEra | null,
  belongs: (item: T, current: StatsEra) => boolean,
) => (era === null ? items : items.filter((item) => belongs(item, era)));

export class PlayerComparisonService {
  constructor(private readonly sources: PlayerComparisonSources) {}

  /** Season awards are undated, so an era leaves them out. */
  async compare(slugA: string, slugB: string, era: StatsEra | null) {
    const [playerA, playerB] = await Promise.all([this.player(slugA), this.player(slugB)]);

    if (playerA.id === playerB.id) {
      throw new InvalidInputError("Choose two different players to compare.");
    }

    const [a, b] = await Promise.all([this.career(playerA, era), this.career(playerB, era)]);

    return { a: a.career, b: b.career, headToHead: headToHead(a.matches, playerA.id, playerB.id) };
  }

  private async player(slug: string) {
    const player = await this.sources.players.findBySlug(slug);

    if (!player) {
      throw new NotFoundError(`Player with slug "${slug}" not found`);
    }

    return player;
  }

  private async career(player: Player, era: StatsEra | null) {
    const { contracts, tournaments, matches, prizes, awards, seasons } = this.sources;

    const [contractList, titles, matchList, earnings, awardList, seasonAwards] = await Promise.all([
      contracts.getContractsByPlayer(player.id),
      tournaments.getTournamentsWonByPlayer(player.id),
      matches.getMatchesByPlayer(player.id),
      prizes.playerEarnings(player.id, { era, redistributableOnly: true }),
      awards.findByPlayerId(player.id),
      seasons.awardsOfPlayer(player.id),
    ]);

    const redistributableMatches = keepInEra(
      matchList.filter(isRedistributableMatch),
      era,
      (match, current) => isInEra(playedOn(match), current),
    );

    return {
      career: {
        awards: keepInEra(
          awardList.filter(({ tournament }) => isRedistributable(tournament.source)),
          era,
          ({ tournament }, current) => isInEra(tournament.endAt, current),
        ),
        contracts: keepInEra(contractList, era, ({ startDate, endDate }, current) =>
          overlapsEra(startDate, endDate, current),
        ),
        earnings,
        player,
        seasonAwards: era === null ? seasonAwards : [],
        series: seriesRecord(redistributableMatches, player.id),
        titles: keepInEra(
          titles.filter(({ source }) => isRedistributable(source)),
          era,
          ({ endAt, beginAt }, current) => isInEra(endAt ?? beginAt, current),
        ),
      },
      matches: redistributableMatches,
    };
  }
}
