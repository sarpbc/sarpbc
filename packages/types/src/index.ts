import type { PlayerAwardType } from "./player-award";
import type { NewsType } from "./news";
import type { TransferType } from "./transfer";

export type { StaffRole, StaffPermission, User } from "./user";
export type { Player } from "./player";
export type { PlayerAwardType, PlayerProfileAward, TournamentAwardListItem } from "./player-award";
export type { Team } from "./team";
export type { ContractRole, PlayerContract, TeamContract } from "./contract";
export type { Transfer, TransferType } from "./transfer";
export type { League } from "./league";
export type { TournamentEventRef } from "./tournament-event";
export type { NewsType } from "./news";
export type {
  ProfileMatchListItem,
  TeamSummary,
  TournamentDetail,
  TournamentDetailMatch,
  TournamentDetailParticipant,
  TournamentListItem,
  TournamentMatchListItem,
  DataSource,
} from "./competition";
export type { ForumPost } from "./forum";

export const PLAYER_AWARD_TYPES = [
  "mvp",
  "defensive_mvp",
] as const satisfies readonly PlayerAwardType[];

export const NEWS_TYPES = ["short", "article"] as const satisfies readonly NewsType[];

export const TRANSFER_TYPES = [
  "arrival",
  "departure",
  "benched",
  "loan",
] as const satisfies readonly TransferType[];

export const PlayerAwardTypes = {
  MVP: "mvp",
  DEFENSIVE_MVP: "defensive_mvp",
} as const satisfies Record<string, PlayerAwardType>;
