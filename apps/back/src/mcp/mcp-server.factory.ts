import { Injectable } from "@nestjs/common";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { UserToken } from "src/common/types/usertoken.interface";
import { MatchService } from "src/tournament/match/match.service";
import { NewsService } from "src/news/news.service";
import { PlayerService } from "src/player/player.service";
import { RedisService } from "src/redis/redis.service";
import { SearchService } from "src/search/search.service";
import { TeamService } from "src/team/team.service";
import { TournamentService } from "src/tournament/tournament.service";
import { UserService } from "src/user/user.service";
import type { McpToolContext } from "./mcp-tool-context";
import { registerReadTools } from "./tools/read-tools";
import { registerWriteTools } from "./tools/write-tools";

@Injectable()
export class McpServerFactory {
  constructor(
    private readonly searchService: SearchService,
    private readonly playerService: PlayerService,
    private readonly teamService: TeamService,
    private readonly tournamentService: TournamentService,
    private readonly matchService: MatchService,
    private readonly newsService: NewsService,
    private readonly userService: UserService,
    private readonly redisService: RedisService,
  ) {}

  createServer(user: UserToken): McpServer {
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
      teamService: this.teamService,
      tournamentService: this.tournamentService,
      matchService: this.matchService,
      newsService: this.newsService,
      userService: this.userService,
      redisService: this.redisService,
    };

    registerReadTools(server, ctx);
    registerWriteTools(server, ctx);

    return server;
  }
}
