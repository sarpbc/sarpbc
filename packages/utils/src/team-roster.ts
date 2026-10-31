import { STAFF_CONTRACT_ROLES, type ContractRole, type StaffContractRole } from "@sarpbc/types";

export const ACTIVE_ROSTER_LIMIT = 3;

export function isStaffContractRole(
  role: ContractRole | null | undefined,
): role is StaffContractRole {
  return STAFF_CONTRACT_ROLES.some((staffRole) => staffRole === role);
}

export function isActiveRosterPlayer(player: { role?: ContractRole | null }): boolean {
  return !isStaffContractRole(player.role);
}

export function selectActiveRosterPlayers<T extends { role?: ContractRole | null }>(
  players: T[],
  limit: number = ACTIVE_ROSTER_LIMIT,
): T[] {
  return players.filter(isActiveRosterPlayer).slice(0, limit);
}

export function selectTeamStaff<T extends { role?: ContractRole | null }>(players: T[]): T[] {
  return players.filter((player) => isStaffContractRole(player.role));
}
