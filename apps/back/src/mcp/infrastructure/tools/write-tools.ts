import { z } from "zod";
import { MAX_VODS_PER_GAME } from "@sarpbc/utils";
import type { NewsService } from "../../../news/application/news.service";
import { createNewsArticleFields } from "../../../news/infrastructure/http/dto/create-news-article.dto";
import { updateNewsArticleFields } from "../../../news/infrastructure/http/dto/update-news-article.dto";
import type { PlayerService } from "../../../roster/application/player.service";
import type { TeamService } from "../../../roster/application/team.service";
import type { ManualTournamentService } from "../../../tournament/application/manual-tournament.service";
import type { MatchService } from "../../../tournament/application/match/match.service";
import type { TournamentQueries } from "../../../tournament/application/ports";
import type {
  SyncNewTournamentsResult,
  SyncNewTournamentsUseCase,
} from "../../../tournament/application/sync/sync-new-tournaments.use-case";
import type { SyncPandascoreTournamentUseCase } from "../../../tournament/application/sync/sync-pandascore-tournament.use-case";
import { matchPublicSlug } from "../../../tournament/domain/competition";
import {
  createTournamentFields,
  updateTournamentFields,
} from "../../../tournament/infrastructure/http/dto/create-tournament.dto";
import { defineTool, type McpTool, type ToolWrite } from "../define-tool";
import { mapListedParticipants, mapMatchListResponse } from "../mappers";
import { tournamentNotFound } from "../redistributable-competition";
import { adminNewsEditUrl, matchUrl, tournamentUrl } from "../urls";
import { BODY_TAGS } from "./news-syntax";
import { resolveMatchParticipantIds } from "./resolve-match-participants";
import { dataSourceUrlField, describeFields, toPatchedDate } from "./tool-input";
import {
  bracketLinksSchema,
  emptyBracketTeamsSchema,
} from "../../../tournament/infrastructure/http/dto/create-match.dto";
import { isRedistributable } from "../../../common/domain/data-source";
import { requireUpdateFields } from "./update-fields";

const matchSourceUrlInput = dataSourceUrlField(
  "Public page the match, its schedule or its score was taken from: the organiser's announcement, the official Rocket League rules or the start.gg or PandaScore page. Never Liquipedia, a mirror of it or BLAST.tv.",
);

const matchResultSchema = z.object({
  participantId: z.string().nullable(),
  score: z.number(),
});

const previousMatchesInput = bracketLinksSchema.describe(
  "Bracket feeders of this manual match: up to two { previousMatchId, type } entries, where previousMatchId is a match UUID of the same stage and type says whether its winner or loser plays here. The stage must have hasBracket enabled. Links must not form a cycle, and the winner (or loser) of a match feeds a single match.",
);

type TriggeredSync =
  | { success: true; scope: "single"; tournamentId: string }
  | { success: true; scope: "new_tournaments"; sync: SyncNewTournamentsResult };

const NEWS_TYPE_MEANING =
  "short = follow the scene (results, rosters, announcements). article = understand the scene (analysis, context, stories).";

export interface WriteToolServices {
  newsService: Pick<NewsService, "create" | "update" | "findOneAdminByIdOrSlug">;
  tournaments: Pick<TournamentQueries, "findById">;
  teamService: Pick<TeamService, "findById" | "findBySlug">;
  playerService: Pick<PlayerService, "findById" | "findBySlug">;
  matchService: Pick<
    MatchService,
    | "createMatch"
    | "createEmptyBracket"
    | "setMatchWinner"
    | "setGameVods"
    | "updateMatch"
    | "setSource"
  >;
  manualTournamentService: Pick<ManualTournamentService, "create" | "update">;
  pandascoreTournamentSync: Pick<
    SyncPandascoreTournamentUseCase,
    "execute" | "executeByPandascoreId"
  >;
  pandascoreNewTournamentsSync: Pick<SyncNewTournamentsUseCase, "execute">;
}

