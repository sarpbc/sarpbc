import { Injectable } from "@nestjs/common";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { PatUser } from "../../pat/application/pat.service";
import { ManualGameService } from "../../match-stats/application/manual-game.service";
import { StatsImportService } from "../../match-stats/application/stats-import.service";
import { StatsPlayerLinkService } from "../../match-stats/application/stats-player-link.service";
import { MatchService } from "../../tournament/application/match/match.service";
import { ManualTournamentService } from "../../tournament/application/manual-tournament.service";
import { ManualCatalogService } from "../../tournament/application/manual-catalog.service";
import { EventService } from "../../tournament/application/event.service";
import { NewsService } from "../../news/application/news.service";
import { ContractService } from "../../roster/application/contract.service";
import { PlayerService } from "../../roster/application/player.service";
import { RosterProposalService } from "../../roster-proposal/application/roster-proposal.service";
import { SearchService } from "../../search/application/search.service";
import { TeamService } from "../../roster/application/team.service";
import { TournamentService } from "../../tournament/application/tournament.service";
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
    private readonly searchService: SearchService,
    private readonly playerService: PlayerService,
    private readonly contractService: ContractService,
    private readonly teamService: TeamService,
    private readonly tournamentService: TournamentService,
    private readonly manualTournamentService: ManualTournamentService,
    private readonly catalogService: ManualCatalogService,
    private readonly eventService: EventService,
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
      searchService: this.searchService,
      playerService: this.playerService,
      contractService: this.contractService,
      teamService: this.teamService,
      tournamentService: this.tournamentService,
      manualTournamentService: this.manualTournamentService,
      catalogService: this.catalogService,
      eventService: this.eventService,
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
