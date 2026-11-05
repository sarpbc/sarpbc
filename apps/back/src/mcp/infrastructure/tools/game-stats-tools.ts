import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type {
  StatsImportItem,
  StatsImportUnmatchedReason,
  StatsPlayerAccounts,
} from "@sarpbc/types";
import type { StatsImport } from "../../../match-stats/domain/stats-import";
import type { McpToolContext } from "../mcp-tool-context";
import { runStaffReadTool, runWriteTool } from "../permission-gate";

const OTHER_STAGE_REASONS: readonly StatsImportUnmatchedReason[] = [
  "unknown_teams",
  "outside_match_window",
];

function isOtherStage(item: StatsImportItem): boolean {
  return item.status === "unmatched" && OTHER_STAGE_REASONS.includes(item.reason);
}

export function summarizeStatsImport(statsImport: StatsImport, includeOtherStages: boolean) {
  const counts = { imported: 0, already_imported: 0, unmatched: 0, failed: 0 };
  const otherStages = Object.fromEntries(OTHER_STAGE_REASONS.map((reason) => [reason, 0]));
  for (const item of statsImport.items) {
    counts[item.status] += 1;
    if (item.status === "unmatched" && isOtherStage(item)) otherStages[item.reason] += 1;
  }
  return {
    id: statsImport.id,
    groupId: statsImport.groupId,
    status: statsImport.status,
    progress: { processed: statsImport.processed, total: statsImport.total },
    error: statsImport.error,
    createdAt: statsImport.createdAt.toISOString(),
    finishedAt: statsImport.finishedAt?.toISOString() ?? null,
    counts,
    otherStages,
    toReview: statsImport.items.filter(
      (item) => (item.status === "unmatched" || item.status === "failed") && !isOtherStage(item),
    ),
    otherStageReplays: includeOtherStages ? statsImport.items.filter(isOtherStage) : null,
  };
}

function filterAccounts(accounts: StatsPlayerAccounts, includeLinked: boolean) {
  return includeLinked
    ? accounts
    : { ...accounts, players: accounts.players.filter((account) => account.player === null) };
}

