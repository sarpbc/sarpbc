import type { ManualGameService } from "../../match-stats/application/manual-game.service";
import type { StatsImportService } from "../../match-stats/application/stats-import.service";
import type { StatsPlayerLinkService } from "../../match-stats/application/stats-player-link.service";
import type { MatchService } from "../../tournament/application/match/match.service";
import type { ManualTournamentService } from "../../tournament/application/manual-tournament.service";
import type { ManualCatalogService } from "../../tournament/application/manual-catalog.service";
import type { EventQueries, TournamentQueries } from "../../tournament/application/ports";
import type { SyncNewTournamentsUseCase } from "../../tournament/application/sync/sync-new-tournaments.use-case";
import type { SyncPandascoreTournamentUseCase } from "../../tournament/application/sync/sync-pandascore-tournament.use-case";
import type { NewsService } from "../../news/application/news.service";
import type { PatUser } from "../../pat/application/pat.service";
import type { ContractService } from "../../roster/application/contract.service";
import type { PlayerService } from "../../roster/application/player.service";
import type { RosterProposalService } from "../../roster-proposal/application/roster-proposal.service";
import type { SearchService } from "../../search/application/search.service";
import type { TeamService } from "../../roster/application/team.service";
import type { TournamentPrizeService } from "../../tournament/application/tournament-prize.service";

export interface McpToolContext {
  user: PatUser;
  searchService: SearchService;
  playerService: PlayerService;
  contractService: ContractService;
  teamService: TeamService;
  tournaments: TournamentQueries;
  pandascoreTournamentSync: SyncPandascoreTournamentUseCase;
  pandascoreNewTournamentsSync: SyncNewTournamentsUseCase;
  manualTournamentService: ManualTournamentService;
  catalogService: ManualCatalogService;
  events: EventQueries;
  matchService: MatchService;
  newsService: NewsService;
  rosterProposalService: RosterProposalService;
  tournamentPrizeService: TournamentPrizeService;
  statsImportService: StatsImportService;
  statsPlayerLinkService: StatsPlayerLinkService;
  manualGameService: ManualGameService;
}
