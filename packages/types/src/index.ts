import type { PlayerAwardType } from "./player-award";

export type { StaffRole, StaffPermission, User } from "./user";
export type { Player } from "./player";
export type { PlayerAwardType, PlayerProfileAward, TournamentAwardListItem } from "./player-award";
export type { Team } from "./team";
export type { ContractRole, PlayerContract, TeamContract } from "./contract";
export type { League } from "./league";

export const PLAYER_AWARD_TYPES = [
  "mvp",
  "defensive_mvp",
] as const satisfies readonly PlayerAwardType[];

export const PlayerAwardTypes = {
  MVP: "mvp",
  DEFENSIVE_MVP: "defensive_mvp",
} as const satisfies Record<string, PlayerAwardType>;
