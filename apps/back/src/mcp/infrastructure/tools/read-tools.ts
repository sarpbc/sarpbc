import { DEFAULT_PAGE_SIZE } from "@sarpbc/utils";
import { z } from "zod";
import { InvalidInputError } from "../../../common/domain/errors";
import type { NewsService } from "../../../news/application/news.service";
import type { ContractService } from "../../../roster/application/contract.service";
import type { PlayerService } from "../../../roster/application/player.service";
import type { TeamService } from "../../../roster/application/team.service";
import { defineTool, type McpTool } from "../define-tool";
import {
  mapCareer,
  mapMatchListResponse,
  mapNewsAdminArticle,
  mapNewsListItem,
  mapPlayerSummary,
  mapTeamAlias,
  mapTeamSummary,
  mapTournamentDetail,
  mapTournamentListItem,
} from "../mappers";
import type { RedistributableCompetition } from "../redistributable-competition";
import { requireByIdOrSlug } from "./find-by-id-or-slug";
import { PLAYER_TAG, TEAM_TAG } from "./news-syntax";
import { SEARCH_LIMIT, idOrSlugField, listLimit } from "./tool-input";

export interface ReadToolServices {
  playerService: Pick<PlayerService, "find" | "findById" | "findBySlug">;
  teamService: Pick<TeamService, "find" | "findById" | "findBySlug">;
  contractService: Pick<ContractService, "getContractsByPlayer">;
  newsService: Pick<NewsService, "findAll" | "findOneAdminByIdOrSlug">;
  competition: RedistributableCompetition;
}

