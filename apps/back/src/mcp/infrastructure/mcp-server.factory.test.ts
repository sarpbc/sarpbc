import { describe, expect, it } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { unconstructed } from "../../../test/doubles";
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
import { ManualCatalogService } from "../../tournament/application/manual-catalog.service";
import { ManualTournamentService } from "../../tournament/application/manual-tournament.service";
import { MatchService } from "../../tournament/application/match/match.service";
import { MatchLineupService } from "../../tournament/application/match/match-lineup.service";
import { PlayerAwardService } from "../../tournament/application/player-award.service";
import { SyncNewTournamentsUseCase } from "../../tournament/application/sync/sync-new-tournaments.use-case";
import { SyncPandascoreTournamentUseCase } from "../../tournament/application/sync/sync-pandascore-tournament.use-case";
import { TournamentPrizeService } from "../../tournament/application/tournament-prize.service";
import { McpServerFactory } from "./mcp-server.factory";
import type { McpServices } from "./mcp-services";

const TOOL_NAMES = [
  "search_players",
  "search_teams",
  "get_player",
  "list_contracts",
  "get_team",
  "get_tournaments",
  "get_tournament",
  "get_tournament_prizes",
  "get_tournament_awards",
  "get_tournament_player_stats",
  "get_match_lineups",
  "get_team_earnings",
  "get_player_earnings",
  "get_upcoming_matches",
  "get_match_results",
  "list_news_articles",
  "get_news_article",
  "list_leagues",
  "create_league",
  "update_league",
  "list_events",
  "get_event",
  "create_event",
  "update_event",
  "create_news_draft",
  "update_news_article",
  "create_match",
  "set_match_winner",
  "set_match_game_vods",
  "update_match",
  "set_match_source",
  "create_tournament",
  "update_tournament",
  "link_pandascore_tournament",
  "trigger_tournament_sync",
  "sync_pandascore_tournament",
  "add_player_to_team",
  "remove_player_from_team",
  "create_player",
  "update_player",
  "create_team",
  "update_team",
  "add_team_alias",
  "update_team_alias",
  "list_team_aliases",
  "upload_team_logo",
  "merge_players",
  "merge_teams",
  "create_contract",
  "create_empty_bracket",
  "update_contract",
  "propose_tournament_prizes",
  "propose_tournament_prize_update",
  "propose_player_award",
  "propose_season_award",
  "set_event_streams",
  "set_tournament_streams",
  "set_match_streams",
  "set_match_lineups",
  "set_event_viewership",
  "set_match_viewership",
  "set_circuit_stage_scale",
  "propose_delete_match",
  "propose_delete_team",
  "list_roster_proposals",
  "import_game_stats",
  "get_game_stats_import",
  "list_unlinked_game_players",
  "link_game_player",
  "attach_replay_to_game",
  "remove_match_game",
  "list_circuits",
  "get_circuit",
  "list_seasons",
  "get_season",
  "create_circuit",
  "update_circuit",
];

const unused = async (): Promise<never> => await Promise.reject(new Error("unused"));

const services: McpServices = {
  playerService: unconstructed(PlayerService),
  contractService: unconstructed(ContractService),
  teamService: unconstructed(TeamService),
  tournaments: {
    find: unused,
    searchByName: unused,
    findById: unused,
    findPandascoreWithoutMatches: unused,
    findPandascoreActive: unused,
    getTournamentsByPlayer: unused,
    getTournamentsByTeam: unused,
    getTournamentsByTeamTenures: unused,
    getTournamentsWonByPlayer: unused,
    getTournamentsWonByTeam: unused,
    wonOnDay: unused,
    finalsOnDay: unused,
    knownPandascoreIds: unused,
    findByPandascoreId: unused,
    leagues: unused,
  },
  pandascoreTournamentSync: unconstructed(SyncPandascoreTournamentUseCase),
  pandascoreNewTournamentsSync: unconstructed(SyncNewTournamentsUseCase),
  manualTournamentService: unconstructed(ManualTournamentService),
  catalogService: unconstructed(ManualCatalogService),
  events: { list: unused, find: unused, unsynced: unused, stageId: unused },
  matchService: unconstructed(MatchService),
  matchLineupService: unconstructed(MatchLineupService),
  newsService: unconstructed(NewsService),
  rosterProposalService: unconstructed(RosterProposalService),
  tournamentPrizeService: unconstructed(TournamentPrizeService),
  playerAwardService: unconstructed(PlayerAwardService),
  statsImportService: unconstructed(StatsImportService),
  statsPlayerLinkService: unconstructed(StatsPlayerLinkService),
  manualGameService: unconstructed(ManualGameService),
  tournamentPlayerStatsService: unconstructed(TournamentPlayerStatsService),
  circuitService: unconstructed(CircuitService),
  seasonService: unconstructed(SeasonService),
};

describe(McpServerFactory, () => {
  it("serves every tool with a JSON schema and a stated permission", async () => {
    const factory = new McpServerFactory(services);
    const server = factory.createServer({ id: "u1", email: "staff@test.com", role: "admin" });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const client = new Client({ name: "test", version: "1.0.0" });
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);

    const { tools } = await client.listTools();

    expect(tools.map((tool) => tool.name).toSorted()).toEqual(TOOL_NAMES.toSorted());

    for (const tool of tools.filter((candidate) => candidate.name.startsWith("create_"))) {
      expect(tool.description, tool.name).toMatch(/Requires \w+\.manage\.$/);
    }

    await client.close();
  });
});
