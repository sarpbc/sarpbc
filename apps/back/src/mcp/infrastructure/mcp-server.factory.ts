import { Injectable } from "@nestjs/common";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { PatUser } from "../../pat/application/pat.service";
import { MatchService } from "../../tournament/application/match/match.service";
import { ManualTournamentService } from "../../tournament/application/manual-tournament.service";
import { NewsService } from "../../news/application/news.service";
import { ContractService } from "../../player/application/contract.service";
import { PlayerService } from "../../player/application/player.service";
import { RosterProposalService } from "../../roster-proposal/application/roster-proposal.service";
import { SearchService } from "../../search/application/search.service";
import { TeamService } from "../../team/application/team.service";
import { TournamentService } from "../../tournament/application/tournament.service";
import type { McpToolContext } from "./mcp-tool-context";
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
    private readonly matchService: MatchService,
    private readonly newsService: NewsService,
    private readonly rosterProposalService: RosterProposalService,
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
      matchService: this.matchService,
      newsService: this.newsService,
      rosterProposalService: this.rosterProposalService,
    };

    registerReadTools(server, ctx);
    registerWriteTools(server, ctx);
    registerRosterTools(server, ctx);

    return server;
  }
}