export function readTools({
  playerService,
  teamService,
  contractService,
  newsService,
  competition,
}: ReadToolServices): McpTool[] {
  return [
    defineTool({
      name: "search_players",
      description: `Search Rocket League players by name. Returns matching players with id, slug, team, and public profile URL. When drafting news, use the slug in \`${PLAYER_TAG}\`.`,
      input: {
        query: z.string().min(1).describe("Player name or partial name to search for."),
      },
      handler: async ({ query }) => {
        const players = await playerService.find({ name: query, limit: SEARCH_LIMIT, offset: 0 });
        return players.map(mapPlayerSummary);
      },
    }),

    defineTool({
      name: "search_teams",
      description: `Search Rocket League teams by current or former name. Returns matching teams with id, slug, dated former names, and public profile URL. A former name found here is the same team: never create or merge a team for a rebrand. When drafting news, use the slug in \`${TEAM_TAG}\`.`,
      input: {
        query: z.string().min(1).describe("Team name or partial name to search for."),
      },
      handler: async ({ query }) => {
        const teams = await teamService.find({ name: query, limit: SEARCH_LIMIT, offset: 0 });
        return teams.map(mapTeamSummary);
      },
    }),

    defineTool({
      name: "get_player",
      description:
        "Get a player profile by slug or UUID. Returns core player fields, current team, and the public profile URL.",
      input: { idOrSlug: idOrSlugField("Player", "zen-rl") },
      handler: async ({ idOrSlug }) =>
        mapPlayerSummary(await requireByIdOrSlug(playerService, idOrSlug, "Player")),
    }),

    defineTool({
      name: "list_contracts",
      description:
        "List a player's contracts, past and current, oldest first, with their player or staff role and sources. Read it before create_contract or update_contract so a period is not recorded twice.",
      input: { idOrSlug: idOrSlugField("Player", "zen-rl") },
      handler: async ({ idOrSlug }) => {
        const player = await requireByIdOrSlug(playerService, idOrSlug, "Player");
        return mapCareer(player, await contractService.getContractsByPlayer(player.id));
      },
    }),

    defineTool({
      name: "get_team",
      description:
        "Get a team profile by slug or UUID, including the current roster when available and its dated former names (formerNames).",
      input: { idOrSlug: idOrSlugField("Team") },
      handler: async ({ idOrSlug }) =>
        mapTeamSummary(await requireByIdOrSlug(teamService, idOrSlug, "Team")),
    }),

    defineTool({
      name: "list_team_aliases",
      description:
        "List a team's dated former names (rebrands and sponsor names), oldest first, with their period, source, optional logo and optional PandaScore team id. Past tournaments and matches show the name in force on their date. Read it before add_team_alias or update_team_alias.",
      input: { idOrSlug: idOrSlugField("Team") },
      handler: async ({ idOrSlug }) => {
        const team = await requireByIdOrSlug(teamService, idOrSlug, "Team");
        return { teamId: team.id, name: team.name, aliases: team.aliases.map(mapTeamAlias) };
      },
    }),

    defineTool({
      name: "get_tournaments",
      description:
        "List tournaments on sarpbc.org. Use activeOnly to focus on open events with pick'ems still available.",
      input: {
        activeOnly: z
          .boolean()
          .optional()
          .describe("When true, return only active tournaments (no winner, not ended)."),
        limit: listLimit("tournaments"),
      },
      handler: async ({ activeOnly, limit }) => {
        const tournaments = await competition.tournaments({
          activeOnly: activeOnly ?? false,
          limit: limit ?? DEFAULT_PAGE_SIZE,
        });
        return tournaments.map(mapTournamentListItem);
      },
    }),

    defineTool({
      name: "get_tournament",
      description:
        "Get full tournament detail, including matches, the public URL, and format (1v1, 2v2 or 3v3) and registered participants (participant id, display name, team id, slug and name or null for a participant without a team, and players). start.gg tournaments are not returned.",
      input: { id: z.string().min(1).describe("Tournament UUID.") },
      handler: async ({ id }) => mapTournamentDetail(await competition.tournament(id)),
    }),

    defineTool({
      name: "get_tournament_prizes",
      description:
        "Get a tournament stage prize distribution: placement, amount and ISO 4217 currency per team, with the players it lists. prizepool is the overall prize pool synced from PandaScore. Amounts are never converted between currencies.",
      input: { id: z.string().min(1).describe("Tournament UUID.") },
      handler: async ({ id }) => {
        const distribution = await competition.prizeDistribution(id);
        return { tournamentId: id, prizepool: distribution.prizepool, prizes: distribution.prizes };
      },
    }),

    defineTool({
      name: "get_tournament_player_stats",
      description:
        "Get per-player stats aggregated over a tournament stage (tournamentId) or a whole event (event), from the Ballchasing games imported for it. Each row is a sarpbc.org player with the team they played for (a stand-in counts for the side they played on): games, totals and per-game averages of goals, assists, saves, shots and demolitions, shootingPercentage (goals per shot) and goalParticipation (goals and assists per goal of their side), both percentages or null. Game accounts not linked to a player are only counted in unlinkedAccounts; link them with link_game_player. games is 0 when no stats were imported. start.gg tournaments are not returned, and an event only counts its other stages.",
      input: {
        tournamentId: z.string().min(1).optional().describe("Tournament stage UUID."),
        event: z.string().min(1).optional().describe("Event UUID or slug."),
      },
      handler: async ({ tournamentId, event }) => {
        if (tournamentId && !event) return competition.tournamentPlayerStats(tournamentId);
        if (event && !tournamentId) return competition.eventPlayerStats(event);
        throw new InvalidInputError("Pass either tournamentId or event.");
      },
    }),

    defineTool({
      name: "get_tournament_awards",
      description:
        "Get the player awards already recorded for one tournament stage: award id, type, player and team. A stage has at most one award of each type. Read it before propose_player_award.",
      input: { id: z.string().min(1).describe("Tournament stage UUID.") },
      handler: async ({ id }) => {
        const awards = await competition.tournamentAwards(id);
        return {
          tournamentId: id,
          awards: awards.map(({ id: awardId, awardType, player, participant }) => ({
            id: awardId,
            awardType,
            player,
            team: participant.team,
          })),
        };
      },
    }),

    defineTool({
      name: "get_match_lineups",
      description:
        "Get the lineups entered for one match (series): per participant id, the players who actually played, in order. standIn is true for a player who is not on that participant's tournament roster. A match without entered lineups returns an empty list. start.gg matches are not returned. Read it before set_match_lineups.",
      input: { matchId: z.string().min(1).describe("Match UUID.") },
      handler: async ({ matchId }) => {
        const lineups = await competition.matchLineups(matchId);
        return {
          matchId,
          lineups: lineups.map(({ participantId, players }) => ({
            participantId,
            players: players.map(({ id, name, slug, standIn }) => ({ id, name, slug, standIn })),
          })),
        };
      },
    }),

    defineTool({
      name: "get_team_earnings",
      description:
        "Get a team prize earnings by year, with totals per currency (amounts are never converted).",
      input: { idOrSlug: idOrSlugField("Team") },
      handler: async ({ idOrSlug }) => {
        const team = await requireByIdOrSlug(teamService, idOrSlug, "Team");
        return competition.teamEarnings(team.id);
      },
    }),

    defineTool({
      name: "get_player_earnings",
      description:
        "Get a player prize earnings by year, with totals per currency (amounts are never converted). A prize that lists players is split equally between them.",
      input: { idOrSlug: idOrSlugField("Player", "zen-rl") },
      handler: async ({ idOrSlug }) => {
        const player = await requireByIdOrSlug(playerService, idOrSlug, "Player");
        return competition.playerEarnings(player.id);
      },
    }),

    defineTool({
      name: "get_upcoming_matches",
      description:
        "List upcoming and live matches across tournaments, mirroring the public /matches page.",
      input: { limit: listLimit("matches per category") },
      handler: async ({ limit }) => {
        const [[upcomingMatches, upcomingTotal], [liveMatches, liveTotal]] = await Promise.all([
          competition.matches("upcoming", limit ?? DEFAULT_PAGE_SIZE),
          competition.matches("live", limit ?? DEFAULT_PAGE_SIZE),
        ]);

        return {
          upcoming: upcomingMatches.map(mapMatchListResponse),
          live: liveMatches.map(mapMatchListResponse),
          upcomingTotal,
          liveTotal,
          total: upcomingTotal + liveTotal,
        };
      },
    }),

    defineTool({
      name: "get_match_results",
      description:
        "List recently finished match results across tournaments, mirroring the public /matches results view.",
      input: { limit: listLimit("results") },
      handler: async ({ limit }) => {
        const [results, total] = await competition.matches("results", limit ?? DEFAULT_PAGE_SIZE);
        return { results: results.map(mapMatchListResponse), total };
      },
    }),

    defineTool({
      name: "list_news_articles",
      description:
        "List news articles including drafts. Returns titles and slugs without full body — use get_news_article before editing.",
      permission: "news.manage",
      input: {
        page: z.number().int().min(0).optional().describe("0-based page index (default 0)."),
        limit: listLimit("articles per page"),
      },
      handler: async ({ page, limit }) => {
        const result = await newsService.findAll(page ?? 0, limit ?? DEFAULT_PAGE_SIZE);
        return {
          data: result.data.map(mapNewsListItem),
          total: result.total,
          page: result.page,
          limit: result.limit,
        };
      },
    }),

    defineTool({
      name: "get_news_article",
      description:
        "Get a news article by slug or UUID, including unpublished drafts and both English and French fields. Use this before update_news_article.",
      permission: "news.manage",
      input: { idOrSlug: idOrSlugField("Article", "zen-joins-karmine-corp") },
      handler: async ({ idOrSlug }) =>
        mapNewsAdminArticle(await newsService.findOneAdminByIdOrSlug(idOrSlug)),
    }),
  ];
}
