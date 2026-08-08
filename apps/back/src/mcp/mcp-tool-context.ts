import type { MatchService } from "src/tournament/match/match.service";
import type { NewsService } from "src/news/news.service";
import type { PatUser } from "src/pat/pat.service";
import type { PlayerService } from "src/player/player.service";
import type { SearchService } from "src/search/search.service";
import type { TeamService } from "src/team/team.service";
import type { TournamentService } from "src/tournament/tournament.service";

export interface McpToolContext {
  user: PatUser;
  searchService: SearchService;
  playerService: PlayerService;
  teamService: TeamService;
  tournamentService: TournamentService;
  matchService: MatchService;
  newsService: NewsService;
}
