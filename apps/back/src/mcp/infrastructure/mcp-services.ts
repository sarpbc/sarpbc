import type { Provider } from "@nestjs/common";
import { ManualGameService } from "../../match-stats/application/manual-game.service";
import { StatsImportService } from "../../match-stats/application/stats-import.service";
import { StatsPlayerLinkService } from "../../match-stats/application/stats-player-link.service";
import { NewsService } from "../../news/application/news.service";
import { ContractService } from "../../roster/application/contract.service";
import { PlayerService } from "../../roster/application/player.service";
import { TeamService } from "../../roster/application/team.service";
import { RosterProposalService } from "../../roster-proposal/application/roster-proposal.service";
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

function query<T>(token: symbol): QueryToken<T> {
  return { token };
}

const SERVICES = {
  playerService: PlayerService,
  contractService: ContractService,
  teamService: TeamService,
  tournaments: query<TournamentQueries>(TOURNAMENT_QUERIES),
  pandascoreTournamentSync: SyncPandascoreTournamentUseCase,
  pandascoreNewTournamentsSync: SyncNewTournamentsUseCase,
  manualTournamentService: ManualTournamentService,
  catalogService: ManualCatalogService,
  events: query<EventQueries>(EVENT_QUERIES),
  matchService: MatchService,
  matchLineupService: MatchLineupService,
  newsService: NewsService,
  rosterProposalService: RosterProposalService,
  tournamentPrizeService: TournamentPrizeService,
  playerAwardService: PlayerAwardService,
  statsImportService: StatsImportService,
  statsPlayerLinkService: StatsPlayerLinkService,
  manualGameService: ManualGameService,
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
  provide: MCP_SERVICES,
  inject: Object.values(SERVICES).map((entry) => ("token" in entry ? entry.token : entry)),
  useFactory: (...services: unknown[]) =>
    Object.fromEntries(names.map((name, index) => [name, services[index]])),
};
