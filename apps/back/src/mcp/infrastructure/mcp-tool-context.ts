import type { MatchService } from "../../tournament/application/match/match.service";
import type { ManualTournamentService } from "../../tournament/application/manual-tournament.service";
import type { NewsService } from "../../news/application/news.service";
import type { PatUser } from "../../pat/application/pat.service";
import type { PlayerService } from "../../player/application/player.service";
import type { RosterProposalService } from "../../roster-proposal/application/roster-proposal.service";
import type { SearchService } from "../../search/application/search.service";
import type { TeamService } from "../../team/application/team.service";
import type { TournamentService } from "../../tournament/application/tournament.service";

export interface McpToolContext {
  user: PatUser;
  searchService: SearchService;
  playerService: PlayerService;
  teamService: TeamService;
  tournamentService: TournamentService;
  manualTournamentService: ManualTournamentService;
  matchService: MatchService;
  newsService: NewsService;
  rosterProposalService: RosterProposalService;
}
