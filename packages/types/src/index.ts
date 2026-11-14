import type { PlayerAwardType } from "./player-award";
import type { NewsType } from "./news";
import type { TransferType } from "./transfer";

export { STAFF_PERMISSIONS, STAFF_ROLES } from "./user";

export type { StaffRole, StaffPermission, User, UserList, UserListItem } from "./user";

export { PLAYER_STATUSES } from "./player";

export type { Player, PlayerStatus } from "./player";

export type { PlayerAwardType, PlayerProfileAward, TournamentAwardListItem } from "./player-award";

export type {
  CareerStint,
  CareerTitle,
  HeadToHead,
  PlayerCareer,
  PlayerComparison,
  SeriesRecord,
} from "./player-comparison";

export { TEAM_LOGO_VARIANTS } from "./team";

export type {
  Team,
  TeamAlias,
  TeamAliasInput,
  TeamLogos,
  TeamLogoVariant,
  TeamSummary,
} from "./team";

export { CONTRACT_ROLES, STAFF_CONTRACT_ROLES } from "./contract";

export type { ContractRole, PlayerContract, StaffContractRole, TeamContract } from "./contract";

export type { Transfer, TransferType } from "./transfer";

export type { CountryDetail, CountrySummary } from "./country";

export type { League, LeagueInput } from "./league";

export type {
  EventInput,
  ManualEvent,
  TournamentEvent,
  TournamentEventDetail,
  TournamentEventRef,
  TournamentPathResponse,
  TournamentTab,
} from "./tournament-event";

export type { NewsArticleAdmin, NewsType, PaginatedNewsArticles } from "./news";

export { SITEMAP_KINDS } from "./sitemap";

export type { SitemapEntry, SitemapKind } from "./sitemap";

export { DATA_SOURCES, EMPTY_BRACKET_SIZES, TOURNAMENT_FORMATS } from "./competition";

export type {
  BracketLinkInput,
  BracketLinkType,
  EmptyBracketSize,
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
  PlayerStatCounts,
  TournamentPlayerStats,
  TournamentPlayerStatsResponse,
  TournamentPlayerStatsTeam,
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
  PrizeEntryPatch,
  ProposedPrizeEntry,
  ProfileEarnings,
  TournamentPrize,
  TournamentPrizes,
} from "./prize";

export type {
  MatchLineup,
  MatchLineupInput,
  MatchLineupPlayer,
  MatchLineupsResponse,
  PlayerStandIn,
} from "./lineup";

export { STREAM_KINDS, STREAM_PLATFORMS } from "./stream";

export type { Stream, StreamInput, StreamKind, StreamPlatform, StreamsResponse } from "./stream";

export { VIEWERSHIP_SCOPES } from "./viewership";

export type { Viewership, ViewershipResponse, ViewershipScope } from "./viewership";

export type {
  CircuitDetail,
  CircuitEventStatus,
  CircuitInput,
  CircuitScaleTier,
  CircuitStage,
  CircuitStageFinish,
  CircuitStageFinishInput,
  CircuitStageScaleInput,
  CircuitEventTeam,
  CircuitStageTournament,
  CircuitStandingCell,
  CircuitStandingRow,
  CircuitStandings,
  CircuitStandingsEvent,
  CircuitStandingTeam,
  CircuitSummary,
} from "./circuit";

export { SEASON_AWARD_TYPES } from "./season";

export type {
  PlayerSeasonAward,
  SeasonArchive,
  SeasonArchiveAward,
  SeasonArchiveParticipant,
  SeasonArchivePathEntry,
  SeasonArchiveSummary,
  SeasonAward,
  SeasonAwardInput,
  SeasonAwardType,
  SeasonDetail,
  SeasonFormat,
  SeasonFormatPhase,
  SeasonInput,
  SeasonParticipant,
  SeasonParticipantInput,
  SeasonPathEntry,
  SeasonPathEntryInput,
  SeasonPathTournament,
  SeasonSummary,
  SeasonTeam,
} from "./season";

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

export type {
  StreamScoreFrameCounts,
  StreamScoreGame,
  StreamScoreGameEnding,
  StreamScoreProposal,
  StreamScoreSeries,
  StreamScoreSide,
} from "./stream-score";

export { ON_THIS_DAY_LINK_KINDS } from "./on-this-day";

export type {
  OnThisDay,
  OnThisDayEvent,
  OnThisDayFact,
  OnThisDayFactInput,
  OnThisDayFactLinkInput,
  OnThisDayLink,
  OnThisDayLinkKind,
  OnThisDayMatch,
  OnThisDayPlayer,
  OnThisDaySide,
  OnThisDayTeam,
  OnThisDayText,
  OnThisDayTournament,
} from "./on-this-day";
