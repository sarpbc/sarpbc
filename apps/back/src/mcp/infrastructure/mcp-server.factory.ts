import { Inject, Injectable } from "@nestjs/common";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { PatUser } from "../../pat/application/pat.service";
import { ManualGameService } from "../../match-stats/application/manual-game.service";
import { StatsImportService } from "../../match-stats/application/stats-import.service";
import { StatsPlayerLinkService } from "../../match-stats/application/stats-player-link.service";
import { MatchService } from "../../tournament/application/match/match.service";
import { ManualTournamentService } from "../../tournament/application/manual-tournament.service";
import { ManualCatalogService } from "../../tournament/application/manual-catalog.service";
import type { EventQueries, TournamentQueries } from "../../tournament/application/ports";
import { SyncNewTournamentsUseCase } from "../../tournament/application/sync/sync-new-tournaments.use-case";
import { SyncPandascoreTournamentUseCase } from "../../tournament/application/sync/sync-pandascore-tournament.use-case";
import {
  EVENT_QUERIES,
  TOURNAMENT_QUERIES,
} from "../../tournament/infrastructure/competition-queries.tokens";
import { NewsService } from "../../news/application/news.service";
import { ContractService } from "../../roster/application/contract.service";
import { PlayerService } from "../../roster/application/player.service";
import { RosterProposalService } from "../../roster-proposal/application/roster-proposal.service";
import { TeamService } from "../../roster/application/team.service";
import { TournamentPrizeService } from "../../tournament/application/tournament-prize.service";
import type { McpToolContext } from "./mcp-tool-context";
import { registerEventTools } from "./tools/event-tools";
import { registerGameStatsTools } from "./tools/game-stats-tools";
import { registerReadTools } from "./tools/read-tools";
import { registerRosterTools } from "./tools/roster-tools";
import { registerWriteTools } from "./tools/write-tools";

@Injectable()
export class McpServerFactory {
  constructor(
    private readonly playerService: PlayerService,
    private readonly contractService: ContractService,
    private readonly teamService: TeamService,
    @Inject(TOURNAMENT_QUERIES) private readonly tournaments: TournamentQueries,
    private readonly pandascoreTournamentSync: SyncPandascoreTournamentUseCase,
    private readonly pandascoreNewTournamentsSync: SyncNewTournamentsUseCase,
    private readonly manualTournamentService: ManualTournamentService,
    private readonly catalogService: ManualCatalogService,
    @Inject(EVENT_QUERIES) private readonly events: EventQueries,
    private readonly matchService: MatchService,
    private readonly newsService: NewsService,
    private readonly rosterProposalService: RosterProposalService,
    private readonly tournamentPrizeService: TournamentPrizeService,
    private readonly statsImportService: StatsImportService,
    private readonly statsPlayerLinkService: StatsPlayerLinkService,
    private readonly manualGameService: ManualGameService,
  ) {}

  createServer(user: PatUser): McpServer {
    const server = new McpServer(
      {
        name: "sarpbc-staff-mcp",
        version: "1.0.0",
      },
      { capabilities: { logging: {} } },
    );

    const ctx: McpToolContext = {
      user,
      playerService: this.playerService,
      contractService: this.contractService,
      teamService: this.teamService,
      tournaments: this.tournaments,
      pandascoreTournamentSync: this.pandascoreTournamentSync,
      pandascoreNewTournamentsSync: this.pandascoreNewTournamentsSync,
      manualTournamentService: this.manualTournamentService,
      catalogService: this.catalogService,
      events: this.events,
      matchService: this.matchService,
      newsService: this.newsService,
      rosterProposalService: this.rosterProposalService,
      tournamentPrizeService: this.tournamentPrizeService,
      statsImportService: this.statsImportService,
      statsPlayerLinkService: this.statsPlayerLinkService,
      manualGameService: this.manualGameService,
    };

    registerReadTools(server, ctx);
    registerEventTools(server, ctx);
    registerWriteTools(server, ctx);
    registerRosterTools(server, ctx);
    registerGameStatsTools(server, ctx);

    return server;
  }
}
