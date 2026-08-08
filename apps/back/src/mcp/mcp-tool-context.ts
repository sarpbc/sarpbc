import type { UserToken } from "src/common/types/usertoken.interface";
import type { MatchService } from "src/tournament/match/match.service";
import type { NewsService } from "src/news/news.service";
import type { PlayerService } from "src/player/player.service";
import type { RedisService } from "src/redis/redis.service";
import type { SearchService } from "src/search/search.service";
import type { TeamService } from "src/team/team.service";
import type { TournamentService } from "src/tournament/tournament.service";
import type { UserService } from "src/user/user.service";

export interface McpToolContext {
  user: UserToken;
  searchService: SearchService;
  playerService: PlayerService;
  teamService: TeamService;
  tournamentService: TournamentService;
  matchService: MatchService;
  newsService: NewsService;
  userService: UserService;
  redisService: RedisService;
}
