import type { PlayerAwardType } from "./player-award.ts";
import type { NewsType } from "./news.ts";
import type { TransferType } from "./transfer.ts";

export { STAFF_PERMISSIONS, STAFF_ROLES } from "./user.ts";
export type { StaffRole, StaffPermission, User, UserList, UserListItem } from "./user.ts";
export { PLAYER_STATUSES } from "./player.ts";
export type { Player, PlayerStatus } from "./player.ts";
export type {
  PlayerAwardType,
  PlayerProfileAward,
  TournamentAwardListItem,
} from "./player-award.ts";
export { TEAM_LOGO_VARIANTS } from "./team.ts";
export type { Team, TeamLogos, TeamLogoVariant, TeamSummary } from "./team.ts";
export { CONTRACT_ROLES, STAFF_CONTRACT_ROLES } from "./contract.ts";
export type { ContractRole, PlayerContract, StaffContractRole, TeamContract } from "./contract.ts";
export type { Transfer, TransferType } from "./transfer.ts";
export type { League, LeagueInput } from "./league.ts";
export type {
  EventInput,
  ManualEvent,
  TournamentEvent,
  TournamentEventRef,
  TournamentPathResponse,
  TournamentTab,
} from "./tournament-event.ts";
export type {
  NewsArticleAdmin,
  NewsSitemapChunkResponse,
  NewsSitemapEntry,
  NewsSitemapMetaResponse,
  NewsType,
  PaginatedNewsArticles,
} from "./news.ts";
export { DATA_SOURCES } from "./competition.ts";
export type {
  CountedMatchListItem,
  MatchListItem,
  MatchResultsResponse,
  UpcomingMatchesResponse,
  ProfileMatchListItem,
  TournamentDetail,
  TournamentDetailMatch,
  TournamentDetailParticipant,
  TournamentListItem,
  TournamentMatchListItem,
  DataSource,
  MatchBlockItem,
  MatchBlockSelector,
  MatchBlockState,
  MatchBlocksResponse,
  MatchVod,
  MatchVodSource,
} from "./competition.ts";
export type {
  MatchGamePlayerStats,
  MatchGameStats,
  MatchGameTeamStats,
  StatsImport,
  StatsImportFailedReason,
  StatsImportItem,
  StatsImportStatus,
  StatsImportUnmatchedReason,
  AttachReplayInput,
  StatsPlayerAccount,
  StatsPlayerAccounts,
  StatsPlayerLinkInput,
  StatsPlayerLinkResult,
  StatsRoster,
  TournamentStatsGame,
} from "./match-stats.ts";
export type {
  CreatedPatToken,
  ModerationReply,
  PatToken,
  TrackedStreamer,
} from "./staff-console.ts";
export { FORUM_ERROR_CODES } from "./forum.ts";
export type {
  ForumPost,
  ForumPostCreationStatus,
  ForumPostListItem,
  ForumTopic,
  PostPreview,
} from "./forum.ts";
export { REPLY_REPORT_REASONS, REPLY_TARGET_TYPES } from "./reply.ts";
export type {
  AppNotification,
  PaginatedReplies,
  Reply,
  ReplyReportReason,
  ReplyTargetType,
} from "./reply.ts";
export type { LiveStreamer } from "./streamer.ts";
export type { R2UploadResponse } from "./storage.ts";
export { SEARCH_TYPES } from "./search.ts";
export type { SearchType } from "./search.ts";
export type {
  EarningsEntry,
  EarningsYear,
  PrizeAmount,
  PrizeEntry,
  ProfileEarnings,
  TournamentPrize,
  TournamentPrizes,
} from "./prize.ts";
export { ROSTER_PROPOSAL_STATUSES } from "./roster-change.ts";
export type {
  RosterChange,
  RosterProposal,
  RosterProposalList,
  RosterProposalStatus,
} from "./roster-change.ts";

export const PLAYER_AWARD_TYPES = [
  "mvp",
  "defensive_mvp",
] as const satisfies readonly PlayerAwardType[];

export const SUPPORTED_LOCALES = ["en-US", "fr-FR"] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const NEWS_TYPES = ["short", "article"] as const satisfies readonly NewsType[];

export const TRANSFER_TYPES = [
  "arrival",
  "departure",
  "benched",
  "loan",
  "staff",
] as const satisfies readonly TransferType[];
