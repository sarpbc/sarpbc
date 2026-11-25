import type { Provider } from "@nestjs/common";
import { CircuitService } from "../../circuit/application/circuit.service";
import { ManualGameService } from "../../match-stats/application/manual-game.service";
import { StatsImportService } from "../../match-stats/application/stats-import.service";
import { StatsPlayerLinkService } from "../../match-stats/application/stats-player-link.service";
import { TournamentPlayerStatsService } from "../../match-stats/application/tournament-player-stats.service";
import { NewsService } from "../../news/application/news.service";
import { ContractService } from "../../roster/application/contract.service";
import { PlayerService } from "../../roster/application/player.service";
import { TeamService } from "../../roster/application/team.service";
import { RosterProposalService } from "../../roster-proposal/application/roster-proposal.service";
import { SeasonService } from "../../season/application/season.service";
import { TimelineService } from "../../timeline/application/timeline.service";
import { ManualCatalogService } from "../../tournament/application/manual-catalog.service";
import { ManualTournamentService } from "../../tournament/application/manual-tournament.service";
import { MatchService } from "../../tournament/application/match/match.service";
import { MatchLineupService } from "../../tournament/application/match/match-lineup.service";
import type { EventQueries, TournamentQueries } from "../../tournament/application/ports";
import { PlayerAwardService } from "../../tournament/application/player-award.service";
import { SyncNewTournamentsUseCase } from "../../tournament/application/sync/sync-new-tournaments.use-case";
import { SyncPandascoreTournamentUseCase } from "../../tournament/application/sync/sync-pandascore-tournament.use-case";
import { TournamentPrizeService } from "../../tournament/application/tournament-prize.service";
import {
  EVENT_QUERIES,
  TOURNAMENT_QUERIES,
} from "../../tournament/infrastructure/competition-queries.tokens";

interface QueryToken<T> {
  readonly token: symbol;
  readonly provides?: T;
}

const query = <T>(token: symbol) => {
  const queryToken: QueryToken<T> = { token };

  return queryToken;
};

const SERVICES = {
  catalogService: ManualCatalogService,
  circuitService: CircuitService,
  contractService: ContractService,
  events: query<EventQueries>(EVENT_QUERIES),
  manualGameService: ManualGameService,
  manualTournamentService: ManualTournamentService,
  matchLineupService: MatchLineupService,
  matchService: MatchService,
  newsService: NewsService,
  pandascoreNewTournamentsSync: SyncNewTournamentsUseCase,
  pandascoreTournamentSync: SyncPandascoreTournamentUseCase,
  playerAwardService: PlayerAwardService,
  playerService: PlayerService,
  rosterProposalService: RosterProposalService,
  seasonService: SeasonService,
  statsImportService: StatsImportService,
  statsPlayerLinkService: StatsPlayerLinkService,
  teamService: TeamService,
  timelineService: TimelineService,
  tournamentPlayerStatsService: TournamentPlayerStatsService,
  tournamentPrizeService: TournamentPrizeService,
  tournaments: query<TournamentQueries>(TOURNAMENT_QUERIES),
};

type Provided<Entry> =
  Entry extends QueryToken<infer Service>
    ? Service
    : Entry extends abstract new (...args: never[]) => infer Service
      ? Service
      : never;

export type McpServices = { [Name in keyof typeof SERVICES]: Provided<(typeof SERVICES)[Name]> };

export const MCP_SERVICES = Symbol("McpServices");

const names = Object.keys(SERVICES);

export const mcpServicesProvider: Provider = {
  inject: Object.values(SERVICES).map((entry) => ("token" in entry ? entry.token : entry)),
  provide: MCP_SERVICES,
  useFactory: (...services: unknown[]) =>
    Object.fromEntries(names.map((name, index) => [name, services[index]])),
};
