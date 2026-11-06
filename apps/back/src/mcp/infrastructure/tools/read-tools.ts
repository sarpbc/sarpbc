import { DEFAULT_PAGE_SIZE } from "@sarpbc/utils";
import { z } from "zod";
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
      description: `Search Rocket League teams by name. Returns matching teams with id, slug, and public profile URL. When drafting news, use the slug in \`${TEAM_TAG}\`.`,
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
        "Get a team profile by slug or UUID, including the current roster when available.",
      input: { idOrSlug: idOrSlugField("Team") },
      handler: async ({ idOrSlug }) =>
        mapTeamSummary(await requireByIdOrSlug(teamService, idOrSlug, "Team")),
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
        "Get full tournament detail, including matches, the public URL, and registered participants (participant id plus team id, slug and name). start.gg tournaments are not returned.",
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
