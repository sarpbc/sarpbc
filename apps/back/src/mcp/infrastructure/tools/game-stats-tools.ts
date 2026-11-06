import { z } from "zod";
import type {
  StatsImportItem,
  StatsImportUnmatchedReason,
  StatsPlayerAccounts,
} from "@sarpbc/types";
import type { ManualGameService } from "../../../match-stats/application/manual-game.service";
import type { StatsImportService } from "../../../match-stats/application/stats-import.service";
import type { StatsPlayerLinkService } from "../../../match-stats/application/stats-player-link.service";
import type { StatsImport } from "../../../match-stats/domain/stats-import";
import { attachReplayFields } from "../../../match-stats/infrastructure/http/dto/attach-replay.dto";
import { linkStatsPlayerFields } from "../../../match-stats/infrastructure/http/dto/link-stats-player.dto";
import { requestStatsImportFields } from "../../../match-stats/infrastructure/http/dto/request-stats-import.dto";
import { defineTool, type McpTool } from "../define-tool";
import { describeFields } from "./tool-input";

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

export interface GameStatsToolServices {
  statsImportService: Pick<StatsImportService, "request" | "recent">;
  statsPlayerLinkService: Pick<StatsPlayerLinkService, "accounts" | "link">;
  manualGameService: Pick<ManualGameService, "attach" | "remove">;
}

export function gameStatsTools({
  statsImportService,
  statsPlayerLinkService,
  manualGameService,
}: GameStatsToolServices): McpTool[] {
  const tournamentId = z.string().min(1).describe("Tournament UUID from get_tournaments.");

  return [
    defineTool({
      name: "import_game_stats",
      description:
        "Start importing per-game player stats from a Ballchasing group into a tournament. The import runs in the background: poll get_game_stats_import until its status is completed or failed. Already stored games are skipped, and replays staff removed stay out. Fails when an import is already running for the tournament.",
      write: true,
      permission: "tournaments.manage",
      input: {
        tournamentId,
        ...describeFields(requestStatsImportFields, {
          group: "Ballchasing group link (https://ballchasing.com/group/…) or group id.",
        }),
      },
      handler: async ({ tournamentId: id, group }) => {
        const statsImport = await statsImportService.request(id, group);
        return {
          entityId: statsImport.id,
          result: { id: statsImport.id, groupId: statsImport.groupId, status: statsImport.status },
        };
      },
    }),

    defineTool({
      name: "get_game_stats_import",
      description:
        "Latest Ballchasing stats import of a tournament: status, progress, counts per outcome and the replays staff should review (unmatched or failed, with matchId when known and the reason). Replays that belong to other stages (unknown_teams, outside_match_window) are only counted in otherStages unless includeOtherStages is true. Fix a reviewable replay with attach_replay_to_game, or leave it when the reason is expected (match_not_finished waits for the result; excluded_by_staff was removed on purpose). Returns import null when the tournament has none.",
      permission: "tournaments.manage",
      input: {
        tournamentId,
        includeOtherStages: z
          .boolean()
          .optional()
          .describe("Also list the replays counted in otherStages. Defaults to false."),
      },
      handler: async ({ tournamentId: id, includeOtherStages }) => {
        const [latest] = await statsImportService.recent(id);
        return {
          import: latest ? summarizeStatsImport(latest, includeOtherStages ?? false) : null,
        };
      },
    }),

    defineTool({
      name: "list_unlinked_game_players",
      description:
        "Game accounts (platform and platform id from Ballchasing) in a tournament's stats that are not linked to a sarpbc.org player, with their latest in-game name, team and game count, plus every roster of the tournament. Pass includeLinked to also list linked accounts with their player, to correct a wrong link. Link one with link_game_player.",
      permission: "tournaments.manage",
      input: {
        tournamentId,
        includeLinked: z
          .boolean()
          .optional()
          .describe("Also list accounts already linked, with their player. Defaults to false."),
      },
      handler: async ({ tournamentId: id, includeLinked }) =>
        filterAccounts(await statsPlayerLinkService.accounts(id), includeLinked ?? false),
    }),

    defineTool({
      name: "link_game_player",
      description:
        "Link a game account to a sarpbc.org player from any roster of the tournament, stand-ins from another team included. Replaces the account's previous link and repoints every stat row of that account, in all tournaments; later imports use the link. Returns the number of rows repointed.",
      write: true,
      permission: "tournaments.manage",
      input: {
        tournamentId,
        ...describeFields(linkStatsPlayerFields, {
          platform: "Platform from list_unlinked_game_players (e.g. steam, epic).",
          platformId: "Platform id from list_unlinked_game_players.",
          playerId: "Player UUID from one of the tournament's rosters.",
        }),
      },
      handler: async ({ tournamentId: id, platform, platformId, playerId }) => {
        const link = { platform, platformId, playerId };
        const linkedRows = await statsPlayerLinkService.link(id, link);
        return { entityId: playerId, result: { link, linkedRows } };
      },
    }),

    defineTool({
      name: "attach_replay_to_game",
      description:
        "Attach a Ballchasing replay to one game of a match as a staff override, when the import refused or misplaced it. Skips the import's team, date and series rules, but refuses a match outside the tournament, a blue team that is not one of the match's two participants, a game number below 1 or above the format, a number that already has stats, a replay already attached anywhere (the error says where) and a replay Ballchasing has not processed. Players are linked like in the import. Attaching a replay staff removed clears its removal.",
      write: true,
      permission: "tournaments.manage",
      input: {
        tournamentId,
        ...describeFields(attachReplayFields, {
          matchId: "Match UUID from get_tournament or get_game_stats_import.",
          replay: "Ballchasing replay link (https://ballchasing.com/replay/…) or replay id.",
          gameNumber: "Game number in the series, starting at 1.",
          blueParticipantId:
            "Tournament participant UUID of the team that played blue in this replay.",
        }),
      },
      handler: async ({ tournamentId: id, ...input }) => {
        const game = await manualGameService.attach(id, input);
        return { entityId: game.matchId, result: game };
      },
    }),

    defineTool({
      name: "remove_match_game",
      description:
        "Remove one game's stats from a match, with its player rows. Its replay is excluded, so later imports report it as excluded_by_staff instead of attaching it again; attach_replay_to_game clears the exclusion. Returns the removed game.",
      write: true,
      permission: "tournaments.manage",
      input: {
        tournamentId,
        matchId: z.string().min(1).describe("Match UUID."),
        gameNumber: z.number().int().min(1).describe("Game number to remove."),
      },
      handler: async ({ tournamentId: id, matchId, gameNumber }) => {
        const game = await manualGameService.remove(id, matchId, gameNumber);
        return { entityId: game.matchId, result: game };
      },
    }),
  ];
}