export function registerGameStatsTools(server: McpServer, ctx: McpToolContext): void {
  const { user } = ctx;
  const tournamentId = z.string().min(1).describe("Tournament UUID from get_tournaments.");

  server.registerTool(
    "import_game_stats",
    {
      description:
        "Start importing per-game player stats from a Ballchasing group into a tournament. Requires tournaments.manage. The import runs in the background: poll get_game_stats_import until its status is completed or failed. Already stored games are skipped, and replays staff removed stay out. Fails when an import is already running for the tournament.",
      inputSchema: {
        tournamentId,
        group: z
          .string()
          .min(1)
          .max(500)
          .describe("Ballchasing group link (https://ballchasing.com/group/…) or group id."),
      },
    },
    async ({ tournamentId: id, group }) =>
      runWriteTool(user, "import_game_stats", "tournaments.manage", async () => {
        const statsImport = await ctx.statsImportService.request(id, group);
        return {
          entityId: statsImport.id,
          result: { id: statsImport.id, groupId: statsImport.groupId, status: statsImport.status },
        };
      }),
  );

  server.registerTool(
    "get_game_stats_import",
    {
      description:
        "Latest Ballchasing stats import of a tournament: status, progress, counts per outcome and the replays staff should review (unmatched or failed, with matchId when known and the reason). Requires tournaments.manage. Replays that belong to other stages (unknown_teams, outside_match_window) are only counted in otherStages unless includeOtherStages is true. Fix a reviewable replay with attach_replay_to_game, or leave it when the reason is expected (match_not_finished waits for the result; excluded_by_staff was removed on purpose). Returns import null when the tournament has none.",
      inputSchema: {
        tournamentId,
        includeOtherStages: z
          .boolean()
          .optional()
          .describe("Also list the replays counted in otherStages. Defaults to false."),
      },
    },
    async ({ tournamentId: id, includeOtherStages }) =>
      runStaffReadTool(user, ["tournaments.manage"], async () => {
        const [latest] = await ctx.statsImportService.recent(id);
        return {
          import: latest ? summarizeStatsImport(latest, includeOtherStages ?? false) : null,
        };
      }),
  );

  server.registerTool(
    "list_unlinked_game_players",
    {
      description:
        "Game accounts (platform and platform id from Ballchasing) in a tournament's stats that are not linked to a sarpbc.org player, with their latest in-game name, team and game count, plus every roster of the tournament. Requires tournaments.manage. Pass includeLinked to also list linked accounts with their player, to correct a wrong link. Link one with link_game_player.",
      inputSchema: {
        tournamentId,
        includeLinked: z
          .boolean()
          .optional()
          .describe("Also list accounts already linked, with their player. Defaults to false."),
      },
    },
    async ({ tournamentId: id, includeLinked }) =>
      runStaffReadTool(user, ["tournaments.manage"], async () =>
        filterAccounts(await ctx.statsPlayerLinkService.accounts(id), includeLinked ?? false),
      ),
  );

  server.registerTool(
    "link_game_player",
    {
      description:
        "Link a game account to a sarpbc.org player from any roster of the tournament, stand-ins from another team included. Requires tournaments.manage. Replaces the account's previous link and repoints every stat row of that account, in all tournaments; later imports use the link. Returns the number of rows repointed.",
      inputSchema: {
        tournamentId,
        platform: z
          .string()
          .trim()
          .min(1)
          .max(50)
          .describe("Platform from list_unlinked_game_players (e.g. steam, epic)."),
        platformId: z
          .string()
          .trim()
          .min(1)
          .max(200)
          .describe("Platform id from list_unlinked_game_players."),
        playerId: z.string().uuid().describe("Player UUID from one of the tournament's rosters."),
      },
    },
    async ({ tournamentId: id, platform, platformId, playerId }) =>
      runWriteTool(user, "link_game_player", "tournaments.manage", async () => {
        const link = { platform, platformId, playerId };
        const linkedRows = await ctx.statsPlayerLinkService.link(id, link);
        return { entityId: playerId, result: { link, linkedRows } };
      }),
  );

  server.registerTool(
    "attach_replay_to_game",
    {
      description:
        "Attach a Ballchasing replay to one game of a match as a staff override, when the import refused or misplaced it. Requires tournaments.manage. Skips the import's team, date and series rules, but refuses a match outside the tournament, a blue team that is not one of the match's two participants, a game number below 1 or above the format, a number that already has stats, a replay already attached anywhere (the error says where) and a replay Ballchasing has not processed. Players are linked like in the import. Attaching a replay staff removed clears its removal.",
      inputSchema: {
        tournamentId,
        matchId: z
          .string()
          .min(1)
          .describe("Match UUID from get_tournament or get_game_stats_import."),
        replay: z
          .string()
          .min(1)
          .max(500)
          .describe("Ballchasing replay link (https://ballchasing.com/replay/…) or replay id."),
        gameNumber: z.number().int().describe("Game number in the series, starting at 1."),
        blueParticipantId: z
          .string()
          .min(1)
          .describe("Tournament participant UUID of the team that played blue in this replay."),
      },
    },
    async ({ tournamentId: id, ...input }) =>
      runWriteTool(user, "attach_replay_to_game", "tournaments.manage", async () => {
        const game = await ctx.manualGameService.attach(id, input);
        return { entityId: game.matchId, result: game };
      }),
  );

  server.registerTool(
    "remove_match_game",
    {
      description:
        "Remove one game's stats from a match, with its player rows. Requires tournaments.manage. Its replay is excluded, so later imports report it as excluded_by_staff instead of attaching it again; attach_replay_to_game clears the exclusion. Returns the removed game.",
      inputSchema: {
        tournamentId,
        matchId: z.string().min(1).describe("Match UUID."),
        gameNumber: z.number().int().min(1).describe("Game number to remove."),
      },
    },
    async ({ tournamentId: id, matchId, gameNumber }) =>
      runWriteTool(user, "remove_match_game", "tournaments.manage", async () => {
        const game = await ctx.manualGameService.remove(id, matchId, gameNumber);
        return { entityId: game.matchId, result: game };
      }),
  );
}
