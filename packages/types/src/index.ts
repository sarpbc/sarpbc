import type { PlayerAwardType } from "./player-award";
import type { NewsType } from "./news";
import type { TransferType } from "./transfer";

export { STAFF_PERMISSIONS, STAFF_ROLES } from "./user";
export type { StaffRole, StaffPermission, User, UserListItem } from "./user";
export { PLAYER_STATUSES } from "./player";
export type { Player, PlayerStatus } from "./player";
export type { PlayerAwardType, PlayerProfileAward, TournamentAwardListItem } from "./player-award";
export { TEAM_LOGO_VARIANTS } from "./team";
export type { Team, TeamLogos, TeamLogoVariant, TeamSummary } from "./team";
export { CONTRACT_ROLES, STAFF_CONTRACT_ROLES } from "./contract";
export type { ContractRole, PlayerContract, StaffContractRole, TeamContract } from "./contract";
export type { Transfer, TransferType } from "./transfer";
export type { League } from "./league";
export type { TournamentEventRef } from "./tournament-event";
export type { NewsType } from "./news";
export { DATA_SOURCES } from "./competition";
export type {
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
export { FORUM_ERROR_CODES } from "./forum";
export type { ForumPost } from "./forum";
export { REPLY_TARGET_TYPES } from "./reply";
export type { ReplyTargetType } from "./reply";
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
export { ROSTER_PROPOSAL_STATUSES } from "./roster-change";
export type {
  RosterChange,
  RosterChangeKind,
  RosterProposal,
  RosterProposalList,
  RosterProposalStatus,
} from "./roster-change";

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
