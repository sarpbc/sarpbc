import { STAFF_CONTRACT_ROLES } from "@sarpbc/types";
import type { ContractRole, StaffContractRole } from "@sarpbc/types";

export const ACTIVE_ROSTER_LIMIT = 3;

export const isStaffContractRole = (
  role: ContractRole | null | undefined,
): role is StaffContractRole => STAFF_CONTRACT_ROLES.some((staffRole) => staffRole === role);

export const isActiveRosterPlayer = (player: { role?: ContractRole | null }): boolean =>
  player.role === "active" || player.role === null || player.role === undefined;

export const selectActiveRosterPlayers = <T extends { role?: ContractRole | null }>(
  players: T[],
  limit: number = ACTIVE_ROSTER_LIMIT,
): T[] => players.filter(isActiveRosterPlayer).slice(0, limit);

export const selectTeamStaff = <T extends { role?: ContractRole | null }>(players: T[]): T[] =>
  players.filter((player) => isStaffContractRole(player.role));
