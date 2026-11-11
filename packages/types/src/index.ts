import type { PlayerAwardType } from "./player-award";
import type { NewsType } from "./news";
import type { TransferType } from "./transfer";

export { STAFF_PERMISSIONS, STAFF_ROLES } from "./user";
export type { StaffRole, StaffPermission, User, UserList, UserListItem } from "./user";
export { PLAYER_STATUSES } from "./player";
export type { Player, PlayerStatus } from "./player";
export type { PlayerAwardType, PlayerProfileAward, TournamentAwardListItem } from "./player-award";
export { TEAM_LOGO_VARIANTS } from "./team";
export type { Team, TeamLogos, TeamLogoVariant, TeamSummary } from "./team";
export { CONTRACT_ROLES, STAFF_CONTRACT_ROLES } from "./contract";
export type { ContractRole, PlayerContract, StaffContractRole, TeamContract } from "./contract";
export type { Transfer, TransferType } from "./transfer";
export type { League, LeagueInput } from "./league";
export type {
  EventInput,
  ManualEvent,
  TournamentEvent,
  TournamentEventRef,
  TournamentPathResponse,
  TournamentTab,
} from "./tournament-event";
export type { NewsArticleAdmin, NewsType, PaginatedNewsArticles } from "./news";
export { SITEMAP_KINDS } from "./sitemap";
export type { SitemapEntry, SitemapKind } from "./sitemap";
export { DATA_SOURCES, TOURNAMENT_FORMATS } from "./competition";
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
  ParticipantPlayer,
  ParticipantRef,
  TournamentFormat,
  MatchBlockItem,
  MatchBlockSelector,
  MatchBlockState,
  MatchBlocksResponse,
  MatchVod,
  MatchVodSource,
} from "./competition";
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
} from "./match-stats";
export type { CreatedPatToken, ModerationReply, PatToken, TrackedStreamer } from "./staff-console";
export { FORUM_ERROR_CODES } from "./forum";
export type {
  ForumPost,
  ForumPostCreationStatus,
  ForumPostListItem,
  ForumTopic,
  PostPreview,
} from "./forum";
export { REPLY_REPORT_REASONS, REPLY_TARGET_TYPES } from "./reply";
export type {
  AppNotification,
  PaginatedReplies,
  Reply,
  ReplyReportReason,
  ReplyTargetType,
} from "./reply";
export type { LiveStreamer } from "./streamer";
export type { R2UploadResponse } from "./storage";
export { SEARCH_TYPES } from "./search";
export type { SearchType } from "./search";
export type {
  EarningsEntry,
  EarningsYear,
  PrizeAmount,
  PrizeEntry,
  ProfileEarnings,
  TournamentPrize,
  TournamentPrizes,
} from "./prize";
export { STREAM_KINDS, STREAM_PLATFORMS } from "./stream";
export type { Stream, StreamInput, StreamKind, StreamPlatform, StreamsResponse } from "./stream";
export { ROSTER_PROPOSAL_STATUSES } from "./roster-change";
export type {
  RosterChange,
  RosterProposal,
  RosterProposalList,
  RosterProposalStatus,
} from "./roster-change";

export const PLAYER_AWARD_TYPES = [
  "mvp",
  "grand_finals_mvp",
  "offensive_mvp",
  "defensive_mvp",
  "breakthrough_player",
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