export function writeTools({
  newsService,
  tournaments,
  teamService,
  playerService,
  matchService,
  manualTournamentService,
  pandascoreTournamentSync,
  pandascoreNewTournamentsSync,
}: WriteToolServices): McpTool[] {
  return [
    defineTool({
      name: "create_news_draft",
      description: `Create a news article draft. Write the English title and body. Optionally add French title and body so /fr readers see French. When mentioning a player or team, you MUST use the custom MDC components and resolve slugs with search_players / search_teams first; do not use plain names when a slug exists. When the primary source is an X/Twitter post, put the tweet tag on its own line in both English and French bodies (same URL). ${BODY_TAGS} A human must review and publish it in the admin app.`,
      write: true,
      permission: "news.manage",
      input: describeFields(createNewsArticleFields, {
        title: "English article headline.",
        content: "English article body in markdown.",
        titleFr: "Optional French headline.",
        contentFr:
          "Optional French body in markdown. Use the same player/team/tweet/match tags as English.",
        imageUrl: "Optional cover image URL.",
        slug: "Optional URL slug. Generated from the English title when omitted.",
        type: `${NEWS_TYPE_MEANING} Defaults to short.`,
      }),
      handler: async (input, user) => {
        const article = await newsService.create(input, user.id);

        return {
          entityId: article.id,
          result: {
            id: article.id,
            title: article.title,
            slug: article.slug,
            isDraft: article.isDraft,
            type: article.type,
            adminEditUrl: adminNewsEditUrl(article.slug),
            note: "Draft created. A staff member must review and publish it in the admin app.",
          },
        };
      },
    }),

    defineTool({
      name: "update_news_article",
      description: `Update an existing news article. Pass only the fields to change. Pass null for titleFr, contentFr, or imageUrl to clear them. Does not publish: a human must review and publish in the admin app. When mentioning a player or team, you MUST use the custom MDC components. ${BODY_TAGS}`,
      write: true,
      permission: "news.manage",
      input: {
        idOrSlug: z.string().min(1).describe("Current article slug or UUID."),
        ...describeFields(updateNewsArticleFields, {
          title: "Updated English headline.",
          content: "Updated English body in markdown.",
          titleFr: "Updated French headline, or null to clear.",
          contentFr:
            "Updated French body in markdown, or null to clear. Keep the same tweet and match tags.",
          imageUrl: "Updated cover image URL, or null to clear.",
          slug: "New URL slug. Leave omitted to keep the current slug.",
          type: NEWS_TYPE_MEANING,
        }),
      },
      handler: async ({ idOrSlug, ...fields }) => {
        requireUpdateFields(fields);

        const current = await newsService.findOneAdminByIdOrSlug(idOrSlug);
        const article = await newsService.update(current.slug, fields);

        return {
          entityId: article.id,
          result: {
            id: article.id,
            title: article.title,
            slug: article.slug,
            isDraft: article.isDraft,
            hasFrench: article.hasFrench,
            type: article.type,
            adminEditUrl: adminNewsEditUrl(article.slug),
            note: "Article updated. Publishing remains a human action in the admin app.",
          },
        };
      },
    }),

    defineTool({
      name: "create_match",
      description:
        "Create a tournament match. Pass participantIds (tournament participant UUIDs from get_tournament), teams (team UUIDs or slugs from search_teams or get_tournament) and/or players (player UUIDs or slugs, for 1v1 and 2v2 participants without a team). Every team or player must already be registered in the tournament. At least two different sides are required. results still use participant UUIDs. The response lists participants for manual and PandaScore tournaments. start.gg tournaments are not returned by get_tournament.",
      write: true,
      permission: "tournaments.manage",
      input: {
        tournamentId: z.string().min(1).describe("Tournament UUID the match belongs to."),
        name: z
          .string()
          .min(1)
          .describe("Match display name carrying its round (e.g. Semi-final 1, Grand Final)."),
        beginAt: z.string().optional().describe("Scheduled start time (ISO 8601 date string)."),
        endAt: z.string().optional().describe("Scheduled or actual end time (ISO 8601)."),
        status: z
          .string()
          .optional()
          .describe("Match status (e.g. not_started, running, finished)."),
        numberOfGames: z.number().int().optional().describe("Best-of series length."),
        participantIds: z
          .array(z.string().min(1))
          .optional()
          .describe(
            "Tournament participant UUIDs from get_tournament. Optional when teams or players is set. At least two different sides in total.",
          ),
        teams: z
          .array(z.string().min(1))
          .optional()
          .describe(
            "Team UUIDs or slugs. Each one must already be registered in the tournament and is resolved to its participant id. Optional when participantIds or players is set.",
          ),
        players: z
          .array(z.string().min(1))
          .optional()
          .describe(
            "Player UUIDs or slugs of 1v1 or 2v2 participants without a team. Each one is resolved to the participant it plays in; one player of a duo is enough. Optional when participantIds or teams is set.",
          ),
        results: z
          .array(matchResultSchema)
          .optional()
          .describe(
            "Per-participant scores, keyed by tournament participant UUID from get_tournament. Sets the winner when status is finished.",
          ),
        previousMatches: previousMatchesInput.optional(),
        sourceUrl: matchSourceUrlInput.optional(),
      },
      handler: async ({
        tournamentId,
        name,
        beginAt,
        endAt,
        status,
        numberOfGames,
        participantIds,
        teams,
        players,
        results,
        previousMatches,
        sourceUrl,
      }) => {
        const tournament = await tournaments.findById(tournamentId);

        if (!tournament) throw tournamentNotFound(tournamentId);

        const participants = await resolveMatchParticipantIds(
          tournament,
          { participantIds, teams, players },
          { teams: teamService, players: playerService },
        );

        const match = await matchService.createMatch(tournamentId, {
          name,
          beginAt: beginAt ? new Date(beginAt) : undefined,
          endAt: endAt ? new Date(endAt) : undefined,
          status,
          numberOfGames,
          participantIds: participants.map((participant) => participant.id),
          results,
          previousMatches,
          sourceUrl,
        });

        return {
          entityId: match.id,
          result: {
            id: match.id,
            name: match.name,
            tournamentId,
            ...mapListedParticipants(tournament.source, participants),
            url: matchUrl(match.publicId, matchPublicSlug(match)),
          },
        };
      },
    }),

    defineTool({
      name: "set_match_winner",
      description:
        "Set the winner of a finished match by tournament participant id from get_tournament.",
      write: true,
      permission: "tournaments.manage",
      input: {
        matchId: z.string().min(1).describe("Match UUID."),
        winnerId: z.string().min(1).describe("Tournament participant UUID of the winning team."),
      },
      handler: async ({ matchId, winnerId }) => {
        const match = await matchService.setMatchWinner(matchId, winnerId);

        return {
          entityId: match.id,
          result: {
            id: match.id,
            winnerId,
            url: matchUrl(match.publicId, matchPublicSlug(match)),
          },
        };
      },
    }),

    defineTool({
      name: "set_match_game_vods",
      description:
        "Replace the VOD links of one game of a match (any source, PandaScore included). Links are https twitch.tv, youtube.com or youtu.be URLs, optionally timestamped with t= (seconds or 1h2m3s); the source is derived from the host. Pass an empty list to clear the game. Returns every VOD link of the match.",
      write: true,
      permission: "tournaments.manage",
      input: {
        matchId: z.string().min(1).describe("Match UUID."),
        game: z.number().int().min(1).describe("Game number in the series, starting at 1."),
        links: z
          .array(
            z.object({
              url: z.string().min(1).max(2048).describe("https VOD URL, optionally with t=."),
              language: z
                .string()
                .min(2)
                .max(2)
                .describe("ISO 639-1 language of the broadcast (e.g. en, fr, de, es)."),
              source: z
                .enum(["twitch", "youtube"])
                .optional()
                .describe("Must match the URL host when given."),
            }),
          )
          .max(MAX_VODS_PER_GAME)
          .describe("VOD links for this game; replaces the existing ones."),
      },
      handler: async ({ matchId, game, links }) => {
        const match = await matchService.setGameVods(matchId, game, links);

        return {
          entityId: match.id,
          result: {
            id: match.id,
            vods: match.vods,
            url: matchUrl(match.publicId, matchPublicSlug(match)),
          },
        };
      },
    }),

    defineTool({
      name: "update_match",
      description:
        "Correct the score, status, dates, participants or bracket links of a manual match (pandascoreId is null). Use set_match_source to record where the match data comes from. Scores replace all existing scores; on a finished match they also set the winner. A status other than finished clears the winner. participantIds fills or replaces the sides of a match, for example an empty bracket slot once its teams are known; changing the sides of a scored match needs its new results in the same call. previousMatches replaces every bracket link of the match; pass an empty list to clear them.",
      write: true,
      permission: "tournaments.manage",
      input: {
        matchId: z.string().min(1).describe("Match UUID."),
        beginAt: z
          .string()
          .datetime({ offset: true })
          .nullable()
          .optional()
          .describe("Start time (ISO 8601), or null."),
        endAt: z
          .string()
          .datetime({ offset: true })
          .nullable()
          .optional()
          .describe("End time (ISO 8601), or null."),
        status: z.enum(["not_started", "running", "finished"]).optional().describe("Match status."),
        results: z
          .array(z.object({ participantId: z.string().min(1), score: z.number().int().min(0) }))
          .min(2)
          .optional()
          .describe(
            "Score of every match participant, keyed by tournament participant UUID from get_tournament.",
          ),
        participantIds: z
          .array(z.string().min(1))
          .max(2)
          .optional()
          .describe(
            "Every side of the match, as tournament participant UUIDs from get_tournament, in display order. Replaces the current sides; an empty list empties the match.",
          ),
        previousMatches: previousMatchesInput.optional(),
      },
      handler: async ({
        matchId,
        beginAt,
        endAt,
        status,
        results,
        participantIds,
        previousMatches,
      }) => {
        requireUpdateFields({ beginAt, endAt, status, results, participantIds, previousMatches });

        const match = await matchService.updateMatch(matchId, {
          beginAt: toPatchedDate(beginAt),
          endAt: toPatchedDate(endAt),
          status,
          results,
          participantIds,
          previousMatches,
        });

        return { entityId: match.id, result: mapMatchListResponse(match) };
      },
    }),

    defineTool({
      name: "set_match_source",
      description:
        "Record or clear the public source of a match: where its schedule, sides or score were taken from. Works on any match, PandaScore included, and changes nothing else.",
      write: true,
      permission: "tournaments.manage",
      input: {
        matchId: z.string().min(1).describe("Match UUID."),
        sourceUrl: matchSourceUrlInput.nullable().describe("Public source, or null to clear it."),
      },
      handler: async ({ matchId, sourceUrl }) => {
        const match = await matchService.setSource(matchId, sourceUrl);

        return { entityId: match.id, result: mapMatchListResponse(match) };
      },
    }),

    defineTool({
      name: "create_empty_bracket",
      description:
        "Generate an empty single-elimination bracket on a manual stage that has hasBracket enabled and no match yet: 4 teams gives two semifinals and a grand final (3 matches), 8 teams four quarterfinals, two semifinals and a grand final (7 matches), 16 teams 15 matches. Matches are created not started, without teams or dates, each winner linked to the next round. Fill each match later with update_match participantIds and beginAt. To undo, delete the matches from the final backwards.",
      write: true,
      permission: "tournaments.manage",
      input: {
        tournamentId: z.string().min(1).describe("Manual stage UUID."),
        teams: emptyBracketTeamsSchema.describe("Number of teams in the bracket: 4, 8 or 16."),
        numberOfGames: z
          .number()
          .int()
          .min(1)
          .max(9)
          .optional()
          .describe("Best-of length given to every generated match."),
      },
      handler: async ({ tournamentId, teams, numberOfGames }) => {
        const tournament = await tournaments.findById(tournamentId);

        if (!tournament) throw tournamentNotFound(tournamentId);

        const matches = await matchService.createEmptyBracket(tournamentId, {
          teams,
          numberOfGames,
        });

        const result = {
          tournamentId,
          created: matches.length,
          url: tournamentUrl(tournament),
        };

        return {
          entityId: tournamentId,
          result: isRedistributable(tournament.source)
            ? { ...result, matches: matches.map(mapMatchListResponse) }
            : result,
        };
      },
    }),

    defineTool({
      name: "create_tournament",
      description:
        "Create a manual tournament on sarpbc.org. PandaScore-synced tournaments cannot be created through this tool. Pass eventId to add it as a stage (phase) of an existing event from list_events or create_event; otherwise it gets an event of its own named after it. The response includes participants (participant id plus team id, slug and name) unless source is startgg.",
      write: true,
      permission: "tournaments.manage",
      input: describeFields(createTournamentFields, {
        name: "Tournament display name; the stage name when eventId is set (e.g. Finals).",
        eventId: "Event UUID to add this tournament to as a stage. Omit to create its own event.",
        slug: "Optional URL slug of the new event. Generated from the name when omitted. Not allowed with eventId.",
        tier: "Optional competitive tier label (e.g. S-Tier).",
        leagueId: "Optional league UUID from list_leagues.",
        beginAt: "Start date (YYYY-MM-DD).",
        endAt: "End date (YYYY-MM-DD).",
        imageUrl: "Optional cover image URL.",
        format:
          "Team size: 1v1, 2v2 or 3v3 (default). A 1v1 tournament has player participants only, a 3v3 tournament team participants only, a 2v2 tournament either.",
        teamIds:
          "Team UUIDs to register as participants. Use search_teams to find ids. Each participant gets a snapshot of its team's current active players as its roster; correct it with update_tournament rosters. Not allowed in 1v1. The response lists each participant id.",
        playerParticipants:
          "Participants without a team, for 1v1 and 2v2: each entry lists the player UUIDs of one participant (one player in 1v1, two in 2v2). Use search_players to find ids. Never create a team for a single player. The response lists each participant id.",
        source:
          "startgg when the data comes from start.gg; MCP reads then never return it. Defaults to manual.",
        hasBracket:
          "Show this stage as a bracket tree once its matches are linked (previousMatches on create_match or update_match), or generate one with create_empty_bracket.",
      }),
      handler: async (input) => {
        const tournament = await manualTournamentService.create(input);

        return {
          entityId: tournament.id,
          result: {
            id: tournament.id,
            name: tournament.name,
            slug: tournament.slug,
            source: tournament.source,
            event: tournament.event,
            ...mapListedParticipants(tournament.source, tournament.participants),
            url: tournamentUrl(tournament),
          },
        };
      },
    }),

    defineTool({
      name: "update_tournament",
      description:
        "Update a tournament. For PandaScore-synced tournaments, send only imageUrl and/or endAt; all other fields are managed by the sync. An endAt sent on a synced tournament is kept as a staff correction that the sync no longer overwrites (closes a stage PandaScore left open); pass endAt null to hand the end date back to the sync. Manual tournaments accept all listed fields. eventId moves a manual tournament to another event as one of its stages; the event it leaves stays stored but drops off the site once it has no stage. A tournament that has an event of its own keeps that event's name, slug and league in step with its own; rename or re-slug a shared event with update_event. The response includes participants for manual and PandaScore tournaments.",
      write: true,
      permission: "tournaments.manage",
      input: {
        tournamentId: z.string().min(1).describe("Tournament UUID to update."),
        ...describeFields(updateTournamentFields, {
          name: "Tournament display name.",
          eventId: "Event UUID to move this manual tournament to, from list_events or get_event.",
          slug: "URL slug of the event this tournament has of its own. Not allowed with eventId.",
          tier: "Competitive tier label, or null to clear.",
          leagueId: "League UUID, or null to clear the league.",
          beginAt: "Start date (YYYY-MM-DD), or null.",
          endAt: "End date (YYYY-MM-DD), or null.",
          imageUrl: "Cover image URL, or null.",
          format:
            "Team size: 1v1, 2v2 or 3v3. The current participants (or the teamIds and playerParticipants sent with it) must fit the new format.",
          teamIds:
            "Replace participating teams with this list of team UUIDs. A newly added team gets a snapshot of its current active players as its tournament roster. Participants without a team are kept. The response lists each participant id.",
          playerParticipants:
            "Replace the participants without a team (1v1 players, 2v2 duos) with this list; each entry lists the player UUIDs of one participant. Team participants are kept. The response lists each participant id.",
          rosters:
            "Manual tournaments only. Replace the tournament roster of the listed participants (teamId of an existing participant, playerIds who played this tournament for the team, and optionally sourceUrl: the public page the roster comes from, null to clear it, never Liquipedia or BLAST.tv; omitted keeps the current source); other participants keep theirs. Applied after teamIds.",
          hasBracket:
            "Manual tournaments only. true shows the stage as a bracket tree once its matches are linked; false is refused while any of its matches still has bracket links.",
        }),
      },
      handler: async ({ tournamentId, ...input }) => {
        const tournament = await manualTournamentService.update(tournamentId, input);

        return {
          entityId: tournament.id,
          result: {
            id: tournament.id,
            name: tournament.name,
            slug: tournament.slug,
            source: tournament.source,
            imageUrl: tournament.imageUrl,
            endAt: tournament.endAt,
            event: tournament.event,
            ...mapListedParticipants(tournament.source, tournament.participants),
            url: tournamentUrl(tournament),
          },
        };
      },
    }),

    defineTool({
      name: "link_pandascore_tournament",
      description:
        "Link a manual tournament to its PandaScore tournament when the sync did not match it automatically. The manual tournament becomes the synced stage (keeping its id, URLs and image) and PandaScore fills its details and matches, so no duplicate is created. Fails if that PandaScore tournament is already imported as another tournament.",
      write: true,
      permission: "tournaments.manage",
      input: {
        tournamentId: z.string().uuid().describe("Manual tournament UUID to link."),
        pandascoreId: z
          .number()
          .int()
          .positive()
          .describe("PandaScore tournament id (from api.pandascore.co /tournaments/:id)."),
      },
      handler: async ({ tournamentId, pandascoreId }) => {
        const tournament = await pandascoreTournamentSync.executeByPandascoreId(
          pandascoreId,
          tournamentId,
        );

        return {
          entityId: tournament.id,
          result: {
            id: tournament.id,
            name: tournament.name,
            source: tournament.source,
            pandascoreId: tournament.pandascoreId,
            url: tournamentUrl(tournament),
          },
        };
      },
    }),

    defineTool({
      name: "trigger_tournament_sync",
      description:
        "Trigger a PandaScore sync. Pass tournamentId to sync one local event, or omit to discover missing tournaments (reconcile past/upcoming/running) then apply PandaScore incidents (creations and updates).",
      write: true,
      permission: "tournaments.manage",
      input: {
        tournamentId: z
          .string()
          .min(1)
          .optional()
          .describe("Local tournament UUID to sync. Omit to run the global new-tournament sync."),
      },
      handler: async ({ tournamentId }): Promise<ToolWrite<TriggeredSync>> => {
        if (tournamentId) {
          await pandascoreTournamentSync.execute(tournamentId);

          return {
            entityId: tournamentId,
            result: { success: true, tournamentId, scope: "single" },
          };
        }

        const sync = await pandascoreNewTournamentsSync.execute();

        return { result: { success: true, scope: "new_tournaments", sync } };
      },
    }),

    defineTool({
      name: "sync_pandascore_tournament",
      description:
        "Import or refresh a tournament by its PandaScore numeric ID (e.g. 21623 for EWC 2026 Group A). Use when a tournament exists on PandaScore but is missing from sarpbc.",
      write: true,
      permission: "tournaments.manage",
      input: {
        pandascoreId: z
          .number()
          .int()
          .positive()
          .describe("PandaScore tournament id (from api.pandascore.co /tournaments/:id)."),
      },
      handler: async ({ pandascoreId }) => {
        const tournament = await pandascoreTournamentSync.executeByPandascoreId(pandascoreId);

        return {
          entityId: tournament.id,
          result: {
            success: true,
            tournamentId: tournament.id,
            pandascoreId,
            url: tournamentUrl(tournament),
          },
        };
      },
    }),
  ];
}
